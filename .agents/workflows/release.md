---
description: How to develop, validate, and release changes for the poker ledger
---

# Development & Release Workflow

## 1. Make Changes on Feature Branch

```bash
git checkout p0_patch  # feature branch
```

- Implement changes in the relevant source files.
- Keep commits atomic — one logical change per commit.

## 2. Validate with E2E Tests

// turbo-all

```bash
npx vite build
npx playwright test tests/cuj.spec.js --reporter=list
```

- **Prefer Playwright E2E tests over screenshot-based browser validation.**
- Update existing tests if UI selectors or behavior changed.
- Add new test cases for new functionality.
- All tests must pass before proceeding.

## 3. Commit & Push Feature Branch

```bash
git add <files>
git commit -m "<type>: <description>"
git push origin p0_patch
```

Commit prefixes: `feat:`, `fix:`, `test:`, `chore:`, `refactor:`

## 4. Merge Feature Branch → Main Branch

```bash
git checkout p0           # main branch
git merge p0_patch --no-edit
```

## 5. Tag with Semver & Release Notes

```bash
git tag -a vX.Y.Z -m "<release notes>"
git push origin p0 && git push origin p0_patch && git push origin vX.Y.Z
```

### Versioning Rules (vX.Y.Z)

| Bump | When | Example |
|------|------|---------|
| **X** (major) | Large/systemic changes, breaking changes | v1.0.0 → v2.0.0 |
| **Y** (minor) | New features, improvements | v0.1.0 → v0.2.0 |
| **Z** (patch) | Bug fixes, small tweaks | v0.1.1 → v0.1.2 |

## Branch Convention

| Branch | Purpose |
|--------|---------|
| `p0_patch` | Feature/development branch |
| `p0` | Main/release branch |

> [!NOTE]
> If feature and main branches are unclear, **ask which is which** before proceeding.
