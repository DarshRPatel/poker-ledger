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

### 1. Cloud Database (Replace localStorage)

**What:** Migrate session data from `localStorage` to a cloud database like **Supabase** (Postgres) or **Firebase Firestore**.

**Why:** `localStorage` is browser-specific — clearing browser data, switching devices, or using incognito mode wipes everything. A database makes data persistent, backed up, and accessible from any device.

**Approach:** Supabase is recommended — it offers a generous free tier, Postgres under the hood, row-level security, and a JS client that works well with React. The existing `services/storage.js` already abstracts all data access, so the migration is a clean swap of the implementation layer.

---

### 2. Multi-Device Sync

**What:** Allow multiple phones at the poker table to view and update the same game session in real-time.

**Why:** Currently only the host's phone tracks the game. If everyone could see the pot, their buy-ins, and the final results on their own device, it's a much better experience.

**Approach:** Use Supabase Realtime subscriptions or Firebase Realtime Database. One user "hosts" the session, others join via a code or link. State changes broadcast to all connected clients.

**Depends on:** Cloud Database (#1 above)

---

### 3. Player Roster & Autocomplete

**What:** Remember player names across sessions. When adding a player, show suggestions from previously used names.

**Why:** The same group of friends plays every week. Typing "Darsh", "Raj", "Amit" every single time is tedious and error-prone (typos create duplicate leaderboard entries).

**Approach:** Maintain a `players` collection in storage (or DB). On the PlayerEntry screen, show a dropdown/autocomplete as the user types. Allow creating new names that get added to the roster.

---

### 4. Export / Share Results

**What:** Share a session's results summary via WhatsApp, clipboard, or as a screenshot/image.

**Why:** After every poker night, someone asks "who owes what?" in the group chat. Being able to tap "Share" and send a clean summary to WhatsApp is the killer feature.

**Approach:**
- **Clipboard:** Format results as a clean text block and use `navigator.clipboard.writeText()`
- **WhatsApp:** Use `https://wa.me/?text=...` deep link with URL-encoded summary
- **Image:** Use `html2canvas` to screenshot the results section and share via Web Share API

---

### 5. Edit Completed Sessions

**What:** Allow editing a saved session — fix a chip entry mistake, adjust a player's buy-in count, or correct the duration.

**Why:** Mistakes happen. If someone entered 1500 chips instead of 150, the entire P&L and settlement is wrong. Currently the only fix is to delete the session and recreate it from scratch.

**Approach:** Add an "Edit" button on the SessionDetail view. Re-open the results in editable mode, recalculate on save.

---

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

### Phase 2: Player Profile Claiming (Full Identity)

*   **How it works**: On the public league page, players can click a **"Claim Profile"** button next to their name.
*   **Unified Account**: Signing up/logging in links their verified account to all existing database records under their name.
*   **Unified Dashboard**: Players get their own private dashboard showing their aggregated performance, charts, win rates, and notes across all hosts' groups they participate in.
*   **Pros**: Premium personal tracking, strict database row-level security (RLS), and zero barrier to entry since accounts are optional.
*   **Cons**: Requires a mapping logic to link historical names to verified user accounts.

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
