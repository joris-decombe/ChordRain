"use client";

import { useMemo } from "react";
import { Midi } from "@tonejs/midi";
import { twMerge } from "tailwind-merge";
import {
    getFretCenterX,
    getFretWidth,
    getTotalFretboardWidth,
} from "@/lib/fretboard-geometry";
import { assignStringFret } from "@/lib/string-assignment";
import { NUM_STRINGS } from "@/lib/guitar-constants";

interface WaterfallProps {
    midi: Midi | null;
    currentTick: number;
    playbackRate?: number;
    isPlaying?: boolean;
    lookAheadTicks?: number;
    showGrid?: boolean;
    containerHeight: number;
}

interface PreparedNote {
    ticks: number;
    durationTicks: number;
    midi: number;
    name: string;
    string: number;
    fret: number;
    color: string;
}

export function Waterfall({
    midi,
    currentTick,
    isPlaying = false,
    lookAheadTicks = 0,
    showGrid = true,
    containerHeight,
}: WaterfallProps) {
    const totalWidth = getTotalFretboardWidth();
    const laneHeight = containerHeight / NUM_STRINGS;

    // Pre-process all notes with string/fret assignments
    const { allNotes, maxDuration } = useMemo(() => {
        if (!midi) return { allNotes: [] as PreparedNote[], maxDuration: 0 };
        const notes: PreparedNote[] = [];
        let maxDur = 0;

        midi.tracks.forEach((track) => {
            if (track.notes.length === 0 || track.instrument.percussion) return;

            track.notes.forEach(note => {
                if (note.durationTicks > maxDur) maxDur = note.durationTicks;

                const sf = assignStringFret(note.midi);
                if (!sf) return; // Skip notes outside guitar range

                notes.push({
                    ticks: note.ticks,
                    durationTicks: note.durationTicks,
                    midi: note.midi,
                    name: note.name,
                    string: sf.string,
                    fret: sf.fret,
                    color: `var(--color-note-string-${sf.string})`,
                });
            });
        });

        return {
            allNotes: notes.sort((a, b) => a.ticks - b.ticks),
            maxDuration: maxDur,
        };
    }, [midi]);

    // Compute visible notes using binary search windowing
    const visibleNotes = useMemo(() => {
        if (!midi || allNotes.length === 0) return [];

        const PPQ = midi.header.ppq;
        const windowSizeTicks = (lookAheadTicks && lookAheadTicks > 0) ? lookAheadTicks : 6 * PPQ;
        const endTime = currentTick + windowSizeTicks;

        // Binary search for first note at or after currentTick
        let startIdx = 0;
        let leftIdx = 0;
        let rightIdx = allNotes.length - 1;

        while (leftIdx <= rightIdx) {
            const mid = Math.floor((leftIdx + rightIdx) / 2);
            if (allNotes[mid].ticks < currentTick) {
                leftIdx = mid + 1;
            } else {
                startIdx = mid;
                rightIdx = mid - 1;
            }
        }

        // Walk backwards to include notes that started before currentTick but are still sounding
        let renderStartIdx = startIdx;
        while (renderStartIdx > 0 && allNotes[renderStartIdx - 1].ticks > currentTick - maxDuration) {
            renderStartIdx--;
        }

        const active: {
            id: string;
            x: number;
            width: number;
            lane: number;
            bottom: number;
            height: number;
            fret: number;
            color: string;
            proximity: number;
            isActive: boolean;
        }[] = [];

        for (let i = renderStartIdx; i < allNotes.length; i++) {
            const note = allNotes[i];
            if (note.ticks > endTime) break;

            if (note.ticks + note.durationTicks > currentTick) {
                // Vertical position within the waterfall
                const bottomPx = Math.round(((note.ticks - currentTick) / windowSizeTicks) * containerHeight);
                const heightPx = Math.max(4, Math.round((note.durationTicks / windowSizeTicks) * containerHeight));

                // Horizontal position based on fret
                const centerX = getFretCenterX(note.fret);
                const fretWidth = getFretWidth(note.fret);
                const noteWidth = Math.max(8, fretWidth - 4);

                // String lane (0-indexed)
                const lane = note.string - 1;

                // Proximity to fretboard (bottom of waterfall)
                const proximity = containerHeight > 0
                    ? Math.max(0, Math.min(1, 1 - bottomPx / containerHeight))
                    : 0;

                active.push({
                    id: `${note.name}-${note.ticks}-${i}`,
                    x: centerX - noteWidth / 2,
                    width: noteWidth,
                    lane,
                    bottom: bottomPx,
                    height: heightPx,
                    fret: note.fret,
                    color: note.color,
                    proximity,
                    isActive: bottomPx <= 0,
                });
            }
        }
        return active;
    }, [midi, currentTick, allNotes, maxDuration, lookAheadTicks, containerHeight]);

    return (
        <div
            className="absolute inset-0 overflow-hidden pointer-events-none bg-background transition-colors duration-500"
            style={{ width: `${totalWidth}px` }}
            data-playing={isPlaying}
        >
            {/* Background layers */}
            <div className="waterfall-layer-sky" />

            <div
                className="waterfall-layer-macro animate-scroll"
                style={{
                    '--scroll-size': '128px',
                    '--scroll-duration': `calc(40s / var(--playback-rate, 1))`
                } as React.CSSProperties}
            />

            <div className="waterfall-fog-1" />

            <div
                className="waterfall-layer-mid animate-scroll"
                style={{
                    '--scroll-size': '64px',
                    '--scroll-duration': `calc(10s / var(--playback-rate, 1))`
                } as React.CSSProperties}
            />

            <div className="waterfall-fog-2" />

            <div
                className="waterfall-grid-bg animate-scroll z-4"
                style={{
                    '--scroll-size': '32px',
                    '--scroll-duration': `calc(4s / var(--playback-rate, 1))`
                } as React.CSSProperties}
            />

            {/* Lane backgrounds with per-string color */}
            {showGrid && Array.from({ length: NUM_STRINGS }, (_, i) => {
                const y = containerHeight - ((i + 1) * laneHeight);
                return (
                    <div
                        key={`lane-bg-${i}`}
                        className="waterfall-lane-bg"
                        style={{
                            top: `${y}px`,
                            height: `${laneHeight}px`,
                            backgroundColor: `var(--color-note-string-${i + 1})`,
                        }}
                    />
                );
            })}

            {/* String lane dividers */}
            {showGrid && Array.from({ length: NUM_STRINGS - 1 }, (_, i) => {
                const y = (i + 1) * laneHeight;
                return (
                    <div
                        key={`lane-${i}`}
                        className="absolute left-0 right-0 h-[1px] pointer-events-none z-5"
                        style={{
                            top: `${containerHeight - y}px`,
                            backgroundImage: 'linear-gradient(to right, var(--color-grid-line, var(--color-border)) 50%, transparent 50%)',
                            backgroundSize: '8px 1px',
                            opacity: 0.2,
                        }}
                    />
                );
            })}

            {/* String labels on left edge */}
            {showGrid && Array.from({ length: NUM_STRINGS }, (_, i) => {
                const labels = ["e", "B", "G", "D", "A", "E"];
                const y = containerHeight - (i * laneHeight + laneHeight / 2);
                return (
                    <div
                        key={`slabel-${i}`}
                        className="absolute left-1 z-20 text-[9px] font-bold pointer-events-none"
                        style={{
                            top: `${y - 6}px`,
                            color: "var(--color-subtle)",
                            opacity: 0.4,
                        }}
                    >
                        {labels[i]}
                    </div>
                );
            })}

            {/* Note waterfall */}
            <div className="relative w-full h-full z-10">
                {visibleNotes.map(note => (
                    <div
                        key={note.id}
                        className={twMerge(
                            "waterfall-note absolute z-15",
                        )}
                        data-proximity={note.proximity > 0.85 ? "near" : note.proximity > 0.6 ? "mid" : undefined}
                        data-active={note.isActive ? "" : undefined}
                        style={{
                            left: `${note.x}px`,
                            width: `${note.width}px`,
                            bottom: `${note.bottom}px`,
                            height: `${note.height}px`,
                            '--note-color': note.color,
                            backgroundColor: note.color,
                        } as React.CSSProperties}
                    >
                        {/* Fret number label */}
                        {note.width >= 16 && (
                            <span
                                className="absolute inset-0 flex items-center justify-center font-bold pointer-events-none"
                                style={{
                                    color: "rgba(0,0,0,0.5)",
                                    fontSize: note.width < 24 ? 8 : 10,
                                }}
                            >
                                {note.fret === 0 ? "O" : note.fret}
                            </span>
                        )}
                    </div>
                ))}
            </div>

            {/* Strike line at fretboard boundary */}
            <div className="waterfall-strike-line" />

            {/* Foreground occlusion */}
            <div
                className="waterfall-occlusion animate-scroll"
                style={{
                    '--scroll-size': '100%',
                    '--scroll-duration': `calc(1.5s / var(--playback-rate, 1))`
                } as React.CSSProperties}
            />
        </div>
    );
}
