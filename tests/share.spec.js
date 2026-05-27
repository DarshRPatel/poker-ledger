import { test, expect } from '@playwright/test';

test.describe('Poker Ledger - Export & Share Results E2E', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant clipboard permissions to context
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  const setupAndEndGame = async (page) => {
    // 1. New Session
    await page.locator('#btn-new-session').click();
    await page.getByLabel('Buy-in Amount (₹)').fill('100');
    await page.getByLabel('Chips per Buy-in').fill('500');
    await page.locator('#btn-next-players').click();

    // 2. Add players
    await page.getByPlaceholder('Player name').fill('Darsh');
    await page.locator('#btn-add-player').click();
    await page.getByPlaceholder('Player name').fill('Amit');
    await page.locator('#btn-add-player').click();
    await page.locator('#btn-review-summary').click();

    // 3. Start game
    await page.locator('#btn-start-game').click();

    // 4. End game and enter chips
    await page.locator('#btn-end-game').click();
    await page.locator('#input-chips-0').fill('1000'); // Darsh: Out 1000 (+500 net)
    await page.locator('#input-chips-1').fill('0');    // Amit: Out 0 (-500 net)
    await page.locator('#btn-calculate-results').click();
  };

  test('Share Results from live SessionResults screen', async ({ page }) => {
    await setupAndEndGame(page);

    // Verify Results page is active
    await expect(page.locator('.results-session-num')).toContainText('Session #1');

    // Click "Share Results" to open modal
    await page.locator('#btn-share-results').click();
    await expect(page.locator('#share-modal-overlay')).toBeVisible();

    // 1. Verify preview text contains summary info
    const previewText = await page.locator('#share-text-preview').inputValue();
    expect(previewText).toContain('Session #1 Summary');
    expect(previewText).toContain('Total Pot: ₹200');
    expect(previewText).toContain('Darsh: +₹100');
    expect(previewText).toContain('Amit: -₹100');
    expect(previewText).toContain('Amit owes ₹100 to Darsh');

    // 2. Verify Clipboard copy
    await page.locator('#btn-copy-clipboard').click();
    await expect(page.locator('#btn-copy-clipboard')).toContainText('Copied');
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('Session #1 Summary');
    expect(clipboardText).toContain('Amit owes ₹100 to Darsh');

    // 3. Verify WhatsApp link encoding
    await page.evaluate(() => {
      window.openedUrls = [];
      window.open = (url) => { window.openedUrls.push(url); return null; };
    });
    await page.locator('#btn-share-whatsapp').click();
    const openedUrls = await page.evaluate(() => window.openedUrls);
    expect(openedUrls[0]).toContain('wa.me');
    expect(openedUrls[0]).toContain(encodeURIComponent('Session #1 Summary'));

    // 4. Verify html2canvas PNG download
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#btn-download-image').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('poker-session-1-results.png');

    // Close modal
    await page.locator('.share-close-btn').click();
    await expect(page.locator('#share-modal-overlay')).not.toBeVisible();
  });

  test('Share Results from saved SessionDetail screen', async ({ page }) => {
    await setupAndEndGame(page);

    // Save session
    await page.locator('#btn-save-session').click();
    await page.waitForURL('**/');

    // Open first session details from match history on Home
    await page.locator('.session-card').first().click();
    await page.waitForURL('**/session/*');

    // Verify detail page header
    await expect(page.locator('.results-session-num')).toContainText('Session #1');

    // Click "Share Results" to open modal
    await page.locator('#btn-share-results').click();
    await expect(page.locator('#share-modal-overlay')).toBeVisible();

    // Verify copy works
    await page.locator('#btn-copy-clipboard').click();
    await expect(page.locator('#btn-copy-clipboard')).toContainText('Copied');
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('Session #1 Summary');

    // Verify image download works from Detail page
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#btn-download-image').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('poker-session-1-results.png');
  });
});
