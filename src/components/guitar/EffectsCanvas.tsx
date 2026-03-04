"use client";

import { useRef, useEffect } from "react";
import { EffectsEngine, type EffectsNote } from "@/lib/effects-engine";
export type { EffectsNote } from "@/lib/effects-engine";
import { getTotalFretboardWidth } from "@/lib/fretboard-geometry";

interface EffectsCanvasProps {
    activeNotes: EffectsNote[];
    containerHeight: number;
    theme?: string;
    isPlaying?: boolean;
}

export function EffectsCanvas({
    activeNotes,
    containerHeight,
    theme = "cool",
    isPlaying = false,
}: EffectsCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<EffectsEngine | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const engine = new EffectsEngine(canvas);
        engineRef.current = engine;

        engine.impactY = containerHeight;
        engine.containerHeight = containerHeight;
        engine.theme = theme;
        engine.isPlaying = isPlaying;
        engine.activeNotes = activeNotes;
        engine.start();

        return () => {
            engine.destroy();
            engineRef.current = null;
        };
    }, []);

    useEffect(() => {
        const engine = engineRef.current;
        if (!engine) return;

        engine.impactY = containerHeight;
        engine.containerHeight = containerHeight;
        engine.theme = theme;
        engine.isPlaying = isPlaying;
        engine.activeNotes = activeNotes;
    }, [containerHeight, theme, isPlaying, activeNotes]);

    useEffect(() => {
        const engine = engineRef.current;
        if (engine && isPlaying) {
            engine.emitForNewNotes(activeNotes);
        }
    }, [activeNotes, isPlaying]);

    useEffect(() => {
        if (containerHeight === 0 && engineRef.current) {
            engineRef.current.reset();
        }
    }, [containerHeight]);

    const canvasW = getTotalFretboardWidth();
    const canvasH = Math.round(containerHeight);

    return (
        <canvas
            ref={canvasRef}
            width={canvasW}
            height={canvasH}
            className="absolute top-0 left-0 pointer-events-none"
            style={{
                width: `${canvasW}px`,
                height: `${canvasH}px`,
                imageRendering: "pixelated",
            }}
        />
    );
}
