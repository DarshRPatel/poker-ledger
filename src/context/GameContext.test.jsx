import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { GameProvider, useGame } from './GameContext';

// Mock storage
vi.mock('../services/storage', () => ({
  createSession: async (payload) => ({
    id: 'mock_session_id',
    sessionNumber: 1,
    startTime: new Date().toISOString(),
    players: [],
    buyInAmount: payload.buyInAmount,
    chipsPerBuyIn: payload.chipsPerBuyIn,
    ratio: payload.chipsPerBuyIn / payload.buyInAmount,
    totalPotChips: 0,
    totalPotRS: 0,
    status: 'active'
  })
}));

describe('GameContext Hook & Provider', () => {
  const wrapper = ({ children }) => <GameProvider>{children}</GameProvider>;

  it('provides initial state', () => {
    const { result } = renderHook(() => useGame(), { wrapper });
    expect(result.current.step).toBe('setup');
    expect(result.current.session).toBeNull();
  });

  it('handles full game flow: init -> add players -> add buyins -> end -> calc results', async () => {
    // 1. Setup the time mock for duration calculation
    const mockNowMs = Date.now();
    const mockStartTime = new Date(mockNowMs - 60000 * 120).toISOString(); // exactly 120 mins ago
    
    const originalDate = global.Date;
    class MockDate extends Date {
      constructor(dateString) {
        if (dateString) {
          super(dateString);
        } else {
          super(mockNowMs);
        }
      }
      static now() { return mockNowMs; }
    }
    global.Date = MockDate;

    // 2. Render Hook
    const { result } = renderHook(() => useGame(), { wrapper: GameProvider });

    // 3. Init Session (Now Async)
    await act(async () => {
      await result.current.initSession({ buyInAmount: 100, chipsPerBuyIn: 500 });
    });
    
    expect(result.current.step).toBe('players');
    expect(result.current.session.buyInAmount).toBe(100);
    // Overwrite the start time so our duration test works
    act(() => {
      result.current.loadSession({ ...result.current.session, startTime: mockStartTime }, 'players');
    });

    // 4. Add Players
    act(() => {
      result.current.addPlayer('Adam', 1);
      result.current.addPlayer('Bob', 1);
    });

    expect(result.current.session.players).toHaveLength(2);
    expect(result.current.session.totalPotChips).toBe(1000); // 2 * 500
    expect(result.current.session.totalPotRS).toBe(200);     // 2 * 100

    // 5. Add Midgame Buyin for Bob
    act(() => {
      // Bob is at index 1
      result.current.addBuyIn(1, 1);
    });

    expect(result.current.session.players[1].buyIns).toBe(2);
    expect(result.current.session.totalPotChips).toBe(1500); // 3 * 500
    expect(result.current.session.totalPotRS).toBe(300);     // 3 * 100

    // 6. Set Remaining Chips (End Game Math)
    // Adam cashes out big: 1500 chips
    // Bob busts: 0 chips
    act(() => {
      result.current.setRemainingChips(0, 1500); 
      result.current.setRemainingChips(1, 0);
    });

    // 7. Calculate Results
    act(() => {
      result.current.calculateResults();
    });

    // Assert final math
    expect(result.current.step).toBe('results');
    expect(result.current.session.status).toBe('completed');
    expect(result.current.session.durationMinutes).toBe(120);
    
    // Adam: 1 buyin (100 in). Returns 1500 chips (300 value). Profit = +200
    expect(result.current.session.players[0].netRS).toBe(200);
    
    // Bob: 2 buyins (200 in). Returns 0 chips (0 value). Profit = -200
    expect(result.current.session.players[1].netRS).toBe(-200);

    // Restore Date
    global.Date = originalDate;
  });
});
