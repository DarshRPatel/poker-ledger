---
description: How to develop, validate, and release changes for the poker ledger
---

# Development & Release Workflow

This workflow guide enforces the branching, testing, and deployment rules for the Poker Ledger application.

## 1. Make Changes on Feature Branch

1.  **Checkout and pull latest `p0`:**
    ```bash
    git checkout p0
    git pull origin p0
    ```
2.  **Create and switch to a descriptive feature branch:**
    ```bash
    git checkout -b <feature-name>
    ```
3.  **Implement changes:** Keep commits atomic and clean.

## 2. Validate with Tests

Verify that everything is green before seeking approval:

```bash
# Verify production build succeeds
npm run build

# Run unit and integration tests
npm test

# Run E2E tests
npx playwright test
```

- **Prefer Playwright E2E tests over manual screenshot-based validation.**
- Update existing tests if UI selectors or behaviors changed.
- Add new test cases for new functionality.
- All tests must pass before proceeding.

## 3. Request User Validation

- Present the changes to the user for validation.
- Highlight features, test results, or screenshots.

## 4. Merge & Push to Production

Only perform these steps when the user explicitly commands: **"push to production"**.

```bash
# Checkout main branch and update
git checkout p0
git pull origin p0

# Merge feature branch
git merge <feature-name> --no-edit

# Push to trigger Vercel deployment
git push origin p0
```
