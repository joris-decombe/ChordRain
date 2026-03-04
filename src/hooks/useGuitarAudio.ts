import { useState, useEffect, useRef, useMemo } from 'react';
import * as Tone from "tone";
import { Midi } from "@tonejs/midi";
import { validatePlaybackRate } from "@/lib/audio-logic";
import { assignStringFret } from "@/lib/string-assignment";
import type { ActiveGuitarNote, SongSource } from "@/types/guitar";
import type { StringFret } from "@/lib/string-assignment";

export interface GuitarAudioState {
    isLoaded: boolean;
    isPlaying: boolean;
    currentTime: number;
    currentTick: number;
    duration: number;
    midi: Midi | null;
    activeNotes: ActiveGuitarNote[];
    isLooping: boolean;
    loopStartTick: number;
    loopEndTick: number;
}

interface NoteEvent {
    time: number | string;
    note: string;
    duration: number;
    velocity: number;
    rawTicks: number;
}

interface TimelineEvent {
    note: string;
    type: 'start' | 'stop';
    track: number;
    velocity: number;
    midi: number;
    string: number;
    fret: number;
    color: string;
}

export interface GuitarAudioSettings {
    lookAheadTime?: number;
    initialPlaybackRate?: number;
    initialTick?: number;
}

// Internal active note type matching the timeline
interface InternalActiveNote {
    note: string;
    midi: number;
    track: number;
    velocity: number;
    startTick: number;
    string: number;
    fret: number;
    color: string;
}

