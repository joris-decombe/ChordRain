"use client";

import { useEffect, useCallback, useSyncExternalStore } from "react";

export type Theme = "cool" | "warm" | "mono" | "8bit" | "16bit" | "hibit";

const THEME_STORAGE_KEY = "chord_rain_theme";

// Helper to get initial theme (runs once)
function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "cool";
  const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
  if (stored && ["cool", "warm", "mono", "8bit", "16bit", "hibit"].includes(stored)) {
    return stored;
  }
  return "cool";
}

// Store for theme state
let currentTheme: Theme = "cool";
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return currentTheme;
}

function getServerSnapshot() {
  return "cool" as Theme;
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Initialize theme on mount
  useEffect(() => {
    const initial = getInitialTheme();
    if (initial !== currentTheme) {
      currentTheme = initial;
      document.documentElement.setAttribute("data-theme", initial);
      listeners.forEach((cb) => cb());
    } else {
      // Just ensure the attribute is set
      document.documentElement.setAttribute("data-theme", currentTheme);
    }
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    currentTheme = newTheme;
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    listeners.forEach((cb) => cb());
  }, []);

  return { theme, setTheme };
}

// Theme metadata for UI with color swatches
export const THEMES: { id: Theme; name: string; description: string; swatches: string[] }[] = [
  { id: "8bit", name: "8-Bit", description: "NES / Mario", swatches: ["#e52521", "#049cd8", "#fbd000"] },
  { id: "16bit", name: "16-Bit", description: "Street Fighter", swatches: ["#f08030", "#e03020", "#30a0f0"] },
  { id: "hibit", name: "Hi-Bit", description: "Celeste", swatches: ["#ff6188", "#78dce8", "#ab9df2"] },
  { id: "cool", name: "Cool", description: "Neon", swatches: ["#38bdf8", "#fb7185", "#a78bfa"] },
  { id: "warm", name: "Warm", description: "Sepia", swatches: ["#f59e0b", "#ef4444", "#d97706"] },
  { id: "mono", name: "Mono", description: "CRT", swatches: ["#22c55e", "#4ade80", "#16a34a"] },
];
