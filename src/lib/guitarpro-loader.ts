/**
 * Guitar Pro file loader.
 *
 * Uses @coderline/alphatab to parse .gp/.gp3/.gp4/.gp5/.gpx files
 * and converts the result to a MIDI-compatible format for the audio engine
 * plus a GuitarNote[] array preserving string/fret data from the file.
 *
 * alphatab is loaded dynamically to avoid bundling its large WASM runtime
 * in the initial JS chunk.
 */

import type { GuitarNote, GuitarTrack } from "@/types/guitar";
import { NUM_STRINGS } from "@/lib/guitar-constants";

export interface GuitarProParseResult {
    /** Raw MIDI bytes (ArrayBuffer) for @tonejs/midi consumption. */
    midiBuffer: ArrayBuffer;
    /** Guitar tracks with string/fret data preserved from the GP file. */
    guitarTracks: GuitarTrack[];
    /** Song title from the GP file. */
    title: string;
    /** Artist name from the GP file. */
    artist: string;
}

/**
 * Parse a Guitar Pro file and convert it to MIDI + guitar note data.
 *
 * @param arrayBuffer The raw file bytes.
 * @returns Parsed result with MIDI buffer and guitar tracks.
 * @throws If alphatab fails to load or the file is invalid.
 */
export async function loadGuitarPro(arrayBuffer: ArrayBuffer): Promise<GuitarProParseResult> {
    // Dynamically import alphatab to avoid WASM in initial bundle
    const alphaTab = await import("@coderline/alphatab");

    const settings = new alphaTab.Settings();
    const uint8 = new Uint8Array(arrayBuffer);
    const score = alphaTab.importer.ScoreLoader.loadScoreFromBytes(uint8, settings);

    const title = score.title || "Untitled";
    const artist = score.artist || "Unknown";

    // Extract guitar notes with string/fret data from the score
    const guitarTracks: GuitarTrack[] = [];

    for (let ti = 0; ti < score.tracks.length; ti++) {
        const track = score.tracks[ti];
        const notes: GuitarNote[] = [];

        // Get tuning from the first staff (standard guitar)
        const staff = track.staves[0];
        const tuning = staff?.tuning?.length
            ? Array.from(staff.tuning).reverse() // alphatab: index 0 = lowest string; we want index 0 = highest
            : [64, 59, 55, 50, 45, 40]; // Default standard tuning

        for (let bi = 0; bi < track.staves[0]?.bars?.length; bi++) {
            const bar = track.staves[0].bars[bi];
            for (let vi = 0; vi < bar.voices.length; vi++) {
                const voice = bar.voices[vi];
                for (let bei = 0; bei < voice.beats.length; bei++) {
                    const beat = voice.beats[bei];
                    for (let ni = 0; ni < beat.notes.length; ni++) {
                        const note = beat.notes[ni];

                        // alphatab string numbering: 1 = lowest string
                        // Our convention: 1 = highest string (high E)
                        const ourString = (NUM_STRINGS + 1) - note.string;

                        notes.push({
                            midi: note.realValue,
                            name: midiToName(note.realValue),
                            ticks: Math.round(beat.absolutePlaybackStart),
                            durationTicks: Math.round(beat.playbackDuration),
                            velocity: dynamicsToVelocity(beat.dynamics),
                            string: ourString,
                            fret: note.fret,
                            track: ti,
                        });
                    }
                }
            }
        }

        guitarTracks.push({
            notes: notes.sort((a, b) => a.ticks - b.ticks),
            name: track.name || `Track ${ti + 1}`,
            tuning,
        });
    }

    // Generate MIDI buffer using alphatab's built-in MIDI export
    const midiFile = new alphaTab.midi.MidiFile();
    const handler = new alphaTab.midi.AlphaSynthMidiFileHandler(midiFile);
    const midiGenerator = new alphaTab.midi.MidiFileGenerator(score, settings, handler);
    midiGenerator.generate();

    // Filter out MIDI 2.0 NoteBend events that can't be serialized to SMF 1.0
    for (const track of midiFile.tracks) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const t = track as any;
        if (t.events && Array.isArray(t.events)) {
            t.events = t.events.filter(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (evt: any) => evt?.constructor?.name !== 'NoteBendEvent'
            );
        }
    }

    // Convert alphatab MidiFile to raw bytes
    const midiBytes = midiFile.toBinary();
    const midiBuffer = midiBytes.buffer.slice(
        midiBytes.byteOffset,
        midiBytes.byteOffset + midiBytes.byteLength
    ) as ArrayBuffer;

    return {
        midiBuffer,
        guitarTracks,
        title,
        artist,
    };
}

/** Convert alphatab DynamicValue enum to MIDI velocity (0-127). */
function dynamicsToVelocity(dynamic: number): number {
    // DynamicValue: PPP=0, PP=1, P=2, MP=3, MF=4, F=5, FF=6, FFF=7
    const map: Record<number, number> = {
        0: 15,   // PPP
        1: 33,   // PP
        2: 49,   // P
        3: 64,   // MP
        4: 80,   // MF
        5: 96,   // F
        6: 112,  // FF
        7: 127,  // FFF
    };
    return map[dynamic] ?? 80; // Default to MF
}

/** Convert MIDI note number to note name (e.g. 60 → "C4"). */
function midiToName(midi: number): string {
    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const octave = Math.floor(midi / 12) - 1;
    const note = noteNames[midi % 12];
    return `${note}${octave}`;
}