export function useGuitarAudio(source: SongSource | null, settings: GuitarAudioSettings = {}) {
    const { lookAheadTime = 1.5, initialPlaybackRate, initialTick } = settings;
    const [state, setState] = useState<GuitarAudioState>({
        isLoaded: false,
        isPlaying: false,
        currentTime: 0,
        currentTick: 0,
        duration: 0,
        midi: null,
        activeNotes: [],
        isLooping: false,
        loopStartTick: 0,
        loopEndTick: 0,
    });

    const samplerRef = useRef<Tone.Sampler | null>(null);
    const noteTimelineRef = useRef<Map<number, TimelineEvent[]>>(new Map());
    const timelineKeysRef = useRef<number[]>([]);
    const activeNotesRef = useRef<Map<string, InternalActiveNote>>(new Map());
    const lastProcessedTickRef = useRef(0);
    const [playbackRate, setPlaybackRate] = useState(initialPlaybackRate ?? 1);
    const playbackRateRef = useRef(initialPlaybackRate ?? 1);
    const initialTickRef = useRef(initialTick ?? 0);
    initialTickRef.current = initialTick ?? 0;
    const baseBpmRef = useRef<number>(120);

    useEffect(() => {
        playbackRateRef.current = playbackRate;
    }, [playbackRate]);

    const loopStateRef = useRef({ isLooping: false, loopStartTick: 0, loopEndTick: 0 });

    /** Rebuild active notes from tick 0 to targetTick (for seeking). */
    const rebuildActiveNotes = (targetTick: number) => {
        activeNotesRef.current.clear();

        const keys = timelineKeysRef.current;
        let low = 0, high = keys.length - 1;
        let count = 0;

        while (low <= high) {
            const mid = (low + high) >>> 1;
            if (keys[mid] <= targetTick) {
                count = mid + 1;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        for (let i = 0; i < count; i++) {
            const tick = keys[i];
            const events = noteTimelineRef.current.get(tick)!;
            events.forEach(event => {
                const key = `${event.note}-${event.track}`;
                if (event.type === 'start') {
                    activeNotesRef.current.set(key, {
                        note: event.note,
                        midi: event.midi,
                        track: event.track,
                        velocity: event.velocity,
                        startTick: tick,
                        string: event.string,
                        fret: event.fret,
                        color: event.color,
                    });
                } else {
                    activeNotesRef.current.delete(key);
                }
            });
        }
        return Array.from(activeNotesRef.current.values()) as ActiveGuitarNote[];
    };

    // Initialize Audio & Load MIDI
    useEffect(() => {
        let mounted = true;
        let part: Tone.Part | null = null;
        let sampler: Tone.Sampler | null = null;

        async function init() {
            if (!source) return;

            // Guitar sampler — acoustic guitar samples
            // Using a subset of chromatic samples; Tone.js interpolates the rest
            sampler = new Tone.Sampler({
                urls: {
                    E2: "E2.mp3",
                    A2: "A2.mp3",
                    D3: "D3.mp3",
                    G3: "G3.mp3",
                    B3: "B3.mp3",
                    E4: "E4.mp3",
                    A3: "A3.mp3",
                    C4: "C4.mp3",
                    "F#3": "Fs3.mp3",
                    "F#4": "Fs4.mp3",
                    A4: "A4.mp3",
                    C5: "C5.mp3",
                    E5: "E5.mp3",
                },
                release: 2,
                baseUrl: `${process.env.NEXT_PUBLIC_BASE_PATH ?? '/ChordRain'}/guitar-acoustic/`,
            }).toDestination();

            await Tone.loaded();
            if (!mounted) {
                sampler.dispose();
                return;
            }
            samplerRef.current = sampler;

            // Load MIDI
            let arrayBuffer: ArrayBuffer | Uint8Array;

            if (source.type === 'guitarPro' && source.url) {
                // Guitar Pro files will be handled in Phase 6
                // For now, fall through to MIDI loading as placeholder
                console.warn('Guitar Pro loading not yet implemented, treating as MIDI');
                const response = await fetch(source.url);
                arrayBuffer = await response.arrayBuffer();
            } else if (source.type === 'midi' && source.url) {
                const response = await fetch(source.url);
                arrayBuffer = await response.arrayBuffer();
            } else {
                console.error("Invalid source", source);
                return;
            }

            const midi = new Midi(arrayBuffer);

            if (!mounted) {
                sampler.dispose();
                return;
            }

            // Schedule notes
            Tone.Transport.stop();
            Tone.Transport.cancel();
            Tone.Transport.PPQ = midi.header.ppq || 480;

            const initialBpm = midi.header.tempos.length > 0 ? midi.header.tempos[0].bpm : 120;
            baseBpmRef.current = initialBpm;
            Tone.Transport.bpm.value = initialBpm * playbackRateRef.current;

            const notes: NoteEvent[] = [];
            midi.tracks.forEach((track) => {
                track.notes.forEach((note) => {
                    notes.push({
                        time: `${note.ticks}i`,
                        note: note.name,
                        duration: Math.max(0, note.duration),
                        velocity: note.velocity,
                        rawTicks: note.ticks
                    });
                });
            });

            notes.sort((a, b) => a.rawTicks - b.rawTicks);

            part = new Tone.Part((time, value: NoteEvent) => {
                try {
                    if (!value.duration || value.duration <= 0) return;
                    samplerRef.current?.triggerAttackRelease(
                        value.note,
                        Math.max(0.001, value.duration),
                        Math.max(0, time),
                        value.velocity
                    );
                } catch (e) {
                    console.error("Part callback error:", e);
                }
            }, notes).start(0);

            // Pre-compute note timeline with string/fret assignments
            // Build a map from MIDI note name to MIDI number for string assignment
            const noteNameToMidi = new Map<string, number>();
            midi.tracks.forEach((track) => {
                track.notes.forEach((note) => {
                    noteNameToMidi.set(note.name, note.midi);
                });
            });

            const timeline = new Map<number, TimelineEvent[]>();
            midi.tracks.forEach((track, trackIndex) => {
                track.notes.forEach(note => {
                    const startTick = note.ticks;
                    const endTick = startTick + note.durationTicks;

                    // Assign string/fret for this note
                    const sf: StringFret | null = assignStringFret(note.midi);
                    const string = sf?.string ?? 1;
                    const fret = sf?.fret ?? 0;

                    // Color by string via CSS variable
                    const color = `var(--color-note-string-${string})`;

                    const startEvent: TimelineEvent = {
                        note: note.name,
                        type: 'start',
                        track: trackIndex,
                        velocity: note.velocity,
                        midi: note.midi,
                        string,
                        fret,
                        color,
                    };
                    const stopEvent: TimelineEvent = {
                        note: note.name,
                        type: 'stop',
                        track: trackIndex,
                        velocity: 0,
                        midi: note.midi,
                        string,
                        fret,
                        color,
                    };

                    if (!timeline.has(startTick)) timeline.set(startTick, []);
                    timeline.get(startTick)!.push(startEvent);

                    if (!timeline.has(endTick)) timeline.set(endTick, []);
                    timeline.get(endTick)!.push(stopEvent);
                });
            });

            noteTimelineRef.current = timeline;
            timelineKeysRef.current = Array.from(timeline.keys()).sort((a, b) => a - b);

            // Restore saved position if provided
            const restoreTick = initialTickRef.current;
            if (restoreTick > 0) {
                Tone.Transport.ticks = restoreTick;
                lastProcessedTickRef.current = restoreTick;
            }

            const restoredNotes = restoreTick > 0 ? rebuildActiveNotes(restoreTick) : [];

            setState((prev) => ({
                ...prev,
                isLoaded: true,
                duration: midi.duration,
                midi: midi,
                currentTick: restoreTick,
                currentTime: restoreTick > 0 ? restoreTick / ((midi.header.ppq || 480) * (initialBpm / 60)) : 0,
                activeNotes: restoredNotes,
                isLooping: false,
                loopStartTick: 0,
                loopEndTick: 0
            }));
            loopStateRef.current = { isLooping: false, loopStartTick: 0, loopEndTick: 0 };
        }

        init();

        return () => {
            mounted = false;
            if (part) {
                part.stop();
                part.dispose();
            }
            if (sampler) {
                sampler.releaseAll();
                sampler.dispose();
            }
            Tone.Transport.stop();
            Tone.Transport.cancel();
            Tone.Transport.seconds = 0;
            Tone.Transport.ticks = 0;
        };
    }, [source]);

    // Sync Loop for UI
    useEffect(() => {
        let animationFrame: number;

        const syncLoop = () => {
            try {
                if (Tone.Transport.state !== "started") {
                    setState(prev => ({ ...prev, isPlaying: false }));
                    return;
                }

                const currentTick = Math.floor(Tone.Transport.ticks);
                const lastProcessedTick = lastProcessedTickRef.current;
                let notesChanged = false;

                // Backwards seek: reset state
                if (currentTick < lastProcessedTick) {
                    rebuildActiveNotes(currentTick);
                    notesChanged = true;
                } else {
                    const firstTick = (lastProcessedTick === 0 && currentTick >= 0) ? 0 : lastProcessedTick + 1;
                    for (let tick = firstTick; tick <= currentTick; tick++) {
                        if (noteTimelineRef.current.has(tick)) {
                            notesChanged = true;
                            const events = noteTimelineRef.current.get(tick)!;
                            events.forEach(event => {
                                const key = `${event.note}-${event.track}`;
                                if (event.type === 'start') {
                                    activeNotesRef.current.set(key, {
                                        note: event.note,
                                        midi: event.midi,
                                        track: event.track,
                                        velocity: event.velocity,
                                        startTick: tick,
                                        string: event.string,
                                        fret: event.fret,
                                        color: event.color,
                                    });
                                } else {
                                    activeNotesRef.current.delete(key);
                                }
                            });
                        }
                    }
                }

                lastProcessedTickRef.current = currentTick;

                // Looping logic
                const { isLooping, loopStartTick, loopEndTick } = loopStateRef.current;
                if (isLooping && loopEndTick > loopStartTick + 48 && currentTick >= loopEndTick) {
                    Tone.Transport.ticks = loopStartTick;
                    lastProcessedTickRef.current = loopStartTick;
                    rebuildActiveNotes(loopStartTick);

                    setState(prev => ({
                        ...prev,
                        currentTime: loopStartTick / (Tone.Transport.PPQ * (baseBpmRef.current / 60)),
                        currentTick: loopStartTick,
                        activeNotes: Array.from(activeNotesRef.current.values()) as ActiveGuitarNote[]
                    }));

                    animationFrame = requestAnimationFrame(syncLoop);
                    return;
                }

                // BPM-invariant song time
                const ppq = Tone.Transport.PPQ;
                const baseBpm = baseBpmRef.current;
                const songTime = currentTick / (ppq * (baseBpm / 60));

                setState(prev => {
                    if (
                        Math.abs(prev.currentTime - songTime) < 0.01 &&
                        prev.currentTick === currentTick &&
                        prev.isPlaying === true &&
                        !notesChanged
                    ) {
                        return prev;
                    }

                    return {
                        ...prev,
                        currentTime: songTime,
                        currentTick,
                        isPlaying: true,
                        activeNotes: notesChanged
                            ? Array.from(activeNotesRef.current.values()) as ActiveGuitarNote[]
                            : prev.activeNotes,
                    };
                });

                animationFrame = requestAnimationFrame(syncLoop);
            } catch (error) {
                console.error("Error in syncLoop:", error);
                animationFrame = requestAnimationFrame(syncLoop);
            }
        };

        if (state.isPlaying) {
            lastProcessedTickRef.current = Math.floor(Tone.Transport.ticks);
            animationFrame = requestAnimationFrame(syncLoop);
        } else {
            if (Tone.Transport.state !== 'started') {
                setState(prev => ({ ...prev, isPlaying: false }));
            }
        }

        return () => cancelAnimationFrame(animationFrame);
    }, [state.isPlaying, playbackRate, state.midi, lookAheadTime]);

    // Controls
    const togglePlay = async () => {
        try {
            await Tone.start();
            if (Tone.context.state === 'suspended') {
                await Tone.context.resume();
            }

            if (Tone.Transport.state === "started") {
                Tone.Transport.pause();
                setState((prev) => ({ ...prev, isPlaying: false }));
            } else {
                Tone.Transport.start();
                setState((prev) => ({ ...prev, isPlaying: true }));
            }
        } catch (error) {
            console.error('Audio playback error:', error);
        }
    };

    const seek = (time: number) => {
        const targetTick = Math.round(Math.max(0, time) * (baseBpmRef.current / 60) * Tone.Transport.PPQ);
        Tone.Transport.ticks = targetTick;
        const newTick = Tone.Transport.ticks;
        lastProcessedTickRef.current = newTick;

        const newActiveNotes = rebuildActiveNotes(newTick);

        setState(prev => ({
            ...prev,
            currentTime: time,
            currentTick: newTick,
            activeNotes: newActiveNotes
        }));
    };

    const changeSpeed = (rate: number) => {
        const validatedRate = validatePlaybackRate(rate);
        setPlaybackRate(validatedRate);
        Tone.Transport.bpm.value = baseBpmRef.current * validatedRate;
    };

    const toggleLoop = () => {
        setState(prev => {
            const newLooping = !prev.isLooping;
            const start = prev.loopStartTick;
            let end = prev.loopEndTick;

            if (newLooping && start === 0 && end === 0 && prev.midi) {
                end = Math.max(
                    ...prev.midi.tracks.map(t =>
                        t.notes.length > 0
                            ? t.notes[t.notes.length - 1].ticks + t.notes[t.notes.length - 1].durationTicks
                            : 0
                    ),
                    0
                );
            }

            return { ...prev, isLooping: newLooping, loopStartTick: start, loopEndTick: end };
        });
    };

    const setLoop = (start: number, end: number) => {
        const startTick = Tone.Time(Math.max(0, start)).toTicks();
        const endTick = Tone.Time(Math.max(0, end)).toTicks();
        setState(prev => ({ ...prev, loopStartTick: startTick, loopEndTick: endTick }));
    };

    // Keep loop ref in sync
    useEffect(() => {
        loopStateRef.current = {
            isLooping: state.isLooping,
            loopStartTick: state.loopStartTick,
            loopEndTick: state.loopEndTick
        };
    }, [state.isLooping, state.loopStartTick, state.loopEndTick]);

    const currentLookAheadTicks = useMemo(() => {
        if (typeof window === 'undefined') return 0;
        return Math.round((lookAheadTime || 0) * (baseBpmRef.current / 60) * Tone.Transport.PPQ);
    }, [lookAheadTime]);

    return {
        ...state,
        playbackRate,
        setPlaybackRate: changeSpeed,
        togglePlay,
        seek,
        currentTime: state.currentTime,
        duration: state.duration,
        toggleLoop,
        setLoop,
        loopStart: typeof window !== 'undefined' ? Tone.Time(state.loopStartTick, "i").toSeconds() : 0,
        loopEnd: typeof window !== 'undefined' ? Tone.Time(state.loopEndTick, "i").toSeconds() : 0,
        lookAheadTicks: currentLookAheadTicks,
    };
}
