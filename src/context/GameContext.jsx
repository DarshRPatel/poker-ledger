import { createContext, useContext, useReducer, useCallback, useState, useEffect } from 'react';
import { createSession as createNewSession, saveSession } from '../services/storage';
import { supabase } from '../services/supabaseClient';

const GameContext = createContext(null);

const initialState = {
  session: null,
  step: 'setup', // setup → players → summary → active → endgame → results
  isEditing: false,
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'INIT_SESSION': {
      const buyInAmount = action.payload.buyInAmount ?? action.payload.amount;
      const chipsPerBuyIn = action.payload.chipsPerBuyIn ?? action.payload.chips;
      const sessionNumber = action.payload.sessionNumber;
      const session = createNewSession({ buyInAmount, chipsPerBuyIn }, sessionNumber);
      return { ...state, session, step: 'players' };
    }

    case 'SET_STEP': {
      // When going back to active game from results, revert session status
      if (action.payload === 'active' && state.session?.status === 'completed' && !state.isEditing) {
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
        const newBuyIns = Math.max(1, p.buyIns + (count || 1));
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

    case 'REMOVE_BUYIN': {
      const s = state.session;
      const players = s.players.map((p, i) => {
        if (i !== action.payload) return p;
        const newBuyIns = Math.max(1, p.buyIns - 1);
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

    case 'SET_PLAYER_EXIT_CHIPS': {
      const { index, chips } = action.payload;
      const s = state.session;
      const players = s.players.map((p, i) =>
        i === index ? { ...p, exitChips: chips } : p
      );
      return {
        ...state,
        session: { ...s, players },
      };
    }

    case 'CLEAR_PLAYER_EXIT_CHIPS': {
      const s = state.session;
      const players = s.players.map((p, i) =>
        i === action.payload ? { ...p, exitChips: null } : p
      );
      return {
        ...state,
        session: { ...s, players },
      };
    }

    case 'CALCULATE_RESULTS': {
      const s = state.session;
      const endTime = s.endTime || new Date().toISOString();
      const startMs = new Date(s.startTime).getTime();
      const endMs = new Date(endTime).getTime();
      const durationMinutes = s.durationMinutes || Math.round((endMs - startMs) / 60000);

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
      const isEditing = action.payload.session?.status === 'completed';
      return {
        ...state,
        session: action.payload.session,
        step: action.payload.step || 'active',
        isEditing,
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
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Auto-save active sessions to Supabase on state change (real-time sync provider)
  useEffect(() => {
    if (state.session && !state.isEditing && user) {
      saveSession(state.session);
    }
  }, [state.session, state.isEditing, user]);

  useEffect(() => {
    // Get active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Failed to sign out:', err);
    }
  }, []);

  const initSession = useCallback(
    (config) => dispatch({ type: 'INIT_SESSION', payload: config }),
    []
  );

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

  const removeBuyIn = useCallback(
    (index) =>
      dispatch({ type: 'REMOVE_BUYIN', payload: index }),
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

  const setPlayerExitChips = useCallback(
    (index, chips) =>
      dispatch({ type: 'SET_PLAYER_EXIT_CHIPS', payload: { index, chips } }),
    []
  );

  const clearPlayerExitChips = useCallback(
    (index) =>
      dispatch({ type: 'CLEAR_PLAYER_EXIT_CHIPS', payload: index }),
    []
  );

  const value = {
    ...state,
    user,
    authLoading,
    signOut,
    initSession,
    setStep,
    addPlayer,
    removePlayer,
    updatePlayerBuyIns,
    addBuyIn,
    removeBuyIn,
    setRemainingChips,
    setPlayerExitChips,
    clearPlayerExitChips,
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
