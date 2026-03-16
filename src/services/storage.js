/* ==========================================
   Poker Ledger — Supabase Storage Service
   ========================================== */
import { supabase } from './supabase';

/**
 * Get all sessions from Supabase
 * @returns {Promise<Array>} Array of session objects
 */
export async function getSessions() {
  const { data, error } = await supabase
    .from('sessions')
    .select('*, players(*), settlements(*)')
    .order('start_time', { ascending: false });

  if (error) {
    console.error('Failed to fetch sessions from Supabase:', error);
    return [];
  }

  // Transform Postgres snake_case back to frontend camelCase
  return data.map(mapSessionFromDB);
}

/**
 * Get a single session by ID
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getSession(id) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*, players(*), settlements(*)')
    .eq('id', id)
    .single();

  if (error) {
    console.warn(`Failed to fetch session ${id}:`, error);
    return null;
  }
  
  return mapSessionFromDB(data);
}

/**
 * Save or update a session
 * @param {object} session
 */
export async function saveSession(session) {
  const dbSession = {
    id: session.id, // we reuse the generated uuid or frontend id
    session_number: session.sessionNumber,
    start_time: session.startTime,
    end_time: session.endTime,
    duration_minutes: session.durationMinutes,
    buy_in_amount: session.buyInAmount,
    chips_per_buy_in: session.chipsPerBuyIn,
    status: session.status,
    total_pot_rs: session.totalPotRS
  };

  // Upsert session
  const { error: sessionError } = await supabase
    .from('sessions')
    .upsert(dbSession, { onConflict: 'id' });

  if (sessionError) {
    console.error('Failed to upsert session:', sessionError);
    return;
  }

  // If there are players, we map them to the DB format
  if (session.players && session.players.length > 0) {
    // Delete existing players for this session first to handle removals cleanly
    await supabase.from('players').delete().eq('session_id', session.id);

    const dbPlayers = session.players.map(p => ({
      session_id: session.id,
      name: p.name,
      buy_ins: p.buyIns,
      chips_out: p.remainingChips, // null early in game, float at end
      net_profit: p.netProfit || null
    }));

    const { error: playersError } = await supabase.from('players').insert(dbPlayers);
    if (playersError) console.error('Failed to insert players:', playersError);
  }

  // If there are settlements, we map them too
  if (session.settlements && session.settlements.length > 0) {
    await supabase.from('settlements').delete().eq('session_id', session.id);

    const dbSettlements = session.settlements.map(s => ({
      session_id: session.id,
      from_name: s.from,
      to_name: s.to,
      amount: s.amount
    }));

    const { error: settleError } = await supabase.from('settlements').insert(dbSettlements);
    if (settleError) console.error('Failed to insert settlements:', settleError);
  }
}

/**
 * Delete a session by ID
 * @param {string} id
 */
export async function deleteSession(id) {
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', id);
    
  if (error) {
    console.error('Failed to delete session:', error);
  }
}

/**
 * Get the next session number
 * @returns {Promise<number>}
 */
export async function getNextSessionNumber() {
  const { data, error } = await supabase
    .from('sessions')
    .select('session_number')
    .order('session_number', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return 1;
  return data.session_number + 1;
}

/**
 * Get all-time leaderboard (P1)
 * Aggregates net P&L across all completed sessions.
 * @returns {Promise<Array>} Sorted by totalNet descending — [ { name, sessionsPlayed, totalNet } ]
 */
export async function getLeaderboard() {
  // We can join players and filter by completed sessions
  const { data, error } = await supabase
    .from('sessions')
    .select('id, status, buy_in_amount, chips_per_buy_in, players(name, buy_ins, chips_out)')
    .eq('status', 'completed');

  if (error || !data) {
    console.error('Failed to fetch leaderboard data:', error);
    return [];
  }

  const playerMap = {};

  for (const session of data) {
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
      const ratio = session.chips_per_buy_in / session.buy_in_amount;
      const buyInRS = player.buy_ins * session.buy_in_amount;
      const outRS = (player.chips_out / ratio) || 0;
      p.totalBuyInRS += buyInRS;
      p.totalOutRS += outRS;
      p.totalNet += (outRS - buyInRS);
    }
  }

  return Object.values(playerMap).sort((a, b) => b.totalNet - a.totalNet);
}

/**
 * Create a new empty session object
 * @param {object} config - { buyInAmount, chipsPerBuyIn }
 * @returns {Promise<object>} session
 */
export async function createSession(config) {
  const nextNum = await getNextSessionNumber();
  
  return {
    id: crypto.randomUUID(), // natively supported in modern browsers
    sessionNumber: nextNum,
    startTime: new Date().toISOString(),
    endTime: null,
    durationMinutes: null,
    buyInAmount: config.buyInAmount,
    chipsPerBuyIn: config.chipsPerBuyIn,
    ratio: config.chipsPerBuyIn / config.buyInAmount,
    players: [],
    settlements: [],
    totalPotChips: 0,
    totalPotRS: 0,
    status: 'active',
  };
}


// --- Helpers ---

function mapSessionFromDB(dbSession) {
  if (!dbSession) return null;
  const ratio = dbSession.chips_per_buy_in / dbSession.buy_in_amount;
  
  return {
    id: dbSession.id,
    sessionNumber: dbSession.session_number,
    startTime: dbSession.start_time,
    endTime: dbSession.end_time,
    durationMinutes: dbSession.duration_minutes,
    buyInAmount: dbSession.buy_in_amount,
    chipsPerBuyIn: dbSession.chips_per_buy_in,
    ratio,
    status: dbSession.status,
    totalPotRS: dbSession.total_pot_rs,
    
    // Map joined players
    players: (dbSession.players || []).map(p => ({
      name: p.name,
      buyIns: p.buy_ins,
      remainingChips: p.chips_out,
      netProfit: p.net_profit
    })),
    
    // Map joined settlements
    settlements: (dbSession.settlements || []).map(s => ({
      from: s.from_name,
      to: s.to_name,
      amount: s.amount
    }))
  };
}
