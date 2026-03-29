/* ==========================================
   Poker Ledger — localStorage Service
   ========================================== */

const STORAGE_KEY = 'poker_ledger_sessions';

/**
 * Get all sessions from localStorage
 * @returns {Array} Array of session objects
 */
export function getSessions() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    console.error('Failed to parse sessions from localStorage');
    return [];
  }
}

/**
 * Get a single session by ID
 * @param {string} id
 * @returns {object|null}
 */
export function getSession(id) {
  const sessions = getSessions();
  return sessions.find(s => s.id === id) || null;
}

/**
 * Save or update a session
 * @param {object} session
 */
export function saveSession(session) {
  const sessions = getSessions();
  const idx = sessions.findIndex(s => s.id === session.id);

  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.push(session);
  }

  // Sort by startTime descending (newest first)
  sessions.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

/**
 * Delete a session by ID
 * @param {string} id
 */
export function deleteSession(id) {
  const sessions = getSessions().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

/**
 * Get the next session number
 * @returns {number}
 */
export function getNextSessionNumber() {
  const sessions = getSessions();
  if (sessions.length === 0) return 1;
  const maxNum = Math.max(...sessions.map(s => s.sessionNumber || 0));
  return maxNum + 1;
}

/**
 * Get all-time leaderboard (P1)
 * Aggregates net P&L across all completed sessions.
 * @returns {Array} Sorted by totalNet descending — [ { name, sessionsPlayed, totalBuyInRS, totalOutRS, totalNet } ]
 */
export function getLeaderboard() {
  const sessions = getSessions().filter(s => s.status === 'completed');
  const playerMap = {};

  for (const session of sessions) {
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
 * Create a new empty session object
 * @param {object} config - { buyInAmount, chipsPerBuyIn }
 * @returns {object} session
 */
export function createSession(config) {
  return {
    id: `session_${Date.now()}`,
    sessionNumber: getNextSessionNumber(),
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
   ========================================== */

const EXIT_CHIPS_PREFIX = 'poker_ledger_exit_chips_';

/**
 * Save exit chips for a specific player in a session.
 * @param {string} sessionId
 * @param {number} playerIndex
 * @param {number|null} chips - null to clear
 */
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

/**
 * Get all saved exit chips for a session.
 * @param {string} sessionId
 * @returns {object} - { [playerIndex]: chips }
 */
export function getExitChips(sessionId) {
  const key = EXIT_CHIPS_PREFIX + sessionId;
  try {
    return JSON.parse(localStorage.getItem(key) || '{}');
  } catch {
    return {};
  }
}

/**
 * Clear all exit chips for a session (used on save/reset).
 * @param {string} sessionId
 */
export function clearExitChips(sessionId) {
  localStorage.removeItem(EXIT_CHIPS_PREFIX + sessionId);
}
