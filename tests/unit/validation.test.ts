import { describe, it, expect } from "vitest";
import { validateSongFile, isMidiFile, isGuitarProFile } from "@/lib/validation";

describe("validation", () => {
    describe("validateSongFile", () => {
        it("accepts .mid files", () => {
            const result = validateSongFile({ name: "song.mid", size: 1000 });
            expect(result.valid).toBe(true);
        });

        it("accepts .midi files", () => {
            const result = validateSongFile({ name: "song.midi", size: 1000 });
            expect(result.valid).toBe(true);
        });

        it("accepts .gp files", () => {
            const result = validateSongFile({ name: "song.gp", size: 1000 });
            expect(result.valid).toBe(true);
        });

        it("accepts .gp5 files", () => {
            const result = validateSongFile({ name: "song.gp5", size: 1000 });
            expect(result.valid).toBe(true);
        });

        it("accepts .gpx files", () => {
            const result = validateSongFile({ name: "song.gpx", size: 1000 });
            expect(result.valid).toBe(true);
        });

        it("rejects .mp3 files", () => {
            const result = validateSongFile({ name: "song.mp3", size: 1000 });
            expect(result.valid).toBe(false);
        });

        it("rejects .xml files", () => {
            const result = validateSongFile({ name: "song.xml", size: 1000 });
            expect(result.valid).toBe(false);
        });

        it("rejects files over 10MB", () => {
            const result = validateSongFile({ name: "song.mid", size: 11 * 1024 * 1024 });
            expect(result.valid).toBe(false);
            expect(result.error).toContain("too large");
        });

        it("accepts files under 10MB", () => {
            const result = validateSongFile({ name: "song.mid", size: 9 * 1024 * 1024 });
            expect(result.valid).toBe(true);
        });

        it("is case insensitive for extensions", () => {
            expect(validateSongFile({ name: "SONG.MID", size: 1000 }).valid).toBe(true);
            expect(validateSongFile({ name: "SONG.GP5", size: 1000 }).valid).toBe(true);
        });
    });

    describe("isMidiFile", () => {
        it("identifies .mid files", () => {
            expect(isMidiFile("song.mid")).toBe(true);
        });

        it("identifies .midi files", () => {
            expect(isMidiFile("song.midi")).toBe(true);
        });

        it("rejects .gp5 files", () => {
            expect(isMidiFile("song.gp5")).toBe(false);
        });
    });

    describe("isGuitarProFile", () => {
        it("identifies .gp files", () => {
            expect(isGuitarProFile("song.gp")).toBe(true);
        });

        it("identifies .gp3 files", () => {
            expect(isGuitarProFile("song.gp3")).toBe(true);
        });

        it("identifies .gp4 files", () => {
            expect(isGuitarProFile("song.gp4")).toBe(true);
        });

        it("identifies .gp5 files", () => {
            expect(isGuitarProFile("song.gp5")).toBe(true);
        });

        it("identifies .gpx files", () => {
            expect(isGuitarProFile("song.gpx")).toBe(true);
        });

        it("rejects .mid files", () => {
            expect(isGuitarProFile("song.mid")).toBe(false);
        });
    });
});
