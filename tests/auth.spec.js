import { test, expect } from '@playwright/test';

const PROJECT_ID = 'qzuvrmpabpncskvzzlhj';
const AUTH_STORAGE_KEY = `sb-${PROJECT_ID}-auth-token`;
const SUPABASE_API_URL = `https://${PROJECT_ID}.supabase.co`;

const MOCK_USER_ID = '7db57d7b-99f5-4674-8b65-0377c8e98629';
const MOCK_HOST_ID = 'host-1234-uuid-value';

const MOCK_SESSION = {
  access_token: 'mock-access-token',
  token_type: 'bearer',
  expires_in: 3600,
  refresh_token: 'mock-refresh-token',
  user: {
    id: MOCK_USER_ID,
    email: 'player@poker.com',
    role: 'authenticated',
    aud: 'authenticated',
  },
  expires_at: Math.floor(Date.now() / 1000) + 3600,
};

const MOCK_LEDGER_SESSIONS = [
  {
    id: 'mock-session-1',
    sessionNumber: 1,
    hostId: MOCK_HOST_ID,
    startTime: '2026-05-27T00:00:00Z',
    endTime: '2026-05-27T02:00:00Z',
    durationMinutes: 120,
    buyInAmount: 100,
    chipsPerBuyIn: 500,
    ratio: 5,
    status: 'completed',
    players: [
      { name: 'Adam', buyIns: 1, remainingChips: 500, netRS: 0 },
      { name: 'Bob', buyIns: 1, remainingChips: 1000, netRS: 100 },
      { name: 'Charlie', buyIns: 1, remainingChips: 0, netRS: -100 },
    ],
  },
];

test.describe('Poker Ledger - Authentication & Public League Journeys', () => {
  
  // Set up API intercepts and seed localStorage before each test
  test.beforeEach(async ({ page }) => {
    // Intercept sessions endpoint
    await page.route(`${SUPABASE_API_URL}/rest/v1/sessions*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_LEDGER_SESSIONS),
      });
    });

    // Default rosters request
    await page.route(`${SUPABASE_API_URL}/rest/v1/rosters*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Seed localStorage so that storage.js returns mock sessions under webdriver mode
    await page.goto('/');
    await page.evaluate((sessions) => {
      localStorage.clear();
      localStorage.setItem('poker_ledger_sessions', JSON.stringify(sessions));
    }, MOCK_LEDGER_SESSIONS);
  });

  test('Guest View: Public League Standings & Session Detail navigation', async ({ page }) => {
    // Intercept claims request (empty)
    await page.route(`${SUPABASE_API_URL}/rest/v1/player_claims*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Visit public standings page
    await page.goto(`/league/${MOCK_HOST_ID}`);
    await expect(page.locator('h1')).toContainText('Public Standings');

    // Verify standings leaderboard has loaded
    const bobRow = page.locator('.leaderboard-row').filter({ hasText: 'Bob' });
    await expect(bobRow).toBeVisible();
    await expect(bobRow.locator('.lb-net')).toContainText('+₹100');

    // Click on the past session to view detail
    await page.locator(`#session-card-mock-session-1`).click();
    await expect(page).toHaveURL(new RegExp(`/league/${MOCK_HOST_ID}/session/mock-session-1`));

    // Verify session overview loads
    await expect(page.locator('h1')).toContainText('Game Summary');
    
    // Click back to league standings
    await page.locator('button', { hasText: 'Back to League' }).click();
    await expect(page).toHaveURL(new RegExp(`/league/${MOCK_HOST_ID}`));
  });

  test('Claiming Profile redirects to Login if unauthenticated', async ({ page }) => {
    // Intercept claims request (empty)
    await page.route(`${SUPABASE_API_URL}/rest/v1/player_claims*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto(`/league/${MOCK_HOST_ID}`);
    
    // Click Claim next to Bob
    const bobRow = page.locator('.leaderboard-row').filter({ hasText: 'Bob' });
    await bobRow.locator('button', { hasText: 'Claim' }).click();

    // Verify it redirects to Login
    await expect(page).toHaveURL(/.*\/login$/);
    await expect(page.locator('.login-card h2')).toContainText('Game Organizer Login');
  });

  test('Claiming Profile works when authenticated', async ({ page }) => {
    // Sign in the user locally
    await page.goto('/');
    await page.evaluate(({ key, val }) => {
      localStorage.setItem(key, JSON.stringify(val));
    }, { key: AUTH_STORAGE_KEY, val: MOCK_SESSION });

    // Mock claims query (empty initial claims)
    await page.route(`${SUPABASE_API_URL}/rest/v1/player_claims*`, async (route) => {
      const method = route.request().method();
      if (method === 'POST') {
        // Insert mock claim
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'mock-claim-uuid',
            user_id: MOCK_USER_ID,
            host_id: MOCK_HOST_ID,
            player_name: 'Bob',
            status: 'approved',
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      }
    });

    // Go to league standings
    await page.goto(`/league/${MOCK_HOST_ID}`);

    // Click claim next to Bob
    const bobRow = page.locator('.leaderboard-row').filter({ hasText: 'Bob' });
    const claimBtn = bobRow.locator('button', { hasText: 'Claim' });
    await claimBtn.click();

    // Verify the claim button transforms into the personal badge
    await expect(bobRow.locator('.badge-profit')).toContainText('👤 You');
  });

  test('Player Stats Dashboard aggregates sessions and renders chart', async ({ page }) => {
    // Sign in the user locally
    await page.goto('/');
    await page.evaluate(({ key, val }) => {
      localStorage.setItem(key, JSON.stringify(val));
    }, { key: AUTH_STORAGE_KEY, val: MOCK_SESSION });

    // Mock claims fetch to return Bob's claim
    await page.route(`${SUPABASE_API_URL}/rest/v1/player_claims*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'mock-claim-uuid',
            user_id: MOCK_USER_ID,
            host_id: MOCK_HOST_ID,
            player_name: 'Bob',
            status: 'approved',
          },
        ]),
      });
    });

    // Go directly to Dashboard
    await page.goto('/dashboard');
    await expect(page.locator('h1')).toContainText('Bob');

    // Check stats cards
    await expect(page.locator('.stat-card').filter({ hasText: 'Net Profit' }).locator('.stat-value')).toContainText('₹100');
    await expect(page.locator('.stat-card').filter({ hasText: 'Games' }).locator('.stat-value')).toContainText('1');
    await expect(page.locator('.stat-card').filter({ hasText: 'Win Rate' }).locator('.stat-value')).toContainText('100%');

    // Check custom SVG chart is rendered
    await expect(page.locator('.performance-chart')).toBeVisible();
    await expect(page.locator('.chart-dot')).toBeVisible();
  });
});
