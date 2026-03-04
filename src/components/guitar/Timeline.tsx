import { useRef, useEffect, useState } from "react";
import { formatTime } from "@/lib/utils";
import { useTouchDevice } from "@/hooks/useTouchDevice";

interface TimelineProps {
    currentTime: number;
    duration: number;
    onSeek: (time: number) => void;
    isLooping: boolean;
    loopStart: number;
    loopEnd: number;
    onSetLoop: (start: number, end: number) => void;
}

export function Timeline({
    currentTime,
    duration,
    onSeek,
    isLooping,
    loopStart,
    loopEnd,
    onSetLoop
}: TimelineProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState<'start' | 'end' | 'seek' | null>(null);
    const isTouch = useTouchDevice();

    // Ensure loop points are valid
    const safeStart = Math.max(0, loopStart);
    const safeEnd = Math.min(duration, loopEnd > 0 ? loopEnd : duration);

    const handleInteraction = (e: React.MouseEvent | React.TouchEvent, type: 'start' | 'end' | 'seek') => {
        setIsDragging(type);
    };

    useEffect(() => {
        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (!isDragging || !containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;

            let percent = (clientX - rect.left) / rect.width;
            percent = Math.max(0, Math.min(1, percent));

            const time = percent * duration;

            if (isDragging === 'seek') {
                onSeek(time);
            } else if (isDragging === 'start') {
                const newStart = Math.min(time, safeEnd - 0.1);
                onSetLoop(newStart, safeEnd);
            } else if (isDragging === 'end') {
                const newEnd = Math.max(time, safeStart + 0.1);
                onSetLoop(safeStart, newEnd);
            }
        };

        const handleUp = () => {
            setIsDragging(null);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleUp);
            window.addEventListener('touchmove', handleMove);
            window.addEventListener('touchend', handleUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleUp);
        };
    }, [isDragging, duration, safeStart, safeEnd, onSeek, onSetLoop]);

    const progressPercent = Math.min(100, Math.max(0, (currentTime / (duration || 1)) * 100));
    const loopStartPercent = (safeStart / (duration || 1)) * 100;
    const loopEndPercent = (safeEnd / (duration || 1)) * 100;

    return (
        <div
            ref={containerRef}
            className={`relative w-full group select-none ${isLooping ? (isTouch ? 'h-10 mt-3 mb-2' : 'h-8 mt-2 mb-1') : 'h-[2px] -mt-[1px] hover:h-2'}`}
        >
            {/* Background Track */}
            <div
                className={`absolute inset-x-0 top-1/2 -translate-y-1/2 overflow-hidden ${isTouch ? 'h-2' : 'h-1'}`}
                style={{
                    backgroundColor: 'var(--color-void)',
                    boxShadow: 'inset 1px 1px 0 0 var(--color-border)'
                }}
            >
                {isLooping && (
                    <div
                        className="absolute top-0 h-full"
                        style={{
                            left: `${loopStartPercent}%`,
                            width: `${loopEndPercent - loopStartPercent}%`,
                            backgroundColor: 'var(--color-ui-active)',
                            opacity: 0.3
                        }}
                    />
                )}
            </div>

            {/* Progress Fill */}
            <div
                className="absolute inset-y-0 left-0 pointer-events-none"
                style={{
                    top: isLooping ? '50%' : '0',
                    height: isLooping ? (isTouch ? '8px' : '4px') : '100%',
                    transform: isLooping ? 'translateY(-50%)' : 'none',
                    width: `${progressPercent}%`,
                    backgroundColor: 'var(--color-accent-primary)'
                }}
            />

            {/* Loop Handles */}
            {isLooping && (
                <>
                    <div
                        className={`absolute top-1/2 -translate-y-1/2 cursor-ew-resize group/start z-20 flex items-center justify-center -ml-2 ${isTouch ? 'w-8 h-12' : 'w-4 h-8'}`}
                        style={{ left: `${loopStartPercent}%` }}
                        onMouseDown={(e) => handleInteraction(e, 'start')}
                        onTouchStart={(e) => handleInteraction(e, 'start')}
                    >
                        <div
                            className={`${isTouch ? 'w-2 h-6' : 'w-1 h-4'}`}
                            style={{ backgroundColor: 'var(--color-accent-primary)' }}
                        />
                        <div
                            className="absolute bottom-full mb-1 text-[10px] px-1 opacity-0 group-hover/start:opacity-100 pointer-events-none whitespace-nowrap"
                            style={{
                                backgroundColor: 'var(--color-surface)',
                                color: 'var(--color-text)',
                                border: '1px solid var(--color-border)'
                            }}
                        >
                            {formatTime(safeStart)}
                        </div>
                    </div>

                    <div
                        className={`absolute top-1/2 -translate-y-1/2 cursor-ew-resize group/end z-20 -ml-2 flex items-center justify-center ${isTouch ? 'w-8 h-12' : 'w-4 h-8'}`}
                        style={{ left: `${loopEndPercent}%` }}
                        onMouseDown={(e) => handleInteraction(e, 'end')}
                        onTouchStart={(e) => handleInteraction(e, 'end')}
                    >
                        <div
                            className={`${isTouch ? 'w-2 h-6' : 'w-1 h-4'}`}
                            style={{ backgroundColor: 'var(--color-accent-primary)' }}
                        />
                        <div
                            className="absolute bottom-full mb-1 text-[10px] px-1 opacity-0 group-hover/end:opacity-100 pointer-events-none whitespace-nowrap"
                            style={{
                                backgroundColor: 'var(--color-surface)',
                                color: 'var(--color-text)',
                                border: '1px solid var(--color-border)'
                            }}
                        >
                            {formatTime(safeEnd)}
                        </div>
                    </div>
                </>
            )}

            {/* Seek Interaction Layer */}
            <div
                className="absolute inset-0 cursor-pointer z-10 touch-none"
                onMouseDown={(e) => handleInteraction(e, 'seek')}
                onTouchStart={(e) => handleInteraction(e, 'seek')}
            />
        </div>
    );
}
