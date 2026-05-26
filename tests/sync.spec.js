import { test, expect } from '@playwright/test';

const MOCK_SESSION_1 = {
  id: 'sync-session-1',
  sessionNumber: 1,
  startTime: '2026-05-27T00:00:00Z',
  durationMinutes: 60,
  buyInAmount: 100,
  chipsPerBuyIn: 500,
  ratio: 5,
  status: 'completed',
  players: [
    { name: 'Adam', buyIns: 1, remainingChips: 500, netRS: 0 },
    { name: 'Bob', buyIns: 1, remainingChips: 500, netRS: 0 },
  ],
  totalPotChips: 1000,
  totalPotRS: 200,
};

const MOCK_SESSION_1_UPDATED = {
  ...MOCK_SESSION_1,
  durationMinutes: 90,
  players: [
    { name: 'Adam', buyIns: 2, remainingChips: 200, netRS: -160 },
    { name: 'Bob', buyIns: 1, remainingChips: 800, netRS: 60 },
  ],
  totalPotChips: 1500,
  totalPotRS: 300,
};

test.describe('Poker Ledger - Multi-Device Realtime Live Sync', () => {

  test('Home Screen: Standings and matches list updates instantly on realtime event', async ({ page }) => {
    // 1. Visit Home with empty storage
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Verify empty state is visible
    await expect(page.locator('.empty-state')).toBeVisible();

    // 2. Seed a session in local storage (simulating background database insert and local fallback write)
    await page.evaluate((session) => {
      localStorage.setItem('poker_ledger_sessions', JSON.stringify([session]));
    }, MOCK_SESSION_1);

    // 3. Trigger mock realtime event
    await page.evaluate(() => {
      window.liveSyncMockTriggers.sessions({});
    });

    // 4. Assert session card is visible on screen instantly without reload
    await expect(page.locator('#session-card-sync-session-1')).toBeVisible();
    await expect(page.locator('.leaderboard-row').filter({ hasText: 'Adam' })).toBeVisible();
  });

  test('Session Detail: Game summary and leaderboards reload instantly on realtime event', async ({ page }) => {
    // 1. Seed initial session in storage and load page
    await page.goto('/');
    await page.evaluate((session) => {
      localStorage.clear();
      localStorage.setItem('poker_ledger_sessions', JSON.stringify([session]));
    }, MOCK_SESSION_1);
    
    await page.goto('/session/sync-session-1');
    await expect(page.locator('.results-session-num')).toContainText('Session #1');
    await expect(page.locator('.stat-item').filter({ hasText: 'Total Pot' }).locator('.stat-value')).toContainText('₹200');

    // 2. Seed updated session in storage (simulating host making changes elsewhere)
    await page.evaluate((session) => {
      localStorage.setItem('poker_ledger_sessions', JSON.stringify([session]));
    }, MOCK_SESSION_1_UPDATED);

    // 3. Trigger realtime event
    await page.evaluate(() => {
      window.liveSyncMockTriggers.sessions({});
    });

    // 4. Assert UI has updated automatically
    await expect(page.locator('.stat-item').filter({ hasText: 'Total Pot' }).locator('.stat-value')).toContainText('₹300');
    await expect(page.locator('.stat-item').filter({ hasText: 'Duration' }).locator('.stat-value')).toContainText('1 hr 30 min');
  });
});
