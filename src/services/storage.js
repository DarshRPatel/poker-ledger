/* ==========================================
   Poker Ledger — Storage Service (Supabase + localStorage Fallback)
   ========================================== */

import { supabase } from './supabaseClient';

const LOCAL_STORAGE_KEY = 'poker_ledger_sessions';

// Check if Supabase credentials are configured and not placeholders
const isSupabaseConfigured = 
  typeof window !== 'undefined' && 
  !window.navigator?.webdriver &&
  import.meta.env.VITE_SUPABASE_URL && 
  import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder-project.supabase.co' &&
  import.meta.env.VITE_SUPABASE_ANON_KEY &&
  import.meta.env.VITE_SUPABASE_ANON_KEY !== 'placeholder-anon-key';

/* ==========================================
   Local Storage Helpers (Fallback / Offline Cache)
   ========================================== */

function getLocalSessions() {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    console.error('Failed to parse sessions from localStorage');
    return [];
  }
}

function saveLocalSession(session) {
  try {
    const sessions = getLocalSessions();
    const idx = sessions.findIndex(s => s.id === session.id);

    if (idx >= 0) {
      sessions[idx] = session;
    } else {
      sessions.push(session);
    }

    sessions.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessions));
  } catch (err) {
    console.error('Failed to save session to localStorage:', err);
  }
}

function deleteLocalSession(id) {
  try {
    const sessions = getLocalSessions().filter(s => s.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessions));
  } catch (err) {
    console.error('Failed to delete session from localStorage:', err);
  }
}

/* ==========================================
   Database Schema Mappings
   ========================================== */

function mapSessionFromDb(db) {
  const buyInAmount = Number(db.buy_in_amount);
  const ratio = Number(db.ratio);
  
  return {
    id: db.id,
    sessionNumber: db.session_number,
    startTime: db.start_time,
    endTime: db.end_time,
    durationMinutes: db.duration_minutes,
    buyInAmount,
    chipsPerBuyIn: Number(db.chips_per_buy_in),
    ratio,
    status: db.status,
    players: db.players || [],
    totalPotChips: (db.players || []).reduce((sum, p) => sum + (p.totalChips || 0), 0),
    totalPotRS: (db.players || []).reduce((sum, p) => sum + (p.buyIns || 0), 0) * buyInAmount,
    hostId: db.host_id,
  };
}

function mapSessionToDb(s) {
  return {
    id: s.id,
    session_number: s.sessionNumber,
    start_time: s.startTime,
    end_time: s.endTime,
    duration_minutes: s.durationMinutes,
    buy_in_amount: s.buyInAmount,
    chips_per_buy_in: s.chipsPerBuyIn,
    ratio: s.ratio,
    status: s.status,
    players: s.players,
    host_id: s.hostId,
  };
}

/* ==========================================
   Exported Storage API (Async)
   ========================================== */

/**
 * Get all sessions
 * @returns {Promise<Array>} Array of session objects
 */
export async function getSessions() {
  if (!isSupabaseConfigured) {
    return getLocalSessions();
  }
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('start_time', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapSessionFromDb);
  } catch (err) {
    console.error('Supabase query failed, falling back to localStorage:', err);
    return getLocalSessions();
  }
}

/**
 * Get a single session by ID
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getSession(id) {
  if (!isSupabaseConfigured) {
    const sessions = getLocalSessions();
    return sessions.find(s => s.id === id) || null;
  }
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? mapSessionFromDb(data) : null;
  } catch (err) {
    console.error(`Supabase query for session ${id} failed, falling back to localStorage:`, err);
    const sessions = getLocalSessions();
    return sessions.find(s => s.id === id) || null;
  }
}

/**
 * Save or update a session
 * @param {object} session
 * @returns {Promise<void>}
 */
export async function saveSession(session) {
  // Always save locally as a backup / offline cache
  saveLocalSession(session);

  if (isSupabaseConfigured) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const hostId = user?.id || null;

      const dbRow = {
        ...mapSessionToDb(session),
        host_id: session.hostId || hostId
      };

      const { error } = await supabase
        .from('sessions')
        .upsert(dbRow);

      if (error) throw error;
    } catch (err) {
      console.error('Failed to sync save with Supabase:', err);
      // We don't throw here so the user flow isn't blocked offline
    }
  }
}

