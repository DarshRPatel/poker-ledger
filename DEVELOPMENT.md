# Development Workflow & Rules

This document outlines the branching strategy, testing guidelines, and deployment workflow for the Poker Ledger application. All contributors and AI agents must follow these rules.

---

## 1. Branching Strategy

The production-ready branch is `p0`. Direct commits to `p0` are strictly prohibited. All development must occur on feature-specific branches.

*   **Production Branch:** `p0` (connected to Vercel for automatic deployment)
*   **Feature Branches:** Cloned directly from `p0` and named descriptively after the feature, e.g., `feature/add-rebuys` or `feature/custom-themes`.

### Git Command Flow:
1.  **Switch to `p0` and update:**
    ```bash
    git checkout p0
    git pull origin p0
    ```
2.  **Create a feature branch:**
    ```bash
    git checkout -b <feature-name>
    ```
3.  **Work and Commit:** Make atomic commits on `<feature-name>`.

---

## 2. Validation & Quality Gates

Before declaring a feature ready, it must be thoroughly validated. Do not skip any of these gates.

### Checklist:
- [ ] **Production Build:** Verify that the project builds without warnings or errors:
    ```bash
    npm run build
    ```
- [ ] **Unit & Integration Tests:** Run the Vitest test suite:
    ```bash
    npm test
    ```
- [ ] **E2E Tests:** Run Playwright End-to-End tests to verify the critical user journeys (CUJ):
    ```bash
    npx playwright test
    ```

---

## 3. Deployment Workflow (Pushing to Production)

Deployments are automated via Vercel, which triggers automatically whenever changes are pushed to `p0`.

### Merge & Release Flow:
1.  **Feature Completion:** Ensure the feature branch is fully tested, committed, and pushed.
2.  **User Verification:** Present the changes to the user for validation.
3.  **Deploy Command:** Wait for the user to explicitly say **"push to production"**.
4.  **Merge to `p0`:** Once authorized, checkout `p0`, pull the latest changes, merge the feature branch, and push to origin:
    ```bash
    git checkout p0
    git pull origin p0
    git merge <feature-name> --no-edit
    ```
5.  **Push to Production:**
    ```bash
    git push origin p0
    ```
    *Vercel will handle the deployment automatically upon detecting the push to `p0`.*
