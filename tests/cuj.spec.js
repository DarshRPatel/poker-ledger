import { test, expect } from '@playwright/test';

test.describe('Poker Ledger - Critical User Journeys', () => {
  // Clear localStorage before each test so they don't leak state
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('CUJ 1: The Golden Path (Full Game Lifecycle)', async ({ page }) => {
    // 1. Home — verify brand & start a new session
    await expect(page.locator('.navbar-logo')).toContainText('Poker Ledger');
    await page.locator('#btn-new-session').click();

    // 2. Setup Config — fill buy-in & chips, verify ratio
    await page.getByLabel('Buy-in Amount (₹)').fill('100');
    await page.getByLabel('Chips per Buy-in').fill('500');
    await expect(page.locator('.ratio-value')).toContainText('₹1=5 chips');
    await page.locator('#btn-next-players').click();

    // 3. Add Players
    const addPlayer = async (name) => {
      await page.getByPlaceholder('Player name').fill(name);
      await page.locator('#btn-add-player').click();
    };
    await addPlayer('Adam');
    await addPlayer('Bob');
    await addPlayer('Charlie');
    await page.locator('#btn-review-summary').click();

    // 4. Buy-In Summary — verify totals
    await expect(page.locator('.summary-row.footer .col-chips')).toContainText('1,500');
    await page.locator('#btn-start-game').click();

    // 5. Active Game — add an extra buy-in for Adam
    const adamGameCard = page.locator('.game-player-card').filter({ hasText: 'Adam' });
    await adamGameCard.locator('button', { hasText: '+ Buy-in' }).click();

    // Pot should now be 4 buy-ins total (400Rs / 2,000 chips)
    await expect(page.locator('.pot-value-number').first()).toContainText('2,000');
    await expect(page.locator('.pot-value-number').nth(1)).toContainText('₹400');

    // End the game
    await page.locator('#btn-end-game').click();

    // 6. End Game — enter remaining chips & validate totals match
    await page.locator('#input-chips-0').fill('500');   // Adam
    await page.locator('#input-chips-1').fill('1500');  // Bob
    await page.locator('#input-chips-2').fill('0');     // Charlie
    await expect(page.getByText('✅ Totals match!')).toBeVisible();
    await page.locator('#btn-calculate-results').click();

    // 7. Results — verify session header, leaderboard & settlements
    await expect(page.locator('.results-session-num')).toContainText('Session #1');

    // Bob: In ₹100, Out ₹300, Net +₹200
    const bobRow = page.locator('.lb-row').filter({ hasText: 'Bob' });
    await expect(bobRow.locator('.lb-col-net')).toContainText('+₹200');

    // Adam: In ₹200 (2 buy-ins), Out ₹100, Net -₹100
    const adamRow = page.locator('.lb-row').filter({ hasText: 'Adam' });
    await expect(adamRow.locator('.lb-col-net')).toContainText('-₹100');

    // Charlie: In ₹100, Out ₹0, Net -₹100
    const charlieRow = page.locator('.lb-row').filter({ hasText: 'Charlie' });
    await expect(charlieRow.locator('.lb-col-net')).toContainText('-₹100');

    // Settlements — verify from/to/amount on each card
    const cards = page.locator('.settlement-card');
    const cardCount = await cards.count();
    expect(cardCount).toBe(2);

    // Each card has .settlement-from, .settlement-to, .settlement-amount
    for (let i = 0; i < cardCount; i++) {
      const card = cards.nth(i);
      const from = await card.locator('.settlement-from').textContent();
      const to = await card.locator('.settlement-to').textContent();
      const amount = await card.locator('.settlement-amount').textContent();
      expect(to).toBe('Bob');
      expect(amount).toBe('₹100');
      expect(['Adam', 'Charlie']).toContain(from);
    }

    // 8. Save & verify we land back on Home with a saved session
    await page.locator('#btn-save-session').click();
    await expect(page.locator('.session-card')).toBeVisible();
  });
});
