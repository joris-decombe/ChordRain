"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGuitarAudio } from "@/hooks/useGuitarAudio";
import Fretboard from "@/components/guitar/Fretboard";
import { Waterfall } from "@/components/guitar/Waterfall";
import { Controls } from "@/components/guitar/Controls";
import { useTheme, THEMES, Theme } from "@/hooks/useTheme";
import { validateSongFile, isGuitarProFile } from "@/lib/validation";
import { calculateFretboardScale } from "@/lib/audio-logic";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useWakeLock } from "@/hooks/useWakeLock";
import { ToastContainer, showToast } from "@/components/Toast";
import { EffectsCanvas, type EffectsNote } from "@/components/guitar/EffectsCanvas";
import { playHoverSound, playSelectSound, warmUpAudio } from "@/lib/menu-sounds";
import { getTotalFretboardWidth } from "@/lib/fretboard-geometry";
import { loadGuitarPro } from "@/lib/guitarpro-loader";
import { Midi } from "@tonejs/midi";
import * as Tone from "tone";
import type { SongSource, ActiveGuitarNote } from "@/types/guitar";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '/ChordRain';

// Song Management
interface Song {
  id: string;
  title: string;
  artist: string;
  url?: string;
  type: 'midi' | 'guitarPro';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: '#22c55e',
  intermediate: '#f59e0b',
  advanced: '#ef4444',
};

// Progress tracking
interface ProgressData {
  playCount: number;
  lastPlayedAt: number;
}

function getProgress(): Record<string, ProgressData> {
  try {
    const raw = localStorage.getItem('chord_rain_progress');
    return raw ? (JSON.parse(raw) as Record<string, ProgressData>) : {};
  } catch { return {}; }
}

function setLastPlayed(songId: string) {
  try {
    const progress = getProgress();
    progress[songId] = {
      playCount: (progress[songId]?.playCount || 0) + 1,
      lastPlayedAt: Date.now(),
    };
    localStorage.setItem('chord_rain_progress', JSON.stringify(progress));
  } catch { /* ignore */ }
}

// Playback rate persistence
function getSavedPlaybackRate(): number {
  try {
    const raw = localStorage.getItem('chord_rain_playback_rate');
    return raw ? parseFloat(raw) : 1;
  } catch { return 1; }
}

function savePlaybackRate(rate: number) {
  try {
    localStorage.setItem('chord_rain_playback_rate', rate.toString());
  } catch { /* ignore */ }
}

// Song position persistence
function getSavedSongPosition(songId: string): number | undefined {
  try {
    const raw = localStorage.getItem('chord_rain_song_position');
    const positions: Record<string, number> = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    return positions[songId];
  } catch { return undefined; }
}

function saveSongPosition(songId: string, tick: number) {
  try {
    const raw = localStorage.getItem('chord_rain_song_position');
    const positions: Record<string, number> = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    positions[songId] = tick;
    localStorage.setItem('chord_rain_song_position', JSON.stringify(positions));
  } catch { /* ignore */ }
}

const defaultSongs: Song[] = [
  // Beginner
  { id: 'amazing-grace', title: 'Amazing Grace', artist: 'Traditional', url: `${BASE_PATH}/scores/amazing-grace.gp4`, type: 'guitarPro', difficulty: 'beginner' },
  { id: 'auld-lang-syne', title: 'Auld Lang Syne', artist: 'Traditional', url: `${BASE_PATH}/scores/auld-lang-syne.gp3`, type: 'guitarPro', difficulty: 'beginner' },
  { id: 'oh-when-the-saints', title: 'Oh When the Saints', artist: 'Traditional', url: `${BASE_PATH}/scores/oh-when-the-saints.gp3`, type: 'guitarPro', difficulty: 'beginner' },
  { id: 'silent-night', title: 'Silent Night', artist: 'Traditional', url: `${BASE_PATH}/scores/silent-night.gp3`, type: 'guitarPro', difficulty: 'beginner' },
  { id: 'sakura', title: 'Sakura Sakura', artist: 'Traditional (Japanese)', url: `${BASE_PATH}/scores/sakura.gp5`, type: 'guitarPro', difficulty: 'beginner' },
  // Intermediate
  { id: 'greensleeves', title: 'Greensleeves', artist: 'Traditional (English)', url: `${BASE_PATH}/scores/greensleeves.gp3`, type: 'guitarPro', difficulty: 'intermediate' },
  { id: 'drunken-sailor', title: 'Drunken Sailor', artist: 'Traditional (Irish)', url: `${BASE_PATH}/scores/drunken-sailor.gp3`, type: 'guitarPro', difficulty: 'intermediate' },
  { id: 'el-condor-pasa', title: 'El Cóndor Pasa', artist: 'Traditional (Peruvian)', url: `${BASE_PATH}/scores/el-condor-pasa.gp3`, type: 'guitarPro', difficulty: 'intermediate' },
  { id: 'the-water-is-wide', title: 'The Water Is Wide', artist: 'Traditional (Scottish)', url: `${BASE_PATH}/scores/the-water-is-wide.gpx`, type: 'guitarPro', difficulty: 'intermediate' },
  // Advanced
  { id: 'blackberry-blossom', title: 'Blackberry Blossom', artist: 'Traditional (Bluegrass)', url: `${BASE_PATH}/scores/blackberry-blossom.gp4`, type: 'guitarPro', difficulty: 'advanced' },
  { id: 'wild-rover', title: 'The Wild Rover', artist: 'Traditional (Irish)', url: `${BASE_PATH}/scores/wild-rover.gp4`, type: 'guitarPro', difficulty: 'advanced' },
];

function HelpModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60">
      <div className="pixel-panel p-6 max-w-md w-full relative">
        <button onClick={onClose} className="absolute top-4 right-4 pixel-text-muted hover:pixel-text-accent">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h3 className="text-xl font-bold text-[var(--color-text-bright)] mb-4 uppercase tracking-tighter">About File Formats</h3>
        <div className="space-y-3 text-sm text-[var(--color-text)]">
          <p>ChordRain supports MIDI files and Guitar Pro files (.gp, .gp3, .gp4, .gp5, .gpx).</p>
          <p><strong className="pixel-text-accent">Guitar Pro files are recommended</strong> — they preserve string/fret positioning from the original tab.</p>
          <p><strong className="pixel-text-accent">Where to find tabs:</strong></p>
          <ul className="list-disc pl-5 space-y-1 pixel-text-subtle">
            <li><a href="https://www.ultimate-guitar.com" target="_blank" rel="noopener noreferrer" className="hover:pixel-text-accent underline decoration-dotted">Ultimate Guitar</a> (Guitar Pro tabs)</li>
            <li><a href="https://www.songsterr.com" target="_blank" rel="noopener noreferrer" className="hover:pixel-text-accent underline decoration-dotted">Songsterr</a></li>
          </ul>
          <div className="p-3 pixel-inset mt-4">
            <p className="text-xs pixel-text-muted"><strong>Note:</strong> MIDI files will have string/fret positions computed automatically. Guitar Pro files use the original tab data.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface GuitarLessonProps {
  song: Song;
  allSongs: Song[];
  onSongChange: (song: Song) => void;
  onExit: () => void;
}

