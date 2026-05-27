# Poker Ledger — Roadmap & Future Plans

## Table of Contents

- [P1 — High Value, Next Up](#p1--high-value-next-up)
- [P2 — Nice to Have](#p2--nice-to-have)
- [Hosting & Deployment](#hosting--deployment)
- [Mobile Home Screen (PWA)](#mobile-home-screen-pwa)
- [Authentication Strategy](#authentication-strategy)
- [Shipped & Completed](#shipped--completed)

---



## P1 — High Value, Next Up

Features that significantly improve the app's usefulness and were explicitly deferred from v1.



### 6. Additional E2E Test Coverage

**What:** Implement the two remaining CUJs from the testing plan:

- **State Persistence CUJ:** Start a game → reload the browser mid-game → verify the active session and pot are fully recovered from storage
- **Validation Guards CUJ:** End a game with mismatched chip totals → verify the UI blocks submission and displays the exact difference

**Why:** The Golden Path CUJ covers the happy path, but these cover critical edge cases that protect against data loss and calculation errors.

---

## P2 — Nice to Have

Lower priority features that add polish and delight.

| # | Feature | Description |
|---|---------|-------------|
| 1 | **Win/Loss Streaks** | Track consecutive winning/losing sessions per player. Show 🔥 streak badges on the leaderboard |
| 2 | **Charts & Analytics** | Line chart showing each player's cumulative P&L over time using a lightweight library like Chart.js or Recharts |
| 3 | **Dark/Light Theme Toggle** | Currently dark-only. Add a theme switcher in the navbar for users who prefer light mode |
| 4 | **Chip Denominations** | Let users define chip colors and denominations (e.g. white=10, red=50, blue=100) for more granular tracking |
| 5 | **Session Notes** | Free-text notes per session for memorable moments ("Darsh went all-in on a bluff and lost") |
| 6 | **Undo/Redo** | Undo accidental buy-ins, player removals, or chip entries during a live game. Use a state history stack |
| 7 | **Sounds & Haptics** | Subtle chip-shuffle sounds and vibration on mobile for buy-ins and game events |

---

## Hosting & Deployment

The app is a static site (no server-side code), so it can be hosted for free on several platforms. Here are the best options ranked by ease:

### Option 1: Vercel (Recommended)

The fastest path from GitHub repo to live URL.

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy (first time — links to your GitHub repo)
vercel

# Subsequent deploys happen automatically on every push to p0
```

- **Free tier:** Unlimited static sites, automatic HTTPS, global CDN
- **Custom domain:** Add your own domain in the Vercel dashboard
- **Auto-deploy:** Every push to `p0` triggers a new deployment
- **URL:** You'll get something like `poker-ledger.vercel.app`

### Option 2: Netlify

Similar to Vercel with a drag-and-drop option.

```bash
npm run build
# Upload the `dist/` folder to netlify.com, or use the CLI:
npx netlify deploy --prod --dir=dist
```

### Option 3: GitHub Pages

Free hosting directly from your repo.

```bash
npm run build
# Push the dist/ folder to a gh-pages branch, or use:
npx gh-pages -d dist
```

- **URL:** `https://darshrpatel.github.io/poker-ledger`
- **Caveat:** Client-side routing (`react-router`) needs a `404.html` redirect trick

### Option 4: Firebase Hosting

Good if you later add Firebase auth or Firestore.

```bash
npm install -g firebase-tools
firebase init hosting   # set public dir to "dist"
npm run build
firebase deploy
```

---

## Mobile Home Screen (PWA)

Once hosted, any user can add the app to their home screen right now (even without full PWA support):

### iOS (Safari)
1. Open the hosted URL in Safari
2. Tap the **Share** button (square with arrow)
3. Scroll down and tap **"Add to Home Screen"**
4. Name it "Poker Ledger" and tap **Add**

### Android (Chrome)
1. Open the hosted URL in Chrome
2. Tap the **⋮ menu** (three dots)
3. Tap **"Add to Home screen"** or **"Install app"**

### With Full PWA (after P0 #1 is implemented)
Once a `manifest.json` and service worker are added, Chrome/Android will show a native **"Install App"** banner automatically. The app will:
- Launch in standalone mode (no browser bar)
- Have its own icon with the Poker Ledger logo
- Work offline (cached assets)
- Appear in the Android app drawer like a real app

---

## Authentication Strategy

The goal is to provide a secure, personalized experience for hosts and players while maintaining the absolute minimum friction for casual players at the table. We will execute this in a **two-phase evolutionary path**:

### Phase 1: Host-Only Auth & Group Leaderboards (Low Friction)

*   **How it works**: Only the organizers/hosts (e.g., Darsh) register accounts using Supabase Auth (e.g., email Magic Links). Stored sessions are associated with a unique `host_id`.
*   **Roster Management**: The host manages a saved roster of player names to prevent spelling variations (avoiding duplicate leaderboard entries).
*   **Public Share Link**: The app generates a public, read-only URL for the host's group dashboard (e.g., `/league/:host_id`). Other players can open this link to view live games and standings without any sign-in.
*   **Pros**: Zero friction for friends, clean data collection, and scales to multiple game organizers.
*   **Cons**: Stats are hosted under a specific organizer's account and cannot be easily viewed in one centralized spot if players play across multiple hosts (resolved in Phase 2).

#### Implementation Tasks:
- [x] **Database & RLS Setup**: Add `host_id` uuid references `auth.users(id)` to `sessions` table. Create `rosters` table (`id`, `host_id`, `name`, `created_at`) with unique `(host_id, name)`. Enable RLS with read-only public access and write access gated by `auth.uid() = host_id`.
- [x] **Auth Listener Integration**: Integrate Supabase Auth listener state (`user`, `authLoading`) in `GameContext` and expose `signOut` helper.
- [x] **Host Login Screen (`/login`)**: Create passwordless Email Magic Link authentication screen.
- [x] **Roster Management Screen (`/roster`)**: Create management view for hosts to add/remove player names.
- [x] **Autocomplete Roster Suggestions**: Connect roster names to the `PlayerEntry` setup page for name autocompletion.
- [x] **Scoping Sessions**: Update session saving logic (`saveSession` in `storage.js`) to capture the logged-in host's ID.
- [x] **Public Standings Dashboard (`/league/:host_id`)**: Query and display host-specific standings, match history, and session details (`/league/:host_id/session/:session_id`) without requiring user sign-in.

### Phase 2: Player Profile Claiming (Full Identity)

*   **How it works**: On the public league page, players can click a **"Claim Profile"** button next to their name.
*   **Unified Account**: Signing up/logging in links their verified account to all existing database records under their name.
*   **Unified Dashboard**: Players get their own private dashboard showing their aggregated performance, charts, win rates, and notes across all hosts' groups they participate in.
*   **Pros**: Premium personal tracking, strict database row-level security (RLS), and zero barrier to entry since accounts are optional.
*   **Cons**: Requires a mapping logic to link historical names to verified user accounts.

#### Implementation Tasks:
- [x] **Database Setup**: Create `player_claims` table (`id`, `user_id` unique, `host_id`, `player_name`, `status`, `created_at`). Enable RLS allowing users to claim and hosts to view/approve.
- [x] **Leaderboard Claim Button**: Add "Claim Profile" badge/button next to names on `/league/:host_id` standings.
- [x] **Claim Processing & Linking**: Direct player to register/sign-in and record a claim to map `auth.uid()` to the host's roster player name.
- [x] **Unified Player Dashboard (`/dashboard`)**: Create dashboard view consolidating historical player stats (win rate, total buy-in, net P&L, streaks) across all hosts they've played with.
- [x] **Interactive P&L Chart**: Build a line graph of cumulative net profit over time using a lightweight chart library.

### Recommended Path

```
Phase 1:  Host-Only Auth + Public Read-Only Group Dashboards (High value, low friction)
Phase 2:  Optional Player Sign-In & Profile Claiming (Full player dashboards & cross-group stats)
```

---

## Shipped & Completed

These are tasks that were originally identified as gaps or future plans but have now been fully implemented.

### 1. Progressive Web App (PWA) Support (P0)
*   **Status:** ✅ Completed in v1.1
*   **Implementation:** Configured via `vite-plugin-pwa` in [vite.config.js](file:///Users/darshpatel/Desktop/Darsh/Projects/poker-ledger/vite.config.js) with custom assets in `public/` and corresponding meta tags in [index.html](file:///Users/darshpatel/Desktop/Darsh/Projects/poker-ledger/index.html).

### 2. Input Validation on New Session (P0)
*   **Status:** ✅ Completed in v1.1
*   **Implementation:** Added min-value checks and input validation error states in [NewSession.jsx](file:///Users/darshpatel/Desktop/Darsh/Projects/poker-ledger/src/views/NewSession.jsx), preventing division-by-zero or negative entries.

### 3. Styled Delete Confirmation (P0)
*   **Status:** ✅ Completed in v1.1
*   **Implementation:** Replaced browser-native `window.confirm()` with a custom themed [ConfirmModal.jsx](file:///Users/darshpatel/Desktop/Darsh/Projects/poker-ledger/src/components/ConfirmModal.jsx) component in [Home.jsx](file:///Users/darshpatel/Desktop/Darsh/Projects/poker-ledger/src/views/Home.jsx).

### 4. Graceful Redirects with Feedback (P0)
*   **Status:** ✅ Completed in v1.1
*   **Implementation:** Added active session checks and automatic redirection to `/new` with stateful toast notifications across all sub-views using [GlobalToastHelper.jsx](file:///Users/darshpatel/Desktop/Darsh/Projects/poker-ledger/src/components/GlobalToastHelper.jsx).

### 5. Cloud Database Migration (P1)
*   **Status:** ✅ Completed in v1.2
*   **Implementation:** Migrated persistent storage to Supabase (PostgreSQL) asynchronously in [storage.js](file:///Users/darshpatel/Desktop/Darsh/Projects/poker-ledger/src/services/storage.js). Integrates a robust fallback mechanism that redirects queries to browser `localStorage` in automated E2E test environments or when offline.

### 6. Export / Share Results (P1)
*   **Status:** ✅ Completed in v1.3
*   **Implementation:** Implemented plain-text copy-to-clipboard formatting, WhatsApp deep linking, mobile Web Share integration, and custom high-definition canvas snapshotting using `html2canvas` in [ShareModal.jsx](file:///Users/darshpatel/Desktop/Darsh/Projects/poker-ledger/src/components/ShareModal.jsx).

### 7. Host Authentication, Roster, Public Standing Dashboard & Autocomplete (P1)
*   **Status:** ✅ Completed in v1.2
*   **Implementation:** Integrated passwordless Email Magic Link Supabase auth, scoped player rosters with autocomplete suggestions in [PlayerEntry.jsx](file:///Users/darshpatel/Desktop/Darsh/Projects/poker-ledger/src/views/PlayerEntry.jsx), and public standings view `/league/:hostId`.

### 8. Player Profile Claiming, Unified Dashboards & Charts (P1)
*   **Status:** ✅ Completed in v1.2
*   **Implementation:** Implemented `player_claims` routing, and a unified performance dashboard at `/dashboard` displaying win rates, streaks, and cumulative P&L line graph via custom SVG drawings.

### 9. Multi-Device Realtime Live Sync (P1)
*   **Status:** ✅ Completed in v1.2
*   **Implementation:** Created custom realtime listener hook [useLiveSync.js](file:///Users/darshpatel/Desktop/Darsh/Projects/poker-ledger/src/hooks/useLiveSync.js) that silently reloads session states upon Supabase broadcast notifications.

### 10. Edit Completed Sessions (P1)
*   **Status:** ✅ Completed in v1.3
*   **Implementation:** Enabled editing completed sessions by loading state back into the `GameContext` under `'endgame'` step, resolving auto-save isolation with `isEditing` state flags, and formatting elapsed game timers statically.
