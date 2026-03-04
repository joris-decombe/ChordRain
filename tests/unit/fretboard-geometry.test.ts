import { describe, it, expect } from "vitest";
import {
    getFretX,
    getFretCenterX,
    getFretWidth,
    getStringY,
    getNotePosition,
    getTotalFretboardWidth,
    getTotalFretboardHeight,
    getLeftPadding,
    getStringSpacing,
} from "@/lib/fretboard-geometry";
import { NUM_STRINGS, NUM_FRETS } from "@/lib/guitar-constants";

describe("fretboard-geometry", () => {
    describe("getFretX", () => {
        it("returns the nut position for fret 0", () => {
            expect(getFretX(0)).toBe(getLeftPadding());
        });

        it("returns increasing positions for higher frets", () => {
            for (let f = 1; f <= NUM_FRETS; f++) {
                expect(getFretX(f)).toBeGreaterThan(getFretX(f - 1));
            }
        });

        it("frets get closer together (narrower) toward the body", () => {
            for (let f = 2; f <= NUM_FRETS; f++) {
                const widthPrev = getFretX(f - 1) - getFretX(f - 2);
                const widthCurrent = getFretX(f) - getFretX(f - 1);
                expect(widthCurrent).toBeLessThan(widthPrev);
            }
        });
    });

    describe("getFretCenterX", () => {
        it("open string (fret 0) center is left of fret 1", () => {
            expect(getFretCenterX(0)).toBeLessThan(getFretX(1));
        });

        it("center of a fret is between its boundaries", () => {
            for (let f = 1; f <= NUM_FRETS; f++) {
                const center = getFretCenterX(f);
                expect(center).toBeGreaterThan(getFretX(f - 1));
                expect(center).toBeLessThan(getFretX(f));
            }
        });
    });

    describe("getFretWidth", () => {
        it("returns positive widths for all frets", () => {
            for (let f = 0; f <= NUM_FRETS; f++) {
                expect(getFretWidth(f)).toBeGreaterThan(0);
            }
        });

        it("fret width generally decreases for higher frets", () => {
            const width1 = getFretWidth(1);
            const width20 = getFretWidth(20);
            expect(width20).toBeLessThan(width1);
        });
    });

    describe("getStringY", () => {
        it("returns distinct Y positions for all strings", () => {
            const positions = new Set<number>();
            for (let s = 1; s <= NUM_STRINGS; s++) {
                positions.add(getStringY(s));
            }
            expect(positions.size).toBe(NUM_STRINGS);
        });

        it("lower strings (higher numbers) have higher Y values", () => {
            for (let s = 2; s <= NUM_STRINGS; s++) {
                expect(getStringY(s)).toBeGreaterThan(getStringY(s - 1));
            }
        });

        it("spacing between strings is consistent", () => {
            const spacing = getStringSpacing();
            for (let s = 2; s <= NUM_STRINGS; s++) {
                expect(getStringY(s) - getStringY(s - 1)).toBeCloseTo(spacing, 0);
            }
        });
    });

    describe("getNotePosition", () => {
        it("returns x, y, and width", () => {
            const pos = getNotePosition(1, 5);
            expect(pos).toHaveProperty("x");
            expect(pos).toHaveProperty("y");
            expect(pos).toHaveProperty("width");
        });

        it("x is the left edge of the note block (centerX - width/2)", () => {
            for (let f = 0; f <= 10; f++) {
                const pos = getNotePosition(3, f);
                const expectedX = getFretCenterX(f) - getFretWidth(f) / 2;
                expect(pos.x).toBeCloseTo(expectedX, 5);
            }
        });

        it("y is the top edge of the note block (centered on string)", () => {
            for (let s = 1; s <= NUM_STRINGS; s++) {
                const pos = getNotePosition(s, 5);
                // y should be centered on the string position
                const centerY = pos.y + pos.height / 2;
                expect(centerY).toBeCloseTo(getStringY(s), 5);
            }
        });
    });

    describe("dimensions", () => {
        it("total width is positive", () => {
            expect(getTotalFretboardWidth()).toBeGreaterThan(0);
        });

        it("total height accommodates all strings", () => {
            const height = getTotalFretboardHeight();
            expect(height).toBeGreaterThan(getStringY(NUM_STRINGS));
        });
    });
});