function GuitarLesson({ song, allSongs, onSongChange, onExit }: GuitarLessonProps) {
  const [waterfallHeight, setWaterfallHeight] = useState(0);
  const waterfallContainerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [containerPxHeight, setContainerPxHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const stableOnExit = useCallback(() => onExit(), [onExit]);

  const [savedRate] = useState(() => getSavedPlaybackRate());
  const savedTick = useMemo(() => getSavedSongPosition(song.id), [song.id]);
  const currentTickRef = useRef(0);

  const fretboardWidth = getTotalFretboardWidth();

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      setScale(calculateFretboardScale(entries[0].contentRect.width));
      setContainerPxHeight(entries[0].contentRect.height);
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!waterfallContainerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      setWaterfallHeight(entries[0].contentRect.height);
    });
    obs.observe(waterfallContainerRef.current);
    return () => obs.disconnect();
  }, []);

  const [lookAheadOverride, setLookAheadOverride] = useState<{ songId: string; value: number } | null>(null);
  const effectiveLookAheadOverride = lookAheadOverride?.songId === song.id ? lookAheadOverride.value : null;
  const autoLookAheadTime = useMemo(() => {
    if (waterfallHeight > 0) {
      return Math.max(0.8, Math.min(4.0, waterfallHeight / 180));
    }
    return 1.5;
  }, [waterfallHeight]);
  const lookAheadTime = effectiveLookAheadOverride ?? autoLookAheadTime;

  const songSource: SongSource = useMemo(() => ({
    url: song.url,
    type: song.type === 'guitarPro' ? 'guitarPro' : 'midi',
    name: song.title,
  }), [song.url, song.type, song.title]);

  const audio = useGuitarAudio(songSource, { lookAheadTime, initialPlaybackRate: savedRate, initialTick: savedTick });

  useWakeLock(audio.isPlaying);

  useEffect(() => {
    savePlaybackRate(audio.playbackRate);
  }, [audio.playbackRate]);

  useEffect(() => {
    currentTickRef.current = audio.currentTick;
  }, [audio.currentTick]);

  useEffect(() => {
    const songId = song.id;
    return () => {
      saveSongPosition(songId, currentTickRef.current);
    };
  }, [song.id]);

  const handleEscapeExit = useCallback(() => {
    const doc = document as Document & {
      webkitFullscreenElement?: Element;
      mozFullScreenElement?: Element;
      msFullscreenElement?: Element;
    };
    const inFullscreen = !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );
    if (!inFullscreen) {
      stableOnExit();
    }
  }, [stableOnExit]);

  useKeyboardShortcuts({
    onTogglePlay: audio.togglePlay,
    onSeek: audio.seek,
    onExit: handleEscapeExit,
    currentTime: audio.currentTime,
    duration: audio.duration,
    isPlaying: audio.isPlaying,
  });

  const [showGrid, setShowGrid] = useState(true);

  const coloredNotes: ActiveGuitarNote[] = useMemo(() => {
    return audio.activeNotes.map(n => ({
      ...n,
      color: n.color || `var(--color-note-string-${n.string})`,
    }));
  }, [audio.activeNotes]);

  const effectsNotes: EffectsNote[] = useMemo(() => {
    return coloredNotes.map(n => ({
      note: n.note,
      midi: n.midi,
      string: n.string,
      fret: n.fret,
      color: n.color,
      startTick: n.startTick,
    }));
  }, [coloredNotes]);

  const visualSettings = useMemo(() => ({
    showGrid, setShowGrid
  }), [showGrid]);

  const songSettingsMemo = useMemo(() => ({
    songs: allSongs,
    currentSong: song,
    onSelectSong: onSongChange
  }), [allSongs, song, onSongChange]);

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-[var(--color-void)] px-[env(safe-area-inset-left,0px)] py-6 md:px-8 landscape:pt-1 landscape:pb-[env(safe-area-inset-bottom)] relative overflow-hidden crt-effect noise-texture" data-theme={theme}>
      <div className="vignette-overlay" aria-hidden="true" />

      <div className="fixed inset-0 z-[100] hidden portrait:flex flex-col items-center justify-center bg-[var(--color-void)]/95 text-center p-8">
        <div className="text-4xl mb-4">&#8635;</div>
        <h2 className="text-2xl font-bold text-[var(--color-text-bright)] mb-2 uppercase tracking-tighter">Please Rotate Your Device</h2>
        <p className="pixel-text-muted">ChordRain works best in landscape mode.</p>
      </div>

      <header className="mb-2 landscape:hidden flex items-center justify-between shrink-0">
        <h1 className="text-xl font-bold text-[var(--color-text-bright)]">{song.title}</h1>
        <div className="text-xs pixel-text-muted">{song.artist}</div>
      </header>

      <main className="relative flex-1 min-h-0 w-full flex flex-col bg-[var(--color-void)]">
        <div ref={containerRef} className="flex-1 w-full overflow-hidden relative" style={{ scrollbarWidth: 'none' }}>
          <div
            className="mx-auto flex flex-col items-center relative transition-transform duration-300 ease-out origin-top-left"
            style={{
              width: `${fretboardWidth}px`,
              height: scale < 1 && containerPxHeight > 0 ? `${containerPxHeight / scale}px` : '100%',
              transform: `scale(${scale})`,
            }}
          >
            <div className="relative flex-1 flex flex-col min-h-0 items-center w-full">

              <div
                ref={waterfallContainerRef}
                data-testid="waterfall-container"
                className="absolute top-0 z-40 pointer-events-none"
                style={{
                  width: `${fretboardWidth}px`,
                  bottom: 'var(--spacing-fretboard-h)',
                  '--playback-rate': audio.playbackRate
                } as React.CSSProperties}
              >
                <div className="waterfall-atmosphere" aria-hidden="true" />
                <Waterfall
                  midi={audio.midi}
                  currentTick={audio.currentTick}
                  isPlaying={audio.isPlaying}
                  playbackRate={audio.playbackRate}
                  lookAheadTicks={audio.lookAheadTicks}
                  showGrid={showGrid}
                  containerHeight={waterfallHeight}
                />
              </div>

              <div
                className="absolute top-0 z-[42] pointer-events-none"
                style={{
                  width: `${fretboardWidth}px`,
                  bottom: 'var(--spacing-fretboard-h)'
                }}
              >
                <EffectsCanvas
                  activeNotes={effectsNotes}
                  containerHeight={waterfallHeight}
                  theme={theme}
                  isPlaying={audio.isPlaying}
                />
              </div>

              <div className="flex-1" />

              <div className="relative shrink-0 z-50" style={{ width: `${fretboardWidth}px` }}>
                <Fretboard activeNotes={coloredNotes} />
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-6 landscape:mt-8 w-full max-w-2xl mx-auto z-[60]">
        <Controls
          isPlaying={audio.isPlaying}
          onTogglePlay={audio.togglePlay}
          currentTime={audio.currentTime}
          duration={audio.duration}
          onSeek={audio.seek}
          playbackRate={audio.playbackRate}
          onSetPlaybackRate={audio.setPlaybackRate}
          lookAheadTime={lookAheadTime}
          minLookAheadTime={autoLookAheadTime}
          onSetLookAheadTime={(time) => setLookAheadOverride(time != null ? { songId: song.id, value: time } : null)}
          visualSettings={visualSettings}
          songSettings={songSettingsMemo}
          isLooping={audio.isLooping}
          loopStart={audio.loopStart}
          loopEnd={audio.loopEnd}
          onToggleLoop={audio.toggleLoop}
          onSetLoop={audio.setLoop}
          onExit={onExit}
        />
      </footer>

      <AnimatePresence>
        {!audio.isLoaded && (
          <motion.div
            key="guitar-loading"
            className="absolute inset-0 z-[80] flex flex-col items-center justify-center bg-[var(--color-void)]"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center space-y-3 px-6 max-w-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--color-accent-primary)] animate-pulse">
                Now Loading
              </p>
              <h2 className="text-xl font-bold text-[var(--color-text-bright)] uppercase tracking-tighter leading-tight">
                {song.title}
              </h2>
              <p className="text-xs pixel-text-muted">{song.artist}</p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <div className="w-1.5 h-1.5 bg-[var(--color-accent-primary)] animate-pulse" />
                <div className="w-1.5 h-1.5 bg-[var(--color-accent-primary)] animate-pulse [animation-delay:200ms]" />
                <div className="w-1.5 h-1.5 bg-[var(--color-accent-primary)] animate-pulse [animation-delay:400ms]" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Home() {
  const [allSongs, setAllSongs] = useState<Song[]>(defaultSongs);
  const [currentSong, setCurrentSong] = useState<Song>(defaultSongs[0]);

  const [hasStarted, setHasStarted] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [showPWAHint, setShowPWAHint] = useState(false);
  const [showSilentModeHint, setShowSilentModeHint] = useState(false);
  const [lastPlayedSongId, setLastPlayedSongId] = useState<string | null>(null);
  const [isFirstTimer, setIsFirstTimer] = useState(true);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<'all' | 'beginner' | 'intermediate' | 'advanced' | 'uploads'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'title' | 'artist' | 'difficulty' | 'duration'>('default');
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    try {
      const saved = localStorage.getItem('chord_rain_uploads');
      if (saved) {
        const uploadedSongs = JSON.parse(saved) as Song[];
        const defaultIds = new Set(defaultSongs.map(s => s.id));
        const newUploads = uploadedSongs.filter(u => !defaultIds.has(u.id));
        if (newUploads.length > 0) {
          setAllSongs((prev: Song[]) => [...prev, ...newUploads]);
        }
      }
    } catch (e: unknown) {
      console.error("Failed to load persistence", e);
    }
  }, []);

  useEffect(() => {
    const progress = getProgress();
    const songIds = Object.keys(progress);
    if (songIds.length > 0) {
      setIsFirstTimer(false);
      const mostRecent = songIds.reduce((a, b) =>
        progress[a].lastPlayedAt > progress[b].lastPlayedAt ? a : b
      );
      setLastPlayedSongId(mostRecent);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function computeDurations() {
      const results: Record<string, number> = {};
      for (const song of defaultSongs) {
        try {
          if (song.url) {
            const res = await fetch(song.url);
            const buf = await res.arrayBuffer();
            if (song.type === 'guitarPro') {
              const result = await loadGuitarPro(buf);
              const midi = new Midi(result.midiBuffer);
              results[song.id] = midi.duration;
            } else {
              const midi = new Midi(buf);
              results[song.id] = midi.duration;
            }
          }
        } catch (e) {
          console.error(`Failed to compute duration for ${song.id}`, e);
        }
      }
      if (!cancelled) setDurations(results);
    }
    computeDurations();
    return () => { cancelled = true; };
  }, []);

  const saveToLocalStorage = (song: Song) => {
    try {
      const saved = localStorage.getItem('chord_rain_uploads');
      const uploads: Song[] = saved ? (JSON.parse(saved) as Song[]) : [];
      uploads.push(song);
      localStorage.setItem('chord_rain_uploads', JSON.stringify(uploads));
    } catch (e: unknown) {
      console.error("Failed to save song", e);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateSongFile(file);
    if (!validation.valid) {
      showToast(validation.error ?? "Invalid file", "error");
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();

      if (isGuitarProFile(file.name)) {
        const result = await loadGuitarPro(arrayBuffer);
        const base64 = btoa(String.fromCharCode(...new Uint8Array(result.midiBuffer)));
        const midiUrl = `data:audio/midi;base64,${base64}`;

        const newSong: Song = {
          id: `upload-${Date.now()}`,
          title: result.title || file.name.replace(/\.(gp[x345]?|gp)$/i, ''),
          artist: result.artist || 'Uploaded (Guitar Pro)',
          url: midiUrl,
          type: 'guitarPro',
        };

        setAllSongs(prev => [...prev, newSong]);
        saveToLocalStorage(newSong);
        setCurrentSong(newSong);
        setHasStarted(true);
      } else {
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        const midiUrl = `data:audio/midi;base64,${base64}`;

        const newSong: Song = {
          id: `upload-${Date.now()}`,
          title: file.name.replace(/\.(mid|midi)$/i, ''),
          artist: 'Uploaded (MIDI)',
          url: midiUrl,
          type: 'midi',
        };

        setAllSongs(prev => [...prev, newSong]);
        saveToLocalStorage(newSong);
        setCurrentSong(newSong);
        setHasStarted(true);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      showToast(error instanceof Error ? error.message : 'Failed to process file', "error");
    }
  };

  useEffect(() => {
    const isIPhone = /iPhone/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const dismissed = localStorage.getItem('pwa_hint_dismissed');

    if (isIPhone && !isStandalone && !dismissed) {
      setTimeout(() => setShowPWAHint(true), 0);
    }
  }, []);

  useEffect(() => {
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const dismissed = localStorage.getItem('silent_mode_hint_dismissed');

    if (isIOS && !dismissed) {
      setTimeout(() => setShowSilentModeHint(true), 0);
    }
  }, []);

  useEffect(() => { warmUpAudio(); }, []);

  const selectSong = useCallback(async (song: Song) => {
    try {
      const Tone = await import('tone');
      await Tone.start();
      if (Tone.context.state === 'suspended') {
        await Tone.context.resume();
      }
    } catch (e) {
      console.error('Failed to start audio context:', e);
    }
    setLastPlayed(song.id);
    setLastPlayedSongId(song.id);
    setIsFirstTimer(false);
    setCurrentSong(song);
    setHasStarted(true);
  }, []);

  const lastPlayedSong = useMemo(
    () => lastPlayedSongId ? allSongs.find(s => s.id === lastPlayedSongId) : null,
    [lastPlayedSongId, allSongs]
  );

  const showTabs = allSongs.length > 4;

  const filteredSongs = useMemo(() => {
    let songs = allSongs;
    if (activeTab === 'uploads') songs = songs.filter(s => s.id.startsWith('upload-'));
    else if (activeTab !== 'all') songs = songs.filter(s => s.difficulty === activeTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      songs = songs.filter(s => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q));
    }
    if (sortBy !== 'default') {
      const diffOrder: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };
      songs = [...songs].sort((a, b) => {
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        if (sortBy === 'artist') return a.artist.localeCompare(b.artist);
        if (sortBy === 'difficulty') return (diffOrder[a.difficulty ?? ''] ?? 9) - (diffOrder[b.difficulty ?? ''] ?? 9);
        if (sortBy === 'duration') return (durations[a.id] ?? Infinity) - (durations[b.id] ?? Infinity);
        return 0;
      });
    }
    return songs;
  }, [allSongs, activeTab, searchQuery, sortBy, durations]);

  return (
    <>
      <ToastContainer />
      <AnimatePresence mode="wait">
        {hasStarted ? (
          <motion.div
            key="lesson"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full h-full"
          >
            <GuitarLesson
              song={currentSong}
              allSongs={allSongs}
              onSongChange={setCurrentSong}
              onExit={() => setHasStarted(false)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex h-screen w-full flex-col items-center bg-[var(--color-void)] text-[var(--color-text)] p-8 pt-[max(2rem,8vh)] relative overflow-y-auto crt-effect"
            data-theme={theme}
          >
            {/* Theme Gear */}
            <div className="absolute top-6 right-6 z-20">
              <button
                onClick={() => setIsThemeOpen(!isThemeOpen)}
                className={`flex items-center justify-center w-10 h-10 ${isThemeOpen ? 'pixel-btn-primary' : 'pixel-btn'}`}
                aria-label="Theme settings"
                title="Theme"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </button>
              <AnimatePresence>
                {isThemeOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsThemeOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full right-0 mt-2 pixel-panel p-3 z-20 w-[260px]"
                    >
                      <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider mb-2 block">Theme</label>
                      <div className="grid grid-cols-3 gap-1">
                        {THEMES.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setTheme(t.id as Theme)}
                            className={`flex flex-col items-center p-2 text-[10px] ${theme === t.id ? 'pixel-btn-primary' : 'pixel-btn'}`}
                            title={t.description}
                          >
                            <div className="flex gap-[2px] mb-1">
                              {t.swatches.map((color, i) => (
                                <div key={i} className="w-2 h-2" style={{ backgroundColor: color, border: '1px solid rgba(0,0,0,0.3)' }} />
                              ))}
                            </div>
                            {t.name}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="pixel-title text-2xl md:text-4xl mb-4 z-10 text-[var(--color-accent-primary)]"
            >
              ChordRain
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="pixel-text-muted mb-12 z-10 text-lg"
            >
              Select a song to begin practicing
            </motion.p>

            {lastPlayedSong && !isFirstTimer && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                onClick={() => selectSong(lastPlayedSong)}
                className="z-10 w-full max-w-4xl px-4 mb-6"
              >
                <div className="w-full flex items-center justify-between p-4 pixel-btn-primary hover:scale-[1.01] transition-transform text-left">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider opacity-70">Continue Playing</span>
                    <h3 className="text-lg font-bold text-[var(--color-text-bright)] uppercase tracking-tighter">{lastPlayedSong.title}</h3>
                  </div>
                  <span className="text-lg font-bold">Continue &#8594;</span>
                </div>
              </motion.button>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.12 }}
              className="z-10 w-full max-w-2xl px-4 flex flex-col"
              style={{ maxHeight: 'min(60vh, 480px)' }}
            >
              <div className="flex gap-2 mb-3 items-center">
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pixel-text-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search songs..."
                    className="w-full pl-9 pr-3 py-2 text-sm pixel-panel bg-transparent text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)]"
                  />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="px-2 py-2 text-[10px] font-bold uppercase tracking-tight pixel-btn bg-transparent text-[var(--color-text)] cursor-pointer shrink-0"
                >
                  <option value="default">Order</option>
                  <option value="title">Title</option>
                  <option value="artist">Artist</option>
                  <option value="difficulty">Level</option>
                  <option value="duration">Length</option>
                </select>
                {showTabs && (
                  <div className="flex gap-1 shrink-0 overflow-x-auto">
                    {([
                      { key: 'all', label: 'All' },
                      { key: 'beginner', label: 'Bgn' },
                      { key: 'intermediate', label: 'Int' },
                      { key: 'advanced', label: 'Adv' },
                      { key: 'uploads', label: 'Mine' },
                    ] as const).map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-2 py-2 text-[10px] font-bold uppercase tracking-tight ${activeTab === tab.key ? 'pixel-btn-primary' : 'pixel-btn'}`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="overflow-y-auto flex-1 min-h-0 pixel-panel p-1">
                {filteredSongs.length === 0 && (
                  <div className="text-center py-6 pixel-text-muted text-sm">
                    No songs match this filter
                  </div>
                )}
                {filteredSongs.map((song, index) => (
                  <motion.button
                    key={song.id}
                    data-testid={`song-${song.id}`}
                    initial={index < 8 ? { opacity: 0, x: -10 } : false}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(index, 6) * 0.05 }}
                    onMouseEnter={playHoverSound}
                    onClick={() => { playSelectSound(); selectSong(song); }}
                    className={`group relative w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--color-ui-active)] transition-colors ${isFirstTimer && song.id === 'amazing-grace' ? 'bg-[var(--color-ui-active)]' : ''}`}
                  >
                    <span className="w-4 shrink-0 opacity-0 group-hover:opacity-100 pixel-text-accent text-xs cursor-bounce transition-opacity">&#9654;</span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[var(--color-text-bright)] uppercase tracking-tighter truncate">{song.title}</span>
                        {isFirstTimer && song.id === 'amazing-grace' && (
                          <span className="shrink-0 text-[9px] font-bold uppercase tracking-tight px-1.5 py-0.5 bg-[var(--color-accent-primary)] text-[var(--color-void)]">START HERE</span>
                        )}
                      </div>
                      <span className="text-xs pixel-text-subtle truncate block">{song.artist}</span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {durations[song.id] != null && (
                        <span className="text-[10px] pixel-text-muted tabular-nums">~{Math.ceil(durations[song.id] / 60)}m</span>
                      )}
                      {song.difficulty && (
                        <span className="inline-block w-2 h-2 shrink-0" style={{ backgroundColor: DIFFICULTY_COLORS[song.difficulty] }} title={song.difficulty} />
                      )}
                    </div>
                  </motion.button>
                ))}

                <div className="flex items-center gap-3 px-4 py-3 border-t border-[var(--color-ui-active)]">
                  <span className="w-4 shrink-0 pixel-text-muted text-xs">+</span>
                  <label className="flex-1 flex items-center gap-2 cursor-pointer group">
                    <span className="text-sm font-bold pixel-text-accent uppercase tracking-tighter group-hover:pixel-text-bright transition-colors">Import MIDI / Guitar Pro</span>
                    <input
                      type="file"
                      accept=".mid,.midi,.gp,.gp3,.gp4,.gp5,.gpx"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <button onClick={() => setIsHelpOpen(true)} className="pixel-text-muted hover:pixel-text-accent transition-colors" title="About file formats">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </button>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.7 }}
              className="z-10 mt-8 text-center"
            >
              <p className="text-[11px] pixel-text-muted">
                <span className="hidden md:inline">Keyboard: <kbd className="pixel-kbd">Space</kbd> play/pause &middot; <kbd className="pixel-kbd">&larr;</kbd><kbd className="pixel-kbd">&rarr;</kbd> seek &middot; <kbd className="pixel-kbd">Esc</kbd> back</span>
              </p>
            </motion.div>

            <AnimatePresence>
              {showSilentModeHint && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="fixed bottom-20 left-4 right-4 z-50 pixel-panel p-4"
                  style={{ backgroundColor: 'var(--color-accent-tertiary)' }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">!!</span>
                    <div className="flex-1">
                      <p className="text-sm text-[var(--color-text-bright)] font-bold uppercase tracking-tighter">
                        iOS Tip: Turn off silent mode
                      </p>
                      <p className="text-xs text-[var(--color-text)] mt-1">
                        Your device must not be in silent mode to hear audio
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowSilentModeHint(false);
                        localStorage.setItem('silent_mode_hint_dismissed', 'true');
                      }}
                      className="text-[var(--color-text)]/80 hover:text-[var(--color-text-bright)] transition-colors"
                      aria-label="Dismiss"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showPWAHint && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="fixed bottom-4 left-4 right-4 z-50 pixel-panel p-4"
                  style={{ backgroundColor: 'var(--color-ui-active)' }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg font-bold pixel-text-accent">&gt;_</span>
                    <div className="flex-1">
                      <p className="text-sm text-[var(--color-text-bright)] font-bold uppercase tracking-tighter">
                        For the best experience
                      </p>
                      <p className="text-xs text-[var(--color-text)] mt-1">
                        Tap <strong>Share</strong> &#8594; <strong>Add to Home Screen</strong>
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowPWAHint(false);
                        localStorage.setItem('pwa_hint_dismissed', 'true');
                      }}
                      className="text-[var(--color-text)]/80 hover:text-[var(--color-text-bright)] transition-colors"
                      aria-label="Dismiss"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
