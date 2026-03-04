/**
 * Note color utilities for consistent color assignment across components.
 * Guitar version: colors are assigned per-string (6 strings) or unified.
 */

export interface StringColorSettings {
  useStringColors: boolean;
  unified: string;
}

const DEFAULT_SETTINGS: StringColorSettings = {
  useStringColors: true,
  unified: "#fbbf24", // Gold
};

/**
 * Get color for a note based on its guitar string number (1-6).
 * Uses CSS custom properties defined per-theme in globals.css.
 */
export function getColorByString(
  stringNumber: number,
  settings: StringColorSettings = DEFAULT_SETTINGS
): string {
  if (!settings.useStringColors) return settings.unified;
  // CSS variables --color-note-string-1 through --color-note-string-6
  return `var(--color-note-string-${Math.max(1, Math.min(6, stringNumber))})`;
}

/**
 * Get a unified color for all notes (no string distinction).
 */
export function getUnifiedColor(settings: StringColorSettings = DEFAULT_SETTINGS): string {
  return settings.unified;
}
