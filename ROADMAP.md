# Poker Ledger — Roadmap & Future Plans

## Table of Contents

- [P0 — Gaps in Current Build](#p0--gaps-in-current-build)
- [P1 — High Value, Next Up](#p1--high-value-next-up)
- [P2 — Nice to Have](#p2--nice-to-have)
- [Hosting & Deployment](#hosting--deployment)
- [Mobile Home Screen (PWA)](#mobile-home-screen-pwa)
- [Authentication Strategy](#authentication-strategy)

---

## P0 — Gaps in Current Build

These are issues or missing pieces in the shipped v1 that should be addressed before wider use.

### 1. Progressive Web App (PWA) Support

**What:** Make the app installable on mobile so it behaves like a native app — with its own icon on the home screen, no browser chrome, and offline support.

**Why:** The app is mobile-first and meant to be used at a poker table. Users shouldn't have to open a browser, type a URL, and navigate — they should tap an icon and go.

**What's needed:**
- `public/manifest.json` with app name, icons (192px + 512px), theme color, `display: standalone`
- A service worker (via `vite-plugin-pwa`) for caching static assets and enabling offline access
- Meta tags in `index.html` for iOS (apple-touch-icon, apple-mobile-web-app-capable)

---

### 2. Input Validation on New Session

**What:** The New Session screen currently allows invalid values like 0, negative numbers, or empty fields for buy-in amount and chips per buy-in.

**Why:** Submitting `0` as chips-per-buyin causes a division-by-zero in the ratio calculation and breaks the entire game flow.

**Fix:** Add min-value guards (`>= 1`), disable the "Next" button until both fields are valid, and show inline error messages.

---

### 3. Styled Delete Confirmation

**What:** Session deletion currently uses `window.confirm()`, which renders a plain browser dialog that breaks the dark casino theme.

**Why:** It's jarring and inconsistent with the rest of the UI. On mobile, the native dialog is especially ugly.

**Fix:** Replace with a custom glassmorphism confirmation modal with "Delete" / "Cancel" buttons.

---

### 4. Graceful Redirects with Feedback

**What:** When a user navigates directly to `/players`, `/game`, or `/endgame` without an active session, they get silently redirected to `/new` with no explanation.

**Why:** The user has no idea why they were redirected. This is confusing, especially if they accidentally refreshed.

**Fix:** Show a brief toast notification ("No active session — start a new one") before redirecting.

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

# Subsequent deploys happen automatically on every push to main
```

- **Free tier:** Unlimited static sites, automatic HTTPS, global CDN
- **Custom domain:** Add your own domain in the Vercel dashboard
- **Auto-deploy:** Every push to `main` triggers a new deployment
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

The goal: **you (Darsh) are the primary user**, but you want to occasionally invite friends — without building a full auth system right now.

### Phase 1: Simple Passcode Lock (No Backend)

The lightest possible approach. Add a 4-6 digit PIN screen that gates the app.

**How it works:**
- On first launch, user sets a PIN (stored as a SHA-256 hash in `localStorage`)
- On every subsequent visit, the app shows a PIN entry screen before showing the dashboard
- No accounts, no server, no database — purely client-side
- Friends at the table can use the same PIN (you share it verbally)

**Pros:** Zero infrastructure, works offline, takes 30 minutes to build
**Cons:** No per-user identity, PIN is stored in the browser (can be cleared)

### Phase 2: Magic Link / OTP via Supabase Auth

When you're ready for real per-user auth without passwords.

**How it works:**
- Supabase Auth sends a one-time login link to the user's email
- User clicks the link → they're authenticated with a JWT
- Each user sees only their own sessions (row-level security in Postgres)
- You invite friends by adding their email to an allow-list

**Pros:** No passwords to manage, secure, per-user data isolation
**Cons:** Requires Supabase setup and an email for each user

### Phase 3: Google OAuth (Scale to Friends)

For when the friend group grows and everyone wants their own account.

**How it works:**
- "Sign in with Google" button on the login screen
- Supabase or Firebase handles the OAuth flow
- Each friend signs in with their Google account
- You can generate invite links or add friends by email

**Pros:** Familiar UX, no passwords, works with existing Google accounts
**Cons:** Requires OAuth configuration and a cloud auth provider

### Recommended Path

```
Now:     Phase 1 (PIN lock) — 30 min to build, immediate security
Week 2:  Phase 2 (Magic Link) — when you add Supabase for the DB anyway
Later:   Phase 3 (Google OAuth) — when friends want their own accounts
```
