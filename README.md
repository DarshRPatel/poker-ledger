# ♠ Poker Ledger

A mobile-first web app to track live poker game sessions — buy-ins, chip counts, settlements, and an all-time leaderboard — backed by Supabase Cloud Database with a robust offline-first localStorage fallback.

## Features

- **Session Setup** — Configure buy-in amount (₹), chips per buy-in, and auto-calculated ratio
- **Player Management** — Add up to 10 players, assign custom buy-in counts, add players mid-game
- **Live Game Tracking** — Real-time pot tracker, elapsed timer, and per-player buy-in management
- **End-Game Reconciliation** — Enter each player's remaining chips with live validation against the expected pot total
- **Results & Leaderboard** — Automatic P&L calculation, ranked leaderboard, and min-transaction settlement suggestions (who pays whom)
- **Session History** — Browse and revisit past completed sessions from the home dashboard
- **All-Time Leaderboard** — Aggregated stats across all saved sessions
- **Adjustable Duration** — Choose from presets or enter a custom game duration on the results screen
- **Progressive Web App (PWA)** — Installable on mobile devices with a standalone display mode, custom home screen icons, and offline asset caching
- **Offline-First with Cloud Sync** — Syncs sessions to a cloud database with automatic, transparent fallback to browser `localStorage` if offline or when running local tests.


## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [React 19](https://react.dev/) |
| Build Tool | [Vite 8](https://vite.dev/) |
| Routing | [React Router v7](https://reactrouter.com/) |
| State Management | React Context + `useReducer` |
| Persistence | [Supabase](https://supabase.com/) (PostgreSQL) with `localStorage` fallback |
| Styling | Vanilla CSS (dark casino theme, glassmorphism, micro-animations) |
| Unit / Integration Testing | [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/react) |
| E2E Testing | [Playwright](https://playwright.dev/) |

## Project Structure

```
poker-ledger/
├── public/
│   └── favicon.svg
├── src/
│   ├── main.jsx                  # App entry point
│   ├── App.jsx                   # Router + GameContext provider
│   ├── index.css                 # Design system (tokens, themes, animations)
│   ├── setupTests.js             # Vitest setup (jest-dom matchers)
│   ├── context/
│   │   ├── GameContext.jsx        # Session state (useReducer + Context)
│   │   └── GameContext.test.jsx   # Integration tests
│   ├── services/
│   │   └── storage.js            # localStorage CRUD for sessions
│   ├── utils/
│   │   ├── settlement.js         # Min-transaction settlement algorithm
│   │   └── settlement.test.js    # Unit tests
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── PlayerCard.jsx
│   │   └── PotSummary.jsx
│   └── views/
│       ├── Home.jsx              # Dashboard: history + leaderboard
│       ├── NewSession.jsx        # Buy-in config
│       ├── PlayerEntry.jsx       # Add players
│       ├── BuyInSummary.jsx      # Review before starting
│       ├── ActiveGame.jsx        # Live game tracker
│       ├── EndGame.jsx           # Enter remaining chips
│       ├── SessionResults.jsx    # P&L, settlements, save
│       └── SessionDetail.jsx     # View past session (read-only)
├── tests/
│   └── cuj.spec.js               # Playwright E2E Golden Path CUJ
├── vite.config.js
├── playwright.config.js
└── package.json
```

## Screens

The app flows through 8 screens, each handling a distinct phase of a poker session:

| # | Screen | Route | Purpose |
|---|--------|-------|---------|
| 1 | **Home** | `/` | Dashboard showing the "New Session" CTA, all-time leaderboard (aggregated across all saved sessions), and a list of past sessions with pot, player count, and duration |
| 2 | **New Session** | `/new` | Configure the buy-in amount (₹), chips per buy-in, and view the auto-calculated ratio (e.g. ₹1 = 5 chips) before proceeding |
| 3 | **Player Entry** | `/players` | Add up to 10 players by name — each starts with 1 buy-in by default, with an advanced toggle to set custom buy-in counts per player |
| 4 | **Buy-in Summary** | `/summary` | Review table of all players with their buy-ins, chip totals, and ₹ value before locking in and starting the game |
| 5 | **Active Game** | `/game` | Live game view with an elapsed timer, real-time pot tracker (chips + ₹), per-player buy-in buttons, and the ability to add new players mid-game |
| 6 | **End Game** | `/endgame` | Enter each player's remaining chip count with live validation — shows ✅ when the entered total matches the expected pot, or ❌ with the exact difference |
| 7 | **Session Results** | `/results` | Final summary with a ranked P&L leaderboard, min-transaction settlement suggestions (who pays whom), adjustable duration, and a save button |
| 8 | **Session Detail** | `/session/:id` | Read-only view of any previously saved session, showing the same leaderboard and settlement data from when the game was completed |

### User Flow

```
Home → New Session → Player Entry → Buy-in Summary → Active Game → End Game → Results → Home
                                                          ↑                        ↓
                                                          └── Back to Game ←───────┘
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- npm (bundled with Node.js)

### Install Dependencies

```bash
npm install
```

### Database Setup (Supabase)

To enable cloud storage and sync features:
1. Create a Supabase project at [supabase.com](https://supabase.com/).
2. Run the SQL migration script (found in the active implementation plan or `supabase` setup) inside the SQL Editor of your Supabase dashboard to create the `sessions` table.
3. Create a `.env` file in the project root based on `.env.example`:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
   *If these variables are missing, the application will automatically fall back to full `localStorage` mode.*

### Start the Dev Server

```bash
npm run dev
```

The app will be available at **http://localhost:5173**.

### Build for Production

```bash
npm run build
npm run preview    # preview the production build locally
```

## Testing

The project has three testing layers to ensure robustness:

### Unit Tests (Vitest)

Tests for the core settlement algorithm — verifies the min-transaction "who pays whom" logic across multiple scenarios including 1-to-1 transfers, multi-winner/loser combos, and fractional rounding edge cases.

```bash
npm test
```

**6 tests** in `src/utils/settlement.test.js`

### Integration Tests (Vitest)

Tests for the `GameContext` state management — verifies session initialization, player addition, chip and pot calculations through the React Context provider.

```bash
npm test
```

**2 tests** in `src/context/GameContext.test.jsx`

### End-to-End Tests (Playwright)

Automated Critical User Journey (CUJ) that drives a real Chromium browser through the entire game lifecycle:

1. Start a new session with ₹100 buy-in / 500 chips
2. Add 3 players
3. Review buy-in summary
4. Add a mid-game buy-in
5. End game and enter remaining chips
6. Verify P&L leaderboard and settlement calculations
7. Save the session and confirm it appears in history

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
npx playwright test

# Run with headed browser (visible UI)
npx playwright test --headed

# View the HTML test report
npx playwright show-report
```

**1 CUJ test** in `tests/cuj.spec.js` — runs in ~8 seconds

### Run All Tests

```bash
# Unit + Integration
npm test

# E2E (auto-starts dev server)
npx playwright test
```

## Development & Deployment

For detailed guidelines, branch conventions, and testing checklists, see [DEVELOPMENT.md](DEVELOPMENT.md).

### Quick Summary:
- **Production Branch:** `p0` (deploys automatically to Vercel).
- **Feature Branches:** Always develop on descriptive branches cloned from `p0` (e.g. `feature/<feature-name>`).
- **Deploying to Production:** Merge the feature branch into `p0` and push to remote *only* after all tests pass and when the user commands **"push to production"**.

## Design

- **Theme:** Dark casino — deep blacks, gold accents, emerald green highlights
- **Typography:** Google Sans
- **Layout:** Mobile-first (max-width 480px primary), responsive up to desktop
- **Cards:** Glassmorphism with subtle border glow and hover effects
- **Animations:** Fade-in, slide-up, stagger-children micro-animations
- **Icons:** Emoji-based suit icons (♠ ♥ ♦ ♣) with textured CSS styling

## License

Private project.
