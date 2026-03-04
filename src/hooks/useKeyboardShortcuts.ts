"use client";

import { useEffect } from "react";

interface KeyboardShortcutOptions {
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onExit: () => void;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
}

const SEEK_STEP = 5; // seconds

export function useKeyboardShortcuts({
  onTogglePlay,
  onSeek,
  onExit,
  currentTime,
  duration,
}: KeyboardShortcutOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      switch (e.code) {
        case "Space":
          e.preventDefault();
          onTogglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          onSeek(Math.max(0, currentTime - SEEK_STEP));
          break;
        case "ArrowRight":
          e.preventDefault();
          onSeek(Math.min(duration, currentTime + SEEK_STEP));
          break;
        case "Escape":
          e.preventDefault();
          onExit();
          break;
        case "Home":
          e.preventDefault();
          onSeek(0);
          break;
        case "End":
          e.preventDefault();
          onSeek(duration);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onTogglePlay, onSeek, onExit, currentTime, duration]);
}
