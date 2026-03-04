"use client";

import { useMemo } from "react";
import {
  getFretX,
  getFretCenterX,
  getFretWidth,
  getStringY,
  getTotalFretboardWidth,
  getTotalFretboardHeight,
  getLeftPadding,
} from "@/lib/fretboard-geometry";
import {
  NUM_STRINGS,
  NUM_FRETS,
  STRING_LABELS,
  FRET_MARKERS,
  DOUBLE_MARKERS,
} from "@/lib/guitar-constants";
import type { ActiveGuitarNote } from "@/types/guitar";

interface FretboardProps {
  activeNotes: ActiveGuitarNote[];
  scale?: number;
}

export default function Fretboard({ activeNotes, scale = 1 }: FretboardProps) {
  const totalWidth = getTotalFretboardWidth();
  const totalHeight = getTotalFretboardHeight();
  const leftPad = getLeftPadding();

  // Build a lookup set for active notes: "string-fret" → color
  const activeMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const n of activeNotes) {
      map.set(`${n.string}-${n.fret}`, n.color);
    }
    return map;
  }, [activeNotes]);

  // Pre-compute fret wire positions
  const fretWires = useMemo(() => {
    const wires: { x: number; isNut: boolean }[] = [];
    for (let f = 0; f <= NUM_FRETS; f++) {
      wires.push({ x: getFretX(f), isNut: f === 0 });
    }
    return wires;
  }, []);

  // Pre-compute fret markers
  const markers = useMemo(() => {
    const result: { x: number; double: boolean }[] = [];
    for (const fret of FRET_MARKERS) {
      result.push({ x: getFretCenterX(fret), double: false });
    }
    for (const fret of DOUBLE_MARKERS) {
      result.push({ x: getFretCenterX(fret), double: true });
    }
    return result;
  }, []);

  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: totalWidth * scale,
        height: totalHeight * scale,
        backgroundColor: "var(--color-fretboard-wood)",
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: "top left",
      }}
    >
      {/* Fret markers (dots) */}
      {markers.map((m, i) => {
        const midY = (getStringY(1) + getStringY(NUM_STRINGS)) / 2;
        return m.double ? (
          <div key={`marker-${i}`}>
            <div
              className="absolute rounded-full opacity-20"
              style={{
                left: m.x - 4,
                top: midY - 14,
                width: 8,
                height: 8,
                backgroundColor: "var(--color-fretboard-nut)",
              }}
            />
            <div
              className="absolute rounded-full opacity-20"
              style={{
                left: m.x - 4,
                top: midY + 6,
                width: 8,
                height: 8,
                backgroundColor: "var(--color-fretboard-nut)",
              }}
            />
          </div>
        ) : (
          <div
            key={`marker-${i}`}
            className="absolute rounded-full opacity-15"
            style={{
              left: m.x - 4,
              top: midY - 4,
              width: 8,
              height: 8,
              backgroundColor: "var(--color-fretboard-nut)",
            }}
          />
        );
      })}

      {/* Fret wires */}
      {fretWires.map((fw, i) => (
        <div
          key={`fret-${i}`}
          className="absolute top-0"
          style={{
            left: fw.x,
            width: fw.isNut ? 4 : 2,
            height: totalHeight,
            backgroundColor: fw.isNut
              ? "var(--color-fretboard-nut)"
              : "var(--color-fretboard-fret)",
            opacity: fw.isNut ? 0.9 : 0.3,
          }}
        />
      ))}

      {/* Strings */}
      {Array.from({ length: NUM_STRINGS }, (_, i) => {
        const stringNum = i + 1;
        const y = getStringY(stringNum);
        // Wound strings (4-6) are thicker
        const thickness = stringNum >= 4 ? 3 : stringNum >= 3 ? 2 : 1;

        return (
          <div
            key={`string-${stringNum}`}
            className="absolute"
            style={{
              left: leftPad - 10,
              top: y - thickness / 2,
              width: totalWidth - leftPad + 10,
              height: thickness,
              backgroundColor: "var(--color-string)",
              opacity: 0.6,
            }}
          />
        );
      })}

      {/* String labels */}
      {Array.from({ length: NUM_STRINGS }, (_, i) => {
        const stringNum = i + 1;
        const y = getStringY(stringNum);

        return (
          <div
            key={`label-${stringNum}`}
            className="absolute text-xs font-bold"
            style={{
              left: 8,
              top: y - 8,
              width: 24,
              textAlign: "center",
              color: "var(--color-subtle)",
              fontSize: 11,
            }}
          >
            {STRING_LABELS[i]}
          </div>
        );
      })}

      {/* Active note highlights */}
      {Array.from({ length: NUM_STRINGS }, (_, si) => {
        const stringNum = si + 1;
        const y = getStringY(stringNum);

        return Array.from({ length: NUM_FRETS + 1 }, (_, fret) => {
          const key = `${stringNum}-${fret}`;
          const color = activeMap.get(key);
          if (!color) return null;

          const centerX = getFretCenterX(fret);
          const width = getFretWidth(fret);
          const height = 24;

          return (
            <div
              key={`active-${key}`}
              className="absolute rounded-sm"
              style={{
                left: centerX - width / 2 + 2,
                top: y - height / 2,
                width: width - 4,
                height,
                backgroundColor: color,
                opacity: 0.85,
                boxShadow: `0 0 12px ${color}, 0 0 24px ${color}`,
              }}
            >
              {/* Fret number label */}
              <span
                className="absolute inset-0 flex items-center justify-center text-xs font-bold"
                style={{
                  color: "var(--color-void)",
                  fontSize: width < 20 ? 8 : 10,
                }}
              >
                {fret === 0 ? "O" : fret}
              </span>
            </div>
          );
        });
      })}
    </div>
  );
}
