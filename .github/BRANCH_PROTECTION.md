# Branch Protection Setup

This document explains how to configure branch protection rules for the `main` branch of ChordRain to enforce best practices.

## Recommended Settings

Navigate to: **Settings** → **Branches** → **Add branch protection rule**

### Branch name pattern
```
main
```

### Protection Rules

#### Require a pull request before merging
- **Require approvals**: 1
- **Dismiss stale pull request approvals when new commits are pushed**: Yes

#### Require status checks to pass before merging
- **Require branches to be up to date before merging**: Yes

**Required status checks:**
- `static-checks` (from CI workflow)

#### Require conversation resolution before merging
Ensures all PR comments are addressed before merging.

#### Require linear history
Prevents merge commits, keeping the history clean and readable.

#### Do not allow bypassing the above settings
**Note:** `"enforce_admins": false` is configured.
- **Contributors**: Must follow all rules.
- **Administrators**: Can bypass rules (e.g., merge own PRs) using the `--admin` flag.

#### Restrict who can push to matching branches
Only allow PRs to merge into `main` (no direct pushes).

---

## Step-by-Step Setup

### 1. Navigate to Repository Settings

Go to: `https://github.com/joris-decombe/ChordRain/settings/branches`

### 2. Add Branch Protection Rule

Click **"Add branch protection rule"** or **"Add rule"**

### 3. Configure Pattern

- **Branch name pattern**: `main`

### 4. Enable Required Settings

```
[x] Require a pull request before merging
    [x] Require approvals (1)
    [x] Dismiss stale pull request approvals when new commits are pushed

[x] Require status checks to pass before merging
    [x] Require branches to be up to date before merging

    Search for status checks:
    [x] static-checks

[x] Require conversation resolution before merging

[x] Require linear history

[x] Do not allow bypassing the above settings

[x] Restrict who can push to matching branches
```

### 5. Save Changes

Click **"Create"** or **"Save changes"**

---

## Testing Branch Protection

After setting up, verify protection works:

### Test 1: Direct push should fail
```bash
git checkout main
echo "test" >> README.md
git commit -m "Test direct push"
git push origin main
```

**Expected**: Push rejected with message about requiring a pull request

### Test 2: PR without approval should not merge
1. Create a branch: `git checkout -b test-pr`
2. Make a change and push
3. Open PR on GitHub
4. Try to merge immediately

**Expected**: Merge button disabled until CI passes and approval received

---

## GitHub Actions Integration

The branch protection integrates with our CI workflow (`.github/workflows/ci.yml`):

### Required Checks
- `static-checks` job must pass:
  - Lint check (`npm run lint`)
  - Build check (`npm run build`)
  - Unit tests (`npm test`)
