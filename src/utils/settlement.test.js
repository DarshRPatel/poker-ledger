import { describe, it, expect } from 'vitest';
import { calculateSettlements } from './settlement';

describe('calculateSettlements', () => {
  it('should return empty array for 0 net players', () => {
    const players = [
      { name: 'Adam', netRS: 0 },
      { name: 'Bob', netRS: 0 },
    ];
    expect(calculateSettlements(players)).toEqual([]);
  });

  it('should handle a simple 1-to-1 settlement', () => {
    const players = [
      { name: 'Adam', netRS: -100 }, // loser
      { name: 'Bob', netRS: 100 },   // winner
    ];
    const result = calculateSettlements(players);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ from: 'Adam', to: 'Bob', amount: 100 });
  });

  it('should handle one winner and multiple losers', () => {
    const players = [
      { name: 'Adam', netRS: -50 },
      { name: 'Bob', netRS: -50 },
      { name: 'Charlie', netRS: 100 },
    ];
    const result = calculateSettlements(players);
    expect(result).toHaveLength(2);
    // Adam and Bob both pay Charlie 50
    expect(result).toContainEqual({ from: 'Adam', to: 'Charlie', amount: 50 });
    expect(result).toContainEqual({ from: 'Bob', to: 'Charlie', amount: 50 });
  });

  it('should handle multiple winners and one loser', () => {
    const players = [
      { name: 'Adam', netRS: 100 },
      { name: 'Bob', netRS: 50 },
      { name: 'Charlie', netRS: -150 },
    ];
    const result = calculateSettlements(players);
    expect(result).toHaveLength(2);
    // Charlie pays Adam 100 and Bob 50
    expect(result).toContainEqual({ from: 'Charlie', to: 'Adam', amount: 100 });
    expect(result).toContainEqual({ from: 'Charlie', to: 'Bob', amount: 50 });
  });

  it('should handle complex fractional settlements by rounding properly', () => {
    // Due to js float math, let's ensure it handles standard poker rounding
    // Example: total pot is 1000. 
    // Adam net: -333
    // Bob net: -333
    // Charlie net: -334
    // Dave net: 1000
    const players = [
      { name: 'Adam', netRS: -333 },
      { name: 'Bob', netRS: -333 },
      { name: 'Charlie', netRS: -334 },
      { name: 'Dave', netRS: 1000 },
    ];
    const result = calculateSettlements(players);
    expect(result).toHaveLength(3);
    const totalPaidOut = result.reduce((sum, s) => sum + s.amount, 0);
    expect(totalPaidOut).toBe(1000);
  });
  
  it('should ignore players who broke even', () => {
    const players = [
      { name: 'Adam', netRS: -50 },
      { name: 'Bob', netRS: 0 },
      { name: 'Charlie', netRS: 50 },
    ];
    const result = calculateSettlements(players);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ from: 'Adam', to: 'Charlie', amount: 50 });
  });
});
