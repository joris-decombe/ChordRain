/**
 * Fretboard geometry: pre-computed positions for frets, strings, and note blocks.
 * Replaces the piano keyboard geometry.ts.
 *
 * Fret spacing follows the 12th-root-of-2 rule: each successive fret is at
 * position = scaleLength * (1 - 1/2^(n/12)) from the nut.
 */

import { NUM_STRINGS, NUM_FRETS } from "./guitar-constants";

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

/** Total pixel width of the fretboard (nut to last fret). */
const FRETBOARD_PLAYABLE_WIDTH = 1100;

/** Padding before the nut (for string labels). */
const LEFT_PADDING = 60;

/** Padding after the last fret. */
const RIGHT_PADDING = 40;

/** Vertical spacing between string centers. */
const STRING_SPACING = 36;

/** Top padding above string 1 (high E). */
const TOP_PADDING = 20;

/** Total fretboard width including padding. */
export const TOTAL_FRETBOARD_WIDTH = LEFT_PADDING + FRETBOARD_PLAYABLE_WIDTH + RIGHT_PADDING;

/** Total fretboard height including padding. */
export const TOTAL_FRETBOARD_HEIGHT = TOP_PADDING + (NUM_STRINGS - 1) * STRING_SPACING + TOP_PADDING;

// ---------------------------------------------------------------------------
// Pre-computed fret X positions
// ---------------------------------------------------------------------------

/**
 * Pre-computed X positions for each fret wire (0 = nut, 1..NUM_FRETS = fret wires).
 * Uses the 12th-root-of-2 rule scaled to FRETBOARD_PLAYABLE_WIDTH.
 */
const FRET_POSITIONS: number[] = [];

// The 12th root of 2 determines the ratio between fret positions
// Position of fret n from nut = scaleLength * (1 - 1/2^(n/12))
// We scale this so fret NUM_FRETS maps to FRETBOARD_PLAYABLE_WIDTH
const maxFretRatio = 1 - Math.pow(2, -NUM_FRETS / 12);

for (let i = 0; i <= NUM_FRETS; i++) {
  const ratio = 1 - Math.pow(2, -i / 12);
  FRET_POSITIONS.push(LEFT_PADDING + (ratio / maxFretRatio) * FRETBOARD_PLAYABLE_WIDTH);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the X position of a fret wire.
 * Fret 0 = the nut position.
 */
export function getFretX(fret: number): number {
  if (fret < 0 || fret > NUM_FRETS) return FRET_POSITIONS[0];
  return FRET_POSITIONS[fret];
}

/**
 * Get the X center of a fret span (the playable area between fret n-1 and fret n).
 * For fret 0 (open string), returns the nut position.
 */
export function getFretCenterX(fret: number): number {
  if (fret <= 0) return FRET_POSITIONS[0] - 15; // Open string indicator left of nut
  const left = FRET_POSITIONS[fret - 1];
  const right = FRET_POSITIONS[fret];
  return (left + right) / 2;
}

/**
 * Get the width of a fret span (distance between fret n-1 and fret n).
 * For fret 0, returns a fixed width for the "open string" indicator.
 */
export function getFretWidth(fret: number): number {
  if (fret <= 0) return 32; // Fixed width for open string indicator
  return FRET_POSITIONS[fret] - FRET_POSITIONS[fret - 1];
}

/**
 * Get the Y center of a string.
 * String 1 (high E) is at the top, string 6 (low E) at the bottom.
 */
export function getStringY(stringNumber: number): number {
  const idx = Math.max(0, Math.min(NUM_STRINGS - 1, stringNumber - 1));
  return TOP_PADDING + idx * STRING_SPACING;
}

/**
 * Get the bounding box for a note at a given string + fret.
 * Returns { x, y, width, height } suitable for positioning a note block.
 */
export function getNotePosition(stringNumber: number, fret: number): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const centerX = getFretCenterX(fret);
  const width = getFretWidth(fret);
  const centerY = getStringY(stringNumber);
  const height = Math.min(STRING_SPACING * 0.7, 28);

  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  };
}

/**
 * Get total fretboard width (for canvas sizing).
 */
export function getTotalFretboardWidth(): number {
  return TOTAL_FRETBOARD_WIDTH;
}

/**
 * Get total fretboard height (for canvas sizing).
 */
export function getTotalFretboardHeight(): number {
  return TOTAL_FRETBOARD_HEIGHT;
}

/**
 * Get left padding (for aligning waterfall lanes with fretboard).
 */
export function getLeftPadding(): number {
  return LEFT_PADDING;
}

/**
 * Get the string spacing (for aligning waterfall lanes).
 */
export function getStringSpacing(): number {
  return STRING_SPACING;
}

/**
 * Get the top padding (for aligning waterfall lanes).
 */
export function getTopPadding(): number {
  return TOP_PADDING;
}
