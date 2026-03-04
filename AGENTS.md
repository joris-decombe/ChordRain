# AGENTS.md

This file provides guidance to AI agents (like Gemini, Claude, etc.) when working with code in this repository.

## Project Overview

**ChordRain** is an interactive Guitar Hero-style guitar trainer. It provides a real-time, waterfall-style visualization of notes falling onto a horizontal 22-fret guitar fretboard, synchronized with acoustic guitar audio.

### Key Features
- **Visual Learning:** Falling-note waterfall synced with real guitar samples via Tone.js.
- **File Support:** MIDI files and Guitar Pro formats (.gp, .gp3, .gp4, .gp5, .gpx).
- **Interactivity:** Play, pause, seek, speed control (0.5x–2x), loop sections.
- **6 Themes:** 8-Bit, 16-Bit, Hi-Bit, Cool, Warm, Mono with per-theme VFX profiles.
- **Responsive Design:** Built with Tailwind CSS for various screen sizes.

## Administrator Access

The `main` branch protection is configured with `"enforce_admins": false`.

This means that while the rules (reviews, linear history, CI checks) are enforced for standard contributors, **administrators can bypass these checks** when necessary.

### Merging PRs as Admin
```bash
# Use the --admin flag to forcefully merge
gh pr merge <PR_NUMBER> --squash --delete-branch --admin
```

## Development Commands

```bash
# Start development server (http://localhost:3000/ChordRain)
npm run dev

# Build for production (Static Export)
npm run build

# Start production server
npm run start

# Lint code
npm run lint

# Unit tests
npm test

# E2E tests
npx playwright test
```

## Architecture

### Frameworks & Libraries
- **Next.js 16 (App Router):** Static export for GitHub Pages.
- **TypeScript:** Strict type safety throughout.
- **Tailwind CSS 4:** Utility-first styling with `@tailwindcss/postcss`.
- **Tone.js:** Acoustic guitar sampler and transport scheduling.
- **@tonejs/midi:** MIDI file parsing.
- **@coderline/alphatab:** Guitar Pro file parsing.
- **Framer Motion:** Smooth UI animations.

### Base Path Configuration
- The application uses `basePath: "/ChordRain"` in `next.config.ts`.
- **CRITICAL:** All local development URLs must include this prefix.
- Playwright `baseURL` must also include this prefix.

### Key Directories
- `src/app/`: Next.js App Router pages.
- `src/components/guitar/`: Guitar UI components (Fretboard, Waterfall, Controls, EffectsCanvas).
- `src/hooks/`: Custom hooks (useGuitarAudio, useTheme, useKeyboardShortcuts).
- `src/lib/`: Utility functions (audio, geometry, parsing, VFX).
- `src/types/`: TypeScript type definitions.
- `tests/unit/`: Vitest unit tests.

## CI/CD Pipeline

1. **CI (`.github/workflows/ci.yml`):** Runs on Push/PR.
   - Lints code, builds project, runs unit tests and E2E tests.

2. **Deploy (`.github/workflows/deploy.yml`):** Runs on Push to `main`.
   - Builds and deploys to GitHub Pages.

3. **Preview (`.github/workflows/preview.yml`):** Runs on PR.
   - Deploys preview to Cloudflare Pages, comments URL on PR.

4. **Release (`.github/workflows/release.yml`):** Runs on Tag `v*`.
   - Creates GitHub Release with `.zip` and `.tar.gz` archives.

## Code Style & Conventions

- **Components:** Functional components using React Hooks.
- **Styling:** Tailwind CSS utility classes. Avoid custom CSS unless necessary.
- **State:** `useState` for UI, refs for Tone.js objects. No global state library.
- **Commits:** Conventional commit messages (e.g., `feat: add speed control`, `fix: mobile layout`).
