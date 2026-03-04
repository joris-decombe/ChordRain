# Contributing to ChordRain

Thank you for your interest in contributing to this project!

## Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
# App runs at http://localhost:3000/ChordRain

# Build for production
npm run build

# Lint code
npm run lint
```

## Project Structure

```
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components (Fretboard, Waterfall, Controls)
│   ├── hooks/            # Custom hooks (useGuitarAudio, useTheme)
│   ├── lib/              # Utility functions (audio, geometry, parsing)
│   └── types/            # TypeScript type definitions
├── tests/                # Unit and E2E tests
├── public/               # Static assets (scores, samples)
└── .github/              # GitHub workflows and templates
```

## Working with Audio Files

- **MIDI files:** Parsed via `@tonejs/midi`. The string assignment algorithm maps MIDI notes to (string, fret) pairs with hand-movement minimization.
- **Guitar Pro files:** Parsed via `@coderline/alphatab` with full technique support (bends, slides, hammer-ons, pull-offs, vibrato).

When adding features that depend on file parsing, test with multiple file formats to verify compatibility.

## Pull Request Workflow

1. **Fork & Branch:** Create a feature branch from `main`.
2. **Implement:** Write clean, typed code.
3. **Test:** Ensure `npm run build` and `npm run lint` pass locally.
4. **Verify Pipelines:** Push your branch and **wait** for CI to pass. Fix any errors before opening a PR or marking it as ready.
5. **Submit:** Open a PR describing your changes. A Cloudflare Pages preview URL will be automatically posted as a comment.

## Code Style

- **TypeScript:** Use strict types. Avoid `any`.
- **Tailwind CSS:** Use utility classes. Avoid custom CSS files where possible.
- **React:** Functional components with Hooks.
- **State:** Use `useState` for UI state, refs for Tone.js audio objects.
- **Commits:** Follow conventional commit messages (e.g., `feat: add speed control`, `fix: mobile layout`).

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.
