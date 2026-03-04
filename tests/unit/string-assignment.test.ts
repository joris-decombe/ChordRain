import { describe, it, expect } from "vitest";
import {
    getValidPositions,
    assignStringFret,
    assignStringFretSequence,
} from "@/lib/string-assignment";
import { STANDARD_TUNING, MIN_MIDI_NOTE, MAX_MIDI_NOTE, NUM_FRETS } from "@/lib/guitar-constants";

describe("string-assignment", () => {
    describe("getValidPositions", () => {
        it("returns at least one position for open low E (40)", () => {
            const positions = getValidPositions(40);
            expect(positions.length).toBeGreaterThanOrEqual(1);
            // Should include string 6 fret 0
            expect(positions.some(p => p.string === 6 && p.fret === 0)).toBe(true);
        });

        it("returns at least one position for open high E (64)", () => {
            const positions = getValidPositions(64);
            expect(positions.length).toBeGreaterThanOrEqual(1);
            // Should include string 1 fret 0
            expect(positions.some(p => p.string === 1 && p.fret === 0)).toBe(true);
        });

        it("returns empty for notes below guitar range", () => {
            const positions = getValidPositions(30); // Well below E2
            expect(positions.length).toBe(0);
        });

        it("all positions have valid string and fret numbers", () => {
            for (let midi = MIN_MIDI_NOTE; midi <= MAX_MIDI_NOTE; midi++) {
                const positions = getValidPositions(midi);
                for (const p of positions) {
                    expect(p.string).toBeGreaterThanOrEqual(1);
                    expect(p.string).toBeLessThanOrEqual(6);
                    expect(p.fret).toBeGreaterThanOrEqual(0);
                    expect(p.fret).toBeLessThanOrEqual(NUM_FRETS);
                }
            }
        });

        it("all positions resolve back to correct MIDI note", () => {
            for (let midi = MIN_MIDI_NOTE; midi <= MAX_MIDI_NOTE; midi++) {
                const positions = getValidPositions(midi);
                for (const p of positions) {
                    const expected = STANDARD_TUNING[p.string - 1] + p.fret;
                    expect(expected).toBe(midi);
                }
            }
        });
    });

    describe("assignStringFret", () => {
        it("assigns open low E to string 6 fret 0", () => {
            const result = assignStringFret(40);
            expect(result).toBeDefined();
            expect(result!.string).toBe(6);
            expect(result!.fret).toBe(0);
        });

        it("assigns open high E to string 1 fret 0", () => {
            const result = assignStringFret(64);
            expect(result).toBeDefined();
            expect(result!.string).toBe(1);
            expect(result!.fret).toBe(0);
        });

        it("returns null for notes outside guitar range", () => {
            expect(assignStringFret(30)).toBeNull();
        });

        it("prefers lower frets", () => {
            // Middle C (60) can be played on string 2 fret 1 or string 1 fret something
            const result = assignStringFret(60);
            expect(result).toBeDefined();
            expect(result!.fret).toBeLessThanOrEqual(5); // Should prefer low fret
        });

        it("returns valid assignments for all guitar-range notes", () => {
            for (let midi = MIN_MIDI_NOTE; midi <= MAX_MIDI_NOTE; midi++) {
                const result = assignStringFret(midi);
                expect(result).toBeDefined();
                expect(result!.string).toBeGreaterThanOrEqual(1);
                expect(result!.string).toBeLessThanOrEqual(6);
                expect(result!.fret).toBeGreaterThanOrEqual(0);
            }
        });
    });

    describe("assignStringFretSequence", () => {
        it("assigns positions to a sequence of notes", () => {
            const notes = [
                { midi: 40, ticks: 0 },    // E2
                { midi: 45, ticks: 480 },   // A2
                { midi: 50, ticks: 960 },   // D3
                { midi: 55, ticks: 1440 },  // G3
                { midi: 59, ticks: 1920 },  // B3
                { midi: 64, ticks: 2400 },  // E4
            ];
            const result = assignStringFretSequence(notes);
            expect(result.length).toBe(6);

            // Open strings ascending: each should be on a different string
            const strings = new Set(result.map(r => r.string));
            expect(strings.size).toBe(6);
        });

        it("skips notes outside guitar range", () => {
            const notes = [
                { midi: 30, ticks: 0 },    // Too low
                { midi: 40, ticks: 480 },   // E2 - valid
            ];
            const result = assignStringFretSequence(notes);
            // First note should still be assigned (null positions are filtered)
            expect(result.length).toBe(2);
        });

        it("handles empty input", () => {
            const result = assignStringFretSequence([]);
            expect(result).toEqual([]);
        });
    });
});
