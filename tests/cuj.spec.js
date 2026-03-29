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

    // 5. Active Game — add an extra buy-in for Adam (player index 0)
    await page.locator('#btn-add-buyin-0').click();

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

  test('CUJ 2: Validation Guards (New Session Input)', async ({ page }) => {
    // 1. Navigate to New Session
    await page.goto('/new');

    // 2. Submit Empty (Should be disabled)
    const nextBtn = page.locator('#btn-next-players');
    await expect(nextBtn).toBeDisabled();

    // 3. Submit 0 values (Should show error & stay disabled)
    await page.getByLabel('Buy-in Amount (₹)').fill('0');
    await page.getByLabel('Chips per Buy-in').fill('-50');
    
    await expect(page.getByText('Buy-in must be at least ₹1')).toBeVisible();
    await expect(page.getByText('Chips must be at least 1')).toBeVisible();
    await expect(nextBtn).toBeDisabled();

    // 4. Correct values
    await page.getByLabel('Buy-in Amount (₹)').fill('100');
    await page.getByLabel('Chips per Buy-in').fill('1000');
    
    await expect(page.getByText('Buy-in must be at least ₹1')).toBeHidden();
    await expect(page.getByText('Chips must be at least 1')).toBeHidden();
    await expect(nextBtn).toBeEnabled();
  });

  // --- Shared helper: quickly start a 3-player game ---
  async function startGameWith3Players(page) {
    await page.locator('#btn-new-session').click();
    await page.getByLabel('Buy-in Amount (₹)').fill('100');
    await page.getByLabel('Chips per Buy-in').fill('500');
    await page.locator('#btn-next-players').click();
    for (const name of ['Adam', 'Bob', 'Charlie']) {
      await page.getByPlaceholder('Player name').fill(name);
      await page.locator('#btn-add-player').click();
    }
    await page.locator('#btn-review-summary').click();
    await page.locator('#btn-start-game').click();
    await expect(page.locator('.navbar-title')).toContainText('Game in Progress');
  }

  test('CUJ 3: Buy-in Stepper — Add, Remove & Direct Edit', async ({ page }) => {
    await startGameWith3Players(page);

    // Adam starts with 1 buy-in
    const adamCard = page.locator('.game-player-card').filter({ hasText: 'Adam' });
    await expect(adamCard.locator('#btn-buyin-count-0')).toContainText('1');

    // 1. Add a buy-in via + button
    await page.locator('#btn-add-buyin-0').click();
    await expect(adamCard.locator('#btn-buyin-count-0')).toContainText('2');

    // 2. Remove a buy-in via − button
    await page.locator('#btn-remove-buyin-0').click();
    await expect(adamCard.locator('#btn-buyin-count-0')).toContainText('1');

    // 3. − button should be disabled at 1
    await expect(page.locator('#btn-remove-buyin-0')).toBeDisabled();

    // 4. Direct edit: click count, type 5, press Enter
    await page.locator('#btn-buyin-count-0').click();
    const editInput = page.locator('#buyin-edit-input-0');
    await expect(editInput).toBeVisible();
    await editInput.fill('5');
    await editInput.press('Enter');

    // Count should now be 5
    await expect(adamCard.locator('#btn-buyin-count-0')).toContainText('5');
    // Pot should update: Adam 5 + Bob 1 + Charlie 1 = 7 buy-ins = 3500 chips
    await expect(page.locator('.pot-value-number').first()).toContainText('3,500');
  });

  test('CUJ 4: EndGame Back Button → Game in Progress', async ({ page }) => {
    await startGameWith3Players(page);

    // Navigate to End Game
    await page.locator('#btn-end-game').click();
    await expect(page.locator('.navbar-title')).toContainText('End Game');

    // Click Back — should go to Game in Progress, NOT summary
    await page.locator('.navbar-back').click();
    await expect(page.locator('.navbar-title')).toContainText('Game in Progress');
    // Verify the game timer is still visible (confirms we're on ActiveGame)
    await expect(page.locator('.timer-value')).toBeVisible();
  });

  test('CUJ 5: Early Cash Out with Persistence & EndGame Pre-fill', async ({ page }) => {
    await startGameWith3Players(page);

    // 1. Cash out Bob (player index 1) with 200 chips
    await page.locator('#btn-cashout-1').click();
    const exitInput = page.locator('#input-exit-chips-1');
    await expect(exitInput).toBeVisible();
    await exitInput.fill('200');
    await page.locator('#btn-confirm-cashout-1').click();

    // 2. Verify no validation error shown on valid input
    await expect(page.locator('#cashout-error')).not.toBeVisible();

    // 3. Verify Bob shows CASHED OUT badge
    const bobCard = page.locator('.game-player-card').filter({ hasText: 'Bob' });
    await expect(bobCard.locator('.cashed-out-badge')).toContainText('CASHED OUT');

    // 4. Verify Bob's buy-in stepper is hidden (no + button visible in his card)
    await expect(bobCard.locator('#btn-add-buyin-1')).not.toBeVisible();

    // 5. Verify Undo button is visible
    await expect(bobCard.locator('#btn-undo-cashout-1')).toBeVisible();

    // 6. Navigate to EndGame and verify pre-fill
    await page.locator('#btn-end-game').click();
    const bobChipInput = page.locator('#input-chips-1');
    await expect(bobChipInput).toHaveValue('200');
    // Verify pre-filled label
    await expect(page.locator('.prefilled-label').first()).toContainText('(pre-filled)');

    // 7. Go back and verify persistence (Bob still cashed out)
    await page.locator('.navbar-back').click();
    await expect(page.locator('.navbar-title')).toContainText('Game in Progress');
    await expect(bobCard.locator('.cashed-out-badge')).toContainText('CASHED OUT');

    // 8. Test Undo cash-out
    await bobCard.locator('#btn-undo-cashout-1').click();
    await expect(bobCard.locator('.cashed-out-badge')).not.toBeVisible();
    // Stepper should be back
    await expect(bobCard.locator('#btn-add-buyin-1')).toBeVisible();
  });

  test('CUJ 6: Cash-Out Validation Guards', async ({ page }) => {
    await startGameWith3Players(page);
    // Pot = 3 players × 500 chips = 1,500 chips

    const errorEl = page.locator('#cashout-error');

    // --- Test negative chips ---
    await page.locator('#btn-cashout-0').click();
    const exitInput = page.locator('#input-exit-chips-0');
    await exitInput.fill('-100');
    await page.locator('#btn-confirm-cashout-0').click();
    await expect(errorEl).toContainText('Chips cannot be negative');
    const adamCard = page.locator('.game-player-card').filter({ hasText: 'Adam' });
    await expect(adamCard.locator('.cashed-out-badge')).not.toBeVisible();

    // --- Test individual overflow (chips > pot) ---
    await exitInput.fill('9999');
    await page.locator('#btn-confirm-cashout-0').click();
    await expect(errorEl).toContainText('Exceeds available chips');
    await expect(adamCard.locator('.cashed-out-badge')).not.toBeVisible();

    // --- Test valid: cash out Adam with 1000 chips ---
    await exitInput.fill('1000');
    await page.locator('#btn-confirm-cashout-0').click();
    await expect(errorEl).not.toBeVisible();
    await expect(adamCard.locator('.cashed-out-badge')).toContainText('CASHED OUT');

    // --- Test cumulative overflow: Bob tries 600 (1000 + 600 > 1500) ---
    await page.locator('#btn-cashout-1').click();
    const bobExitInput = page.locator('#input-exit-chips-1');
    await bobExitInput.fill('600');
    await page.locator('#btn-confirm-cashout-1').click();
    await expect(errorEl).toContainText('Exceeds available chips');
    await expect(errorEl).toContainText('500 remaining');
    const bobCard = page.locator('.game-player-card').filter({ hasText: 'Bob' });
    await expect(bobCard.locator('.cashed-out-badge')).not.toBeVisible();

    // --- Test valid remaining: Bob cashes out with exactly 500 ---
    await bobExitInput.fill('500');
    await page.locator('#btn-confirm-cashout-1').click();
    await expect(errorEl).not.toBeVisible();
    await expect(bobCard.locator('.cashed-out-badge')).toContainText('CASHED OUT');
  });
});

