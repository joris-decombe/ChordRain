# Release Process

This document describes how to create and publish releases for ChordRain.

## Versioning

We follow [Semantic Versioning](https://semver.org/):

- **Major** (X.0.0): Breaking changes, major architectural updates
- **Minor** (0.X.0): New features, backwards compatible
- **Patch** (0.0.X): Bug fixes, small improvements

## Release Workflow

### 1. Prepare Release Branch

```bash
# Ensure main is up to date
git checkout main
git pull origin main

# Create release branch
git checkout -b release/v0.1.0
```

### 2. Update Version Numbers

Update version in the following files:

**package.json**
```json
{
  "version": "0.1.0"
}
```

### 3. Update Documentation

- Ensure `README.md` is up to date.
- Update `CHANGELOG.md` with the new version's changes.

### 4. Commit Version Bump

```bash
git add package.json CHANGELOG.md
git commit -m "Bump version to 0.1.0"
git push origin release/v0.1.0
```

### 5. Create Pull Request

1. Open PR from `release/v0.1.0` to `main`
2. Title: "Release v0.1.0"
3. Wait for CI to pass (lint/build/tests)
4. Merge PR

### 6. Create Git Tag & Release

```bash
# After PR is merged to main
git checkout main
git pull origin main

# Create annotated tag
git tag -a v0.1.0 -m "Release version 0.1.0"
git push origin v0.1.0
```

Use the GitHub CLI to create the release with assets:

```bash
gh release create v0.1.0 --generate-notes
```

---

## Release Checklist

Before creating a release, verify:

### Code Quality
- [ ] All CI checks pass (`npm run lint`, `npm run build`)
- [ ] Unit tests pass (`npm test`)

### Documentation
- [ ] README.md reflects current features
- [ ] CHANGELOG.md updated with new version
- [ ] Version number updated in `package.json`

### Testing
- [ ] Verified playback of MIDI files
- [ ] Verified Guitar Pro file loading
- [ ] Tested visual themes
- [ ] Verified on mobile/tablet (responsive check)
