import { useState, useEffect, useRef, memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatTime } from "@/lib/utils";
import { useTouchDevice } from "@/hooks/useTouchDevice";
import { useFullscreen } from "@/hooks/useFullscreen";
import { useTheme, THEMES, Theme } from "@/hooks/useTheme";
import { Timeline } from "./Timeline";

interface VisualSettings {
    showGrid: boolean;
    setShowGrid: (val: boolean) => void;
}

interface Song {
    id: string;
    title: string;
    artist: string;
    url?: string;
    type: 'midi' | 'guitarPro';
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

interface SongSettings {
    songs: Song[];
    currentSong: Song;
    onSelectSong: (song: Song) => void;
}

interface ControlsProps {
    isPlaying: boolean;
    onTogglePlay: () => void;
    currentTime: number;
    duration: number;
    onSeek: (time: number) => void;
    playbackRate: number;
    onSetPlaybackRate: (rate: number) => void;
    lookAheadTime: number;
    minLookAheadTime: number;
    onSetLookAheadTime: (time: number | null) => void;
    visualSettings: VisualSettings;
    songSettings?: SongSettings;
    isLooping: boolean;
    loopStart: number;
    loopEnd: number;
    onToggleLoop: () => void;
    onSetLoop: (start: number, end: number) => void;
    onExit?: () => void;
}

const SPEED_PRESETS = [1.0, 0.75, 0.5, 0.25];

function ScrollingText({ text, className, testId }: { text: string; className?: string; testId?: string }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        const textEl = textRef.current;
        if (!container || !textEl) return;

        const updateOverflow = () => {
            const overflow = container.scrollWidth - container.clientWidth;
            if (overflow > 0) {
                textEl.style.setProperty('--marquee-offset', `-${overflow}px`);
                textEl.classList.add('animate-marquee-bounce');
            } else {
                textEl.style.removeProperty('--marquee-offset');
                textEl.classList.remove('animate-marquee-bounce');
            }
        };

        updateOverflow();

        const ro = new ResizeObserver(updateOverflow);
        ro.observe(container);

        return () => {
            ro.disconnect();
            textEl.style.removeProperty('--marquee-offset');
            textEl.classList.remove('animate-marquee-bounce');
        };
    }, [text]);

    return (
        <div ref={containerRef} className={`overflow-hidden ${className ?? ''}`} data-testid={testId}>
            <span ref={textRef} className="inline-block whitespace-nowrap">
                {text}
            </span>
        </div>
    );
}

