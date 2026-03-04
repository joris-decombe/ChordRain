/**
 * Guitar constants for standard tuning and fretboard layout.
 */

/** Number of strings on a standard guitar. */
export const NUM_STRINGS = 6;

/** Number of playable frets (0 = open, 1-22 = fretted). */
export const NUM_FRETS = 22;

/**
 * Standard tuning: MIDI note numbers for open strings.
 * String 1 (highest) = E4 (64) through String 6 (lowest) = E2 (40).
 * Index 0 = string 1 (high E), index 5 = string 6 (low E).
 */
export const STANDARD_TUNING: readonly number[] = [64, 59, 55, 50, 45, 40];

/** String labels from high to low. */
export const STRING_LABELS: readonly string[] = ["e", "B", "G", "D", "A", "E"];

/** Fret positions that have single dot markers. */
export const FRET_MARKERS = [3, 5, 7, 9, 15, 17, 19, 21] as const;

/** Fret positions that have double dot markers. */
export const DOUBLE_MARKERS = [12] as const;

/**
 * The lowest MIDI note playable in standard tuning (E2 = 40).
 */
export const MIN_MIDI_NOTE = STANDARD_TUNING[NUM_STRINGS - 1]; // 40

/**
 * The highest MIDI note playable in standard tuning (E4 + 22 frets = C#7 = 86).
 */
export const MAX_MIDI_NOTE = STANDARD_TUNING[0] + NUM_FRETS; // 86
