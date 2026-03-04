# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-05

### Added
- Initial release of ChordRain
- Guitar Hero-style waterfall note visualization for guitar
- Horizontal fretboard with 22 frets, correct taper geometry, and fret markers
- 6-string layout with per-string note colors across all themes
- Guitar acoustic audio engine (Tone.js Sampler with interpolated samples)
- MIDI file support with automatic string/fret assignment
- Guitar Pro file support (.gp, .gp3, .gp4, .gp5, .gpx) via alphatab
- String assignment algorithm: MIDI note → (string, fret) with hand-movement minimization
- Canvas VFX engine with particles, glow, bloom, and theme-specific effects
- 6 pixel art themes: 8-Bit, 16-Bit, Hi-Bit, Cool, Warm, Mono
- Playback controls: play/pause, seek, speed, looping
- File upload for custom MIDI and Guitar Pro files
- Progress tracking via localStorage
- Fullscreen mode, keyboard shortcuts, wake lock
- Static export for GitHub Pages deployment
- PR preview deployments via Cloudflare Pages
- Unit tests (Vitest) and E2E tests (Playwright)
