import { test, expect } from '@playwright/test';

test.describe('Poker Ledger - Edit Completed Sessions E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('Host edits a completed session, navigates back and forth, and saves changes', async ({ page }) => {
    // 1. Setup a session
    await page.locator('#btn-new-session').click();
    await page.getByLabel('Buy-in Amount (₹)').fill('100');
    await page.getByLabel('Chips per Buy-in').fill('500');
    await page.locator('#btn-next-players').click();

    // Add players
    await page.getByPlaceholder('Player name').fill('Darsh');
    await page.locator('#btn-add-player').click();
    await page.getByPlaceholder('Player name').fill('Amit');
    await page.locator('#btn-add-player').click();
    await page.locator('#btn-review-summary').click();

    // Start and immediately end game
    await page.locator('#btn-start-game').click();
    await page.locator('#btn-end-game').click();

    // Enter initial chip count (totals match: 1000 chips)
    await page.locator('#input-chips-0').fill('700'); // Darsh: +200 net
    await page.locator('#input-chips-1').fill('300'); // Amit: -200 net
    await page.locator('#btn-calculate-results').click();

    // Verify results page is visible and save session
    await expect(page.locator('.results-session-num')).toContainText('Session #1');
    await page.locator('#btn-save-session').click();
    await page.waitForURL('**/');

    // 2. Open session detail view
    await page.locator('.session-card').first().click();
    await page.waitForURL('**/session/*');

    // Verify Edit Session button is present and click it
    await expect(page.locator('#btn-edit-session')).toBeVisible();
    await page.locator('#btn-edit-session').click();

    // 3. Land on /endgame page. Verify chip inputs are pre-populated with original values
    await page.waitForURL('**/endgame');
    await expect(page.locator('#input-chips-0')).toHaveValue('700');
    await expect(page.locator('#input-chips-1')).toHaveValue('300');

    // 4. Click Back to Game and verify static duration is displayed on ActiveGame view
    await page.locator('.navbar-back').click(); // Back button in Endgame Navbar
    await page.waitForURL('**/game');
    await expect(page.locator('.timer-value')).toBeVisible();

    // Verify we can modify buy-ins in edit mode (add buy-in to Darsh)
    // Adding 1 buy-in to Darsh adds 500 chips to expected pot (total expected 1500 chips)
    await page.locator('#btn-add-buyin-0').click();
    await expect(page.locator('.pot-value-number').first()).toContainText('1,500');

    // Go back to /endgame
    await page.locator('#btn-end-game').click();
    await page.waitForURL('**/endgame');

    // Verify expected chips has updated to 1500
    await expect(page.locator('.endgame-validation')).toContainText('1,500 chips');

    // 5. Verify Database Isolation: intermediate unbalanced inputs must NOT be saved to DB yet
    // Input balanced chips (Total: 1500)
    await page.locator('#input-chips-0').fill('1500'); 
    await page.locator('#input-chips-1').fill('0');    

    // Retrieve sessions from localStorage to assert they still match the original (700/300) values
    const localStorageSessionsStrBefore = await page.evaluate(() => localStorage.getItem('poker_ledger_sessions'));
    const sessionsBefore = JSON.parse(localStorageSessionsStrBefore || '[]');
    expect(sessionsBefore[0].players[0].remainingChips).toBe(700);
    expect(sessionsBefore[0].players[1].remainingChips).toBe(300);

    // 6. Complete and save the edit
    await page.locator('#btn-calculate-results').click();
    await page.waitForURL('**/results');

    // Verify the updated settlements: Amit (In 100, Out 0, Net -100), Darsh (In 200, Out 1200, Net +1000)
    const card = page.locator('.settlement-card');
    await expect(card.locator('.settlement-from')).toContainText('Amit');
    await expect(card.locator('.settlement-amount')).toContainText('₹100');
    await expect(card.locator('.settlement-to')).toContainText('Darsh');

    // Click Save Session to commit the edit to database
    await page.locator('#btn-save-session').click();
    await page.waitForURL('**/');

    // Verify updated history is reflected on Home screen
    const firstSessionCard = page.locator('.session-card').first();
    await expect(firstSessionCard.locator('.session-stat').first()).toContainText('₹300'); // total pot
  });
});
