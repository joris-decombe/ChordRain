/**
 * String assignment: maps MIDI note numbers to guitar string + fret positions.
 *
 * A single MIDI pitch can often be played at multiple string/fret combinations.
 * The algorithm picks the most natural position based on heuristics:
 * - Prefer lower fret numbers (first position)
 * - Prefer middle strings (avoid extremes when possible)
 * - For sequences, minimize hand movement between consecutive notes
 */

import { STANDARD_TUNING, NUM_STRINGS, NUM_FRETS } from "./guitar-constants";

export interface StringFret {
  /** Guitar string number, 1 (high E) to 6 (low E). */
  string: number;
  /** Fret number, 0 (open) to 22. */
  fret: number;
}

/**
 * Get all valid (string, fret) positions for a given MIDI note.
 * Returns an empty array if the note is outside the guitar range.
 */
export function getValidPositions(
  midiNote: number,
  tuning: readonly number[] = STANDARD_TUNING
): StringFret[] {
  const positions: StringFret[] = [];

  for (let s = 0; s < NUM_STRINGS; s++) {
    const openNote = tuning[s];
    const fret = midiNote - openNote;
    if (fret >= 0 && fret <= NUM_FRETS) {
      positions.push({ string: s + 1, fret });
    }
  }

  return positions;
}

/**
 * Assign the best (string, fret) position for a single MIDI note.
 * Heuristic: prefer lower frets and middle strings.
 * Returns null if the note cannot be played in the given tuning.
 */
export function assignStringFret(
  midiNote: number,
  tuning: readonly number[] = STANDARD_TUNING
): StringFret | null {
  const positions = getValidPositions(midiNote, tuning);
  if (positions.length === 0) return null;

  // Score each position: lower fret is better, middle strings slightly preferred
  // The "middle" of 6 strings is between strings 3 and 4 (center = 3.5)
  let bestPos = positions[0];
  let bestScore = Infinity;

  for (const pos of positions) {
    const fretScore = pos.fret * 3; // Strong preference for lower frets
    const stringScore = Math.abs(pos.string - 3.5); // Mild preference for middle strings
    const score = fretScore + stringScore;

    if (score < bestScore) {
      bestScore = score;
      bestPos = pos;
    }
  }

  return bestPos;
}

/**
 * Assign string/fret positions for a sequence of notes, minimizing hand movement.
 * Uses a greedy approach: for each note, pick the position closest to the
 * previous note's fret position (with a bias toward lower frets).
 *
 * Notes should be sorted by time (ticks) before calling this.
 * Returns null entries for notes outside the guitar range.
 */
export function assignStringFretSequence(
  notes: Array<{ midi: number; ticks: number }>,
  tuning: readonly number[] = STANDARD_TUNING
): Array<StringFret | null> {
  const result: Array<StringFret | null> = [];
  let lastFret = 0; // Start assuming first position

  for (const note of notes) {
    const positions = getValidPositions(note.midi, tuning);

    if (positions.length === 0) {
      result.push(null);
      continue;
    }

    // Score: distance from last fret + lower-fret bias
    let bestPos = positions[0];
    let bestScore = Infinity;

    for (const pos of positions) {
      const distance = Math.abs(pos.fret - lastFret);
      const fretBias = pos.fret * 0.5; // Slight bias toward lower frets
      const score = distance + fretBias;

      if (score < bestScore) {
        bestScore = score;
        bestPos = pos;
      }
    }

    result.push(bestPos);
    lastFret = bestPos.fret;
  }

  return result;
}
