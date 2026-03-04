/**
 * Core guitar types used across the application.
 */

/** A single guitar note with string/fret positioning and timing. */
export interface GuitarNote {
  /** MIDI note number (40-86 in standard tuning). */
  midi: number;
  /** Note name (e.g. "C4", "E2"). */
  name: string;
  /** Start position in ticks. */
  ticks: number;
  /** Duration in ticks. */
  durationTicks: number;
  /** Velocity (0-127). */
  velocity: number;
  /** Guitar string number, 1 (high E) to 6 (low E). */
  string: number;
  /** Fret number, 0 (open) to 22. */
  fret: number;
  /** Track index (for multi-track files). */
  track: number;
  /** Guitar Pro technique, if available. */
  technique?: "bend" | "slide" | "hammer-on" | "pull-off" | "vibrato";
}

/** A guitar track containing notes and tuning information. */
export interface GuitarTrack {
  /** All notes in this track. */
  notes: GuitarNote[];
  /** Track name (from the file). */
  name: string;
  /** Tuning as MIDI note numbers for each open string (index 0 = string 1 = high E). */
  tuning: readonly number[];
}

/** Active note state passed to visual components during playback. */
export interface ActiveGuitarNote {
  /** Note name (e.g. "C4"). */
  note: string;
  /** MIDI note number. */
  midi: number;
  /** Guitar string number, 1-6. */
  string: number;
  /** Fret number, 0-22. */
  fret: number;
  /** Track index. */
  track: number;
  /** Velocity (0-127). */
  velocity: number;
  /** Start tick (used as unique ID for VFX). */
  startTick: number;
  /** CSS color string for this note. */
  color: string;
}

/** Song source descriptor for the audio engine. */
export interface SongSource {
  /** URL to the song file, or undefined for user-uploaded files. */
  url?: string;
  /** File type. */
  type: "midi" | "guitarPro";
  /** Display name. */
  name: string;
}