/**
 * Delete a session by ID
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteSession(id) {
  deleteLocalSession(id);

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Failed to sync deletion with Supabase:', err);
    }
  }
}

/**
 * Get the next session number
 * @returns {Promise<number>}
 */
export async function getNextSessionNumber() {
  if (!isSupabaseConfigured) {
    const sessions = getLocalSessions();
    if (sessions.length === 0) return 1;
    const maxNum = Math.max(...sessions.map(s => s.sessionNumber || 0));
    return maxNum + 1;
  }
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('session_number')
      .order('session_number', { ascending: false })
      .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) return 1;
    return (data[0].session_number || 0) + 1;
  } catch (err) {
    console.error('Failed to get next session number from Supabase, calculating locally:', err);
    const sessions = getLocalSessions();
    if (sessions.length === 0) return 1;
    const maxNum = Math.max(...sessions.map(s => s.sessionNumber || 0));
    return maxNum + 1;
  }
}

export function calculateLeaderboard(sessions) {
  const completed = sessions.filter(s => s.status === 'completed');
  const playerMap = {};

  for (const session of completed) {
    for (const player of session.players) {
      if (!playerMap[player.name]) {
        playerMap[player.name] = {
          name: player.name,
          sessionsPlayed: 0,
          totalBuyInRS: 0,
          totalOutRS: 0,
          totalNet: 0,
        };
      }
      const p = playerMap[player.name];
      p.sessionsPlayed += 1;
      const buyInRS = player.buyIns * session.buyInAmount;
      const outRS = (player.remainingChips / session.ratio) || 0;
      p.totalBuyInRS += buyInRS;
      p.totalOutRS += outRS;
      p.totalNet += (outRS - buyInRS);
    }
  }

  return Object.values(playerMap).sort((a, b) => b.totalNet - a.totalNet);
}

/**
 * Get all-time leaderboard
 * @returns {Promise<Array>} Sorted by totalNet descending
 */
export async function getLeaderboard() {
  try {
    const sessions = await getSessions();
    return calculateLeaderboard(sessions);
  } catch (err) {
    console.error('Failed to calculate leaderboard:', err);
    return [];
  }
}

/**
 * Get all sessions scoped to a specific host
 * @param {string} hostId
 * @returns {Promise<Array>} Scoped session list
 */
export async function getSessionsByHost(hostId) {
  if (!isSupabaseConfigured) {
    return getLocalSessions();
  }
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('host_id', hostId)
      .order('start_time', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapSessionFromDb);
  } catch (err) {
    console.error(`Failed to get sessions for host ${hostId} from Supabase:`, err);
    return [];
  }
}

/**
 * Create a new empty session object (Synchronous in-memory creation)
 * @param {object} config - { buyInAmount, chipsPerBuyIn }
 * @param {number} sessionNumber
 * @returns {object} session
 */
export function createSession(config, sessionNumber = 1) {
  return {
    id: `session_${Date.now()}`,
    sessionNumber,
    startTime: new Date().toISOString(),
    endTime: null,
    durationMinutes: null,
    buyInAmount: config.buyInAmount,
    chipsPerBuyIn: config.chipsPerBuyIn,
    ratio: config.chipsPerBuyIn / config.buyInAmount,
    players: [],
    totalPotChips: 0,
    totalPotRS: 0,
    status: 'active',
  };
}

/* ==========================================
   Exit Chips Persistence (mid-game cash-outs)
   Keep in localStorage for temporary local drafting
   ========================================== */

const EXIT_CHIPS_PREFIX = 'poker_ledger_exit_chips_';

export function saveExitChips(sessionId, playerIndex, chips) {
  const key = EXIT_CHIPS_PREFIX + sessionId;
  try {
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    if (chips === null) {
      delete data[playerIndex];
    } else {
      data[playerIndex] = chips;
    }
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    console.error('Failed to save exit chips');
  }
}

export function getExitChips(sessionId) {
  const key = EXIT_CHIPS_PREFIX + sessionId;
  try {
    return JSON.parse(localStorage.getItem(key) || '{}');
  } catch {
    return {};
  }
}

export function clearExitChips(sessionId) {
  localStorage.removeItem(EXIT_CHIPS_PREFIX + sessionId);
}