export const Controls = memo(function Controls({
    isPlaying,
    onTogglePlay,
    currentTime,
    duration,
    onSeek,
    playbackRate,
    onSetPlaybackRate,
    lookAheadTime,
    minLookAheadTime,
    onSetLookAheadTime,
    visualSettings,
    songSettings,
    isLooping,
    loopStart,
    loopEnd,
    onToggleLoop,
    onSetLoop,
    onExit
}: ControlsProps) {

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSongMenuOpen, setIsSongMenuOpen] = useState(false);

    const cycleSpeed = () => {
        const currentIndex = SPEED_PRESETS.indexOf(playbackRate);
        const nextIndex = currentIndex === -1
            ? SPEED_PRESETS.indexOf(1.0)
            : (currentIndex + 1) % SPEED_PRESETS.length;
        onSetPlaybackRate(SPEED_PRESETS[nextIndex]);
    };
    const { isFullscreen, toggleFullscreen, isSupported } = useFullscreen();
    const isTouch = useTouchDevice();
    const { theme, setTheme } = useTheme();

    useEffect(() => {
        if (!isSettingsOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                setIsSettingsOpen(false);
                setIsSongMenuOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown, true);
        return () => window.removeEventListener("keydown", handleKeyDown, true);
    }, [isSettingsOpen]);

    // Load persisted songs on mount
    useEffect(() => {
        if (!songSettings) return;

        try {
            const saved = localStorage.getItem('chord_rain_uploads');
            if (saved) {
                const uploads: Song[] = JSON.parse(saved);
                const existingIds = new Set(songSettings.songs.map(s => s.id));
                const newUploads = uploads.filter(u => !existingIds.has(u.id));

                if (newUploads.length > 0) {
                    newUploads.forEach(s => songSettings.songs.push(s));
                }
            }
        } catch (e) {
            console.error("Failed to load saved songs", e);
        }
    }, [songSettings]);

    return (
        <div className="relative w-full">

            {/* Control Bar */}
            <div className={`relative w-full pixel-panel px-4 py-2 flex items-center justify-between gap-4 ${isTouch ? 'h-[72px] md:h-[80px]' : 'h-[56px] md:h-[64px]'}`}>

                {/* Timeline */}
                <div className={`absolute top-0 left-4 right-4 w-auto transition-none z-10 ${isLooping ? (isTouch ? '-mt-[32px]' : '-mt-[26px]') : '-mt-[10px]'}`}>
                    <Timeline
                        currentTime={currentTime}
                        duration={duration}
                        onSeek={onSeek}
                        isLooping={isLooping}
                        loopStart={loopStart}
                        loopEnd={loopEnd}
                        onSetLoop={onSetLoop}
                    />
                </div>

                {/* Left: Back + Song Info */}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                    {onExit && (
                        <button
                            onClick={onExit}
                            aria-label="Return to Song List"
                            title="Back to songs (Esc)"
                            className={`flex-shrink-0 flex items-center justify-center pixel-btn group ${isTouch ? 'w-10 h-10' : 'w-8 h-8'}`}
                        >
                            <svg className="w-4 h-4 transform transition-transform group-hover:-translate-x-0.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                    )}
                    {songSettings && (
                        <ScrollingText
                            text={`${songSettings.currentSong.title} / ${songSettings.currentSong.artist}`}
                            className="flex-1 min-w-0 text-xs font-semibold text-[var(--color-text)]"
                            testId="current-song-title"
                        />
                    )}
                    <span className="flex-shrink-0 text-[10px] font-mono text-[var(--color-muted)] w-8" data-testid="current-time">
                        {formatTime(currentTime)}
                    </span>
                </div>

                {/* Center: Playback controls */}
                <div className="flex-shrink-0 flex items-center gap-1.5">
                    <button
                        onClick={onToggleLoop}
                        aria-label="Toggle Loop"
                        title="Toggle loop"
                        className={`flex items-center justify-center pixel-btn ${isLooping ? 'pixel-btn-primary' : ''} ${isTouch ? 'w-10 h-10' : 'w-8 h-8'}`}
                    >
                        <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>

                    <button
                        onClick={() => {
                            onSeek(0);
                            if (isLooping) onToggleLoop();
                        }}
                        aria-label="Return to start"
                        title="Return to start (Home)"
                        className={`flex items-center justify-center pixel-btn ${isTouch ? 'w-10 h-10' : 'w-8 h-8'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                    </button>

                    <button
                        onClick={onTogglePlay}
                        data-testid="play-button"
                        aria-label={isPlaying ? "Pause" : "Play"}
                        title={isPlaying ? "Pause (Space)" : "Play (Space)"}
                        className={`flex items-center justify-center pixel-btn-primary ${isTouch ? 'w-12 h-12' : 'w-10 h-10'}`}
                    >
                        {isPlaying ? (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 ml-0.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                            </svg>
                        )}
                    </button>

                    <button
                        onClick={cycleSpeed}
                        aria-label={`Playback speed ${parseFloat(playbackRate.toFixed(2))}x — click to slow down`}
                        title={`Speed: ${parseFloat(playbackRate.toFixed(2))}x (click to slow down)`}
                        className={`flex items-center justify-center pixel-btn ${playbackRate !== 1.0 ? 'pixel-btn-primary' : ''} ${isTouch ? 'h-10 px-3' : 'h-8 px-2'}`}
                    >
                        <span className="font-mono font-bold text-[11px]">
                            {parseFloat(playbackRate.toFixed(2))}x
                        </span>
                    </button>
                </div>

                {/* Right: Duration + Fullscreen + Settings */}
                <div className="flex-shrink-0 flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-[var(--color-muted)] w-8 text-right" data-testid="duration">
                        {formatTime(duration)}
                    </span>
                    {isSupported && (
                        <button
                            onClick={toggleFullscreen}
                            data-testid="fullscreen-button"
                            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                            className={`flex items-center justify-center pixel-btn ${isTouch ? 'w-10 h-10' : 'w-8 h-8'}`}
                        >
                            {isFullscreen ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                                </svg>
                            )}
                        </button>
                    )}
                    <button
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        aria-label="Settings"
                        aria-expanded={isSettingsOpen}
                        title="Settings"
                        className={`flex items-center justify-center ${isSettingsOpen ? 'pixel-btn-primary' : 'pixel-btn'} ${isTouch ? 'w-10 h-10' : 'w-8 h-8'}`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>
                </div>
            </div>

            {/* Settings Popover */}
            <AnimatePresence>
                {isSettingsOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsSettingsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.15 }}
                            className={`absolute bottom-full right-0 mb-4 pixel-panel p-3 z-50 flex flex-col gap-3 ${isTouch ? 'w-[320px] max-h-[70vh] overflow-y-auto' : 'w-[280px]'}`}
                        >

                            {/* Song Selection */}
                            {songSettings && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider">Song</label>
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsSongMenuOpen(!isSongMenuOpen)}
                                            aria-label="Select song"
                                            aria-expanded={isSongMenuOpen}
                                            className={`w-full flex items-center justify-between pixel-inset text-sm text-[var(--color-text)] hover:text-[var(--color-text-bright)] ${isTouch ? 'p-3' : 'p-2'}`}
                                        >
                                            <span className="truncate">{songSettings.currentSong.title}</span>
                                            <svg className={`w-4 h-4 text-[var(--color-subtle)] transition-transform ${isSongMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </button>
                                        <AnimatePresence>
                                            {isSongMenuOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 5 }}
                                                    transition={{ duration: 0.1 }}
                                                    className="absolute bottom-full left-0 mb-2 w-full pixel-panel overflow-hidden max-h-[200px] overflow-y-auto"
                                                >
                                                    {songSettings.songs.map(song => (
                                                        <button
                                                            key={song.id}
                                                            onClick={() => {
                                                                songSettings.onSelectSong(song);
                                                                setIsSongMenuOpen(false);
                                                            }}
                                                            className={`w-full text-left px-3 text-xs ${isTouch ? 'py-3' : 'py-2'} ${song.id === songSettings.currentSong.id ? "bg-[var(--color-ui-active)] text-[var(--color-text-bright)]" : "text-[var(--color-subtle)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-text)]"}`}
                                                        >
                                                            <div className="font-bold">{song.title}</div>
                                                            <div className="opacity-70 text-[10px]">{song.artist}</div>
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            )}

                            <div className="pixel-divider" />

                            {/* Note Preview (Look-Ahead) */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider">
                                    <span>Note Preview</span>
                                    <span className="text-[var(--color-accent-primary)]">{lookAheadTime.toFixed(1)}s</span>
                                </div>
                                <div className="pixel-inset p-1">
                                    <input
                                        type="range"
                                        min={minLookAheadTime}
                                        max={8.0}
                                        step={0.1}
                                        value={lookAheadTime}
                                        onChange={(e) => onSetLookAheadTime(parseFloat(e.target.value))}
                                        aria-label="Note preview time"
                                        className={`w-full cursor-pointer bg-transparent appearance-none accent-[var(--color-accent-primary)] touch-none ${isTouch ? 'h-6' : 'h-2'}`}
                                    />
                                </div>
                                {lookAheadTime > minLookAheadTime && (
                                    <button
                                        onClick={() => onSetLookAheadTime(null)}
                                        className="text-[10px] text-[var(--color-subtle)] hover:text-[var(--color-text)] transition-colors"
                                    >
                                        Reset to default
                                    </button>
                                )}
                            </div>

                            <div className="pixel-divider" />

                            {/* Visual Settings */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider">Appearance</label>

                                <label className={`flex items-center justify-between cursor-pointer ${isTouch ? 'py-2' : 'py-1'}`}>
                                    <span className="text-sm text-[var(--color-text)]">Show Grid</span>
                                    <div className={`pixel-toggle ${visualSettings.showGrid ? 'pixel-toggle-on' : ''}`} role="switch" aria-checked={visualSettings.showGrid}>
                                        <input
                                            type="checkbox"
                                            checked={visualSettings.showGrid}
                                            onChange={(e) => visualSettings.setShowGrid(e.target.checked)}
                                            className="sr-only"
                                        />
                                        <div className="pixel-toggle-thumb" />
                                    </div>
                                </label>
                            </div>

                            <div className="pixel-divider" />

                            {/* Theme Selector */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider">Theme</label>
                                <div className="grid grid-cols-3 gap-1">
                                    {THEMES.map((t) => (
                                        <button
                                            key={t.id}
                                            onClick={() => setTheme(t.id as Theme)}
                                            className={`flex flex-col items-center text-[10px] px-1 ${isTouch ? 'py-3' : 'py-2'} ${theme === t.id ? 'pixel-btn-primary' : 'pixel-btn'}`}
                                            title={t.description}
                                        >
                                            <div className="flex gap-[2px] mb-1">
                                                {t.swatches.map((color, i) => (
                                                    <div key={i} className={`${isTouch ? 'w-3 h-3' : 'w-2 h-2'}`} style={{ backgroundColor: color, border: '1px solid rgba(0,0,0,0.3)' }} />
                                                ))}
                                            </div>
                                            {t.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                        </motion.div>
                    </>
                )}
            </AnimatePresence>

        </div>
    );
});
