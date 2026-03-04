# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ChordRain is an interactive Guitar Hero-style guitar trainer that uses a falling-note fretboard visualization. It uses Next.js 16 with static export, deployed to GitHub Pages. PR preview deployments run on Cloudflare Pages (branch `pr-<N>`) and are cleaned up automatically on PR close.

## Commands

```bash
npm run dev          # Dev server at http://localhost:3000/ChordRain
npm run build        # Production build (static export to ./out)
npm run lint         # ESLint
npm test             # Vitest unit tests (runs in watch mode)
npm test -- --run    # Vitest unit tests (single run, no watch)
npx vitest tests/unit/validation.test.ts        # Run a single unit test file
npx playwright test                              # All E2E tests (starts dev server automatically)
npx playwright test tests/e2e/navigation.spec.ts # Single E2E test
```

## Architecture

### Core Data Flow

`page.tsx` (landing + lesson) → `useGuitarAudio` hook (audio engine) → visual components (`Waterfall`, `Fretboard`, `Controls`, `EffectsCanvas`)

- **useGuitarAudio** (`src/hooks/useGuitarAudio.ts`): Central hook managing Tone.js transport, MIDI/Guitar Pro parsing, note scheduling, loop state, and seeking. Uses `requestAnimationFrame` for visual sync.
- **Waterfall** (`src/components/guitar/Waterfall.tsx`): Renders falling notes with tempo-based positioning. Uses `useMemo` for visible-note calculations.
- **Fretboard** (`src/components/guitar/Fretboard.tsx`): 22-fret horizontal guitar fretboard with correct taper geometry. Highlights active notes with per-string colors.
- **Controls** (`src/components/guitar/Controls.tsx`): Playback, speed, looping, song selector. Wrapped in `memo()`.
- **EffectsCanvas** (`src/components/guitar/EffectsCanvas.tsx`): Canvas-based VFX rendering (particles, bloom, glow).

### File Format Support

- **MIDI**: Parsed via `@tonejs/midi`. String assignment algorithm maps MIDI notes to (string, fret) pairs with hand-movement minimization (`src/lib/string-assignment.ts`).
- **Guitar Pro**: Parsed via `@coderline/alphatab` (`src/lib/guitarpro-loader.ts`). Supports .gp, .gp3, .gp4, .gp5, .gpx with technique data (bends, slides, hammer-ons, pull-offs, vibrato).

### Theme System

6 themes defined as CSS custom properties in `src/app/globals.css`. Managed by `useTheme` hook with `useSyncExternalStore` and `localStorage` persistence.

### State Management

Local `useState` for UI state, refs for mutable Tone.js references, `useSyncExternalStore` for theme. No global state library.

## Critical Configuration

- **basePath**: `/ChordRain` in `next.config.ts` — all local URLs must include this prefix
- **`NEXT_PUBLIC_BASE_PATH` env var**: overrides the basePath for asset URLs at build time. Set to `''` (empty string) in the Cloudflare Pages preview build so assets resolve from the root.
- **Static export**: `output: "export"` — no server-side features (no API routes, no SSR)
- **React Compiler**: Enabled (`reactCompiler: true`) — automatic memoization via `babel-plugin-react-compiler`. **WARNING:** The compiler generates internal dependency arrays at compile time. Code changes that alter dependency analysis (adding new variables, loops, or function calls inside effect/callback bodies) can cause: _"The final argument passed to useEffect changed size between renders."_ Safe: modifying literals/math using already-captured variables. Unsafe: adding new control flow, new `useRef` hooks, or referencing new variables inside effects.
- **VFX constants are data-driven**: All theme-specific VFX tuning lives in `src/lib/vfx-constants.ts`. Do NOT hardcode theme gates (e.g. `if (theme === '8bit')`) in the effects engine — use the config tables.
- **Guitar constants**: `NUM_STRINGS = 6`, `NUM_FRETS = 22`, `STANDARD_TUNING = [64, 59, 55, 50, 45, 40]` (E4 to E2) in `src/lib/guitar-constants.ts`.
- **Git workflow**: Never amend commits — always fix forward.
- **Path alias**: `@/*` maps to `./src/*`
- **Playwright baseURL**: `http://localhost:3000/ChordRain`

## Testing

- **Unit tests** (`tests/unit/`): Vitest with node environment
- **E2E tests** (`tests/e2e/`): Playwright, Chromium only. Auto-starts dev server.

## Conventions

- TypeScript strict mode, avoid `any`
- Functional components with React Hooks
- Tailwind CSS utility classes (v4 with `@tailwindcss/postcss`)
- Conventional commits: `feat:`, `fix:`, `style:`, `refactor:`, `chore:`, etc.
- Admin can bypass branch protection: `gh pr merge <N> --squash --delete-branch --admin`
