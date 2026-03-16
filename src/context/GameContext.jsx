import { createContext, useContext, useReducer, useCallback } from 'react';
import { createSession as createNewSession } from '../services/storage';

const GameContext = createContext(null);

const initialState = {
  session: null,
  step: 'setup', // setup → players → summary → active → endgame → results
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'INIT_SESSION_SUCCESS': {
      return { ...state, session: action.payload, step: 'players' };
    }

    case 'SET_STEP': {
      // When going back to active game from results, revert session status
      if (action.payload === 'active' && state.session?.status === 'completed') {
        const players = state.session.players.map(p => ({
          ...p,
          remainingChips: null,
          netRS: null,
        }));
        return {
          ...state,
          step: action.payload,
          session: {
            ...state.session,
            status: 'active',
            endTime: null,
            durationMinutes: null,
            players,
          },
        };
      }
      return { ...state, step: action.payload };
    }

    case 'ADD_PLAYER': {
      const { name, buyIns } = action.payload;
      const s = state.session;
      const newPlayer = {
        name,
        buyIns: buyIns || 1,
        totalChips: (buyIns || 1) * s.chipsPerBuyIn,
        remainingChips: null,
        netRS: null,
      };
      const players = [...s.players, newPlayer];
      return {
        ...state,
        session: {
          ...s,
          players,
          ...recalcPot(players, s),
        },
      };
    }

    case 'REMOVE_PLAYER': {
      const players = state.session.players.filter(
        (_, i) => i !== action.payload
      );
      return {
        ...state,
        session: {
          ...state.session,
          players,
          ...recalcPot(players, state.session),
        },
      };
    }

    case 'UPDATE_PLAYER_BUYINS': {
      const { index, buyIns } = action.payload;
      const s = state.session;
      const players = s.players.map((p, i) =>
        i === index
          ? { ...p, buyIns, totalChips: buyIns * s.chipsPerBuyIn }
          : p
      );
      return {
        ...state,
        session: {
          ...s,
          players,
          ...recalcPot(players, s),
        },
      };
    }

    case 'ADD_BUYIN': {
      const { index, count } = action.payload;
      const s = state.session;
      const players = s.players.map((p, i) => {
        if (i !== index) return p;
        const newBuyIns = p.buyIns + (count || 1);
        return {
          ...p,
          buyIns: newBuyIns,
          totalChips: newBuyIns * s.chipsPerBuyIn,
        };
      });
      return {
        ...state,
        session: {
          ...s,
          players,
          ...recalcPot(players, s),
        },
      };
    }

    case 'SET_REMAINING_CHIPS': {
      const { index, chips } = action.payload;
      const s = state.session;
      const players = s.players.map((p, i) =>
        i === index ? { ...p, remainingChips: chips } : p
      );
      return {
        ...state,
        session: { ...s, players },
      };
    }

    case 'CALCULATE_RESULTS': {
      const s = state.session;
      const endTime = new Date().toISOString();
      const startMs = new Date(s.startTime).getTime();
      const endMs = new Date(endTime).getTime();
      const durationMinutes = Math.round((endMs - startMs) / 60000);

      const players = s.players.map(p => {
        const outRS = p.remainingChips / s.ratio;
        const buyInRS = p.buyIns * s.buyInAmount;
        return {
          ...p,
          netRS: Math.round((outRS - buyInRS) * 100) / 100,
        };
      });

      return {
        ...state,
        session: {
          ...s,
          players,
          endTime,
          durationMinutes,
          status: 'completed',
        },
        step: 'results',
      };
    }

    case 'UPDATE_DURATION': {
      return {
        ...state,
        session: {
          ...state.session,
          durationMinutes: action.payload,
        },
      };
    }

    case 'LOAD_SESSION': {
      return {
        ...state,
        session: action.payload.session,
        step: action.payload.step || 'active',
      };
    }

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

function recalcPot(players, session) {
  const totalPotChips = players.reduce((sum, p) => sum + p.totalChips, 0);
  const totalPotRS = totalPotChips / session.ratio;
  return { totalPotChips, totalPotRS };
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const initSession = useCallback(async (config) => {
    // 1. Await the DB creation
    const session = await createNewSession(config);
    // 2. Dispatch the created session to local state
    dispatch({ type: 'INIT_SESSION_SUCCESS', payload: session });
  }, []);

  const setStep = useCallback(
    (step) => dispatch({ type: 'SET_STEP', payload: step }),
    []
  );

  const addPlayer = useCallback(
    (name, buyIns) => dispatch({ type: 'ADD_PLAYER', payload: { name, buyIns } }),
    []
  );

  const removePlayer = useCallback(
    (index) => dispatch({ type: 'REMOVE_PLAYER', payload: index }),
    []
  );

  const updatePlayerBuyIns = useCallback(
    (index, buyIns) =>
      dispatch({ type: 'UPDATE_PLAYER_BUYINS', payload: { index, buyIns } }),
    []
  );

  const addBuyIn = useCallback(
    (index, count = 1) =>
      dispatch({ type: 'ADD_BUYIN', payload: { index, count } }),
    []
  );

  const setRemainingChips = useCallback(
    (index, chips) =>
      dispatch({ type: 'SET_REMAINING_CHIPS', payload: { index, chips } }),
    []
  );

  const calculateResults = useCallback(
    () => dispatch({ type: 'CALCULATE_RESULTS' }),
    []
  );

  const updateDuration = useCallback(
    (minutes) => dispatch({ type: 'UPDATE_DURATION', payload: minutes }),
    []
  );

  const loadSession = useCallback(
    (session, step) =>
      dispatch({ type: 'LOAD_SESSION', payload: { session, step } }),
    []
  );

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  const value = {
    ...state,
    initSession,
    setStep,
    addPlayer,
    removePlayer,
    updatePlayerBuyIns,
    addBuyIn,
    setRemainingChips,
    calculateResults,
    updateDuration,
    loadSession,
    reset,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>');
  return ctx;
}
