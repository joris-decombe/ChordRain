export const BASE_FRETBOARD_WIDTH = 1200;

/**
 * Logic for calculating the scale factor of the fretboard
 * to fit within the available screen width.
 */
export function calculateFretboardScale(windowWidth: number, baseFretboardWidth: number = BASE_FRETBOARD_WIDTH): number {
  if (windowWidth < baseFretboardWidth) {
    return windowWidth / baseFretboardWidth;
  }
  return 1;
}

/**
 * Ensures a playback rate is within reasonable bounds.
 */
export function validatePlaybackRate(rate: number): number {
  return Math.min(Math.max(rate, 0.1), 2.0);
}
