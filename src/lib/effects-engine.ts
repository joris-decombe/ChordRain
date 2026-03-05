/**
 * Imperative effects engine for canvas rendering.
 * Adapted for guitar fretboard — uses getNotePosition() instead of getKeyPosition().
 */

import { ParticleSystem } from "@/lib/particles";
import { getNotePosition, getTotalFretboardWidth } from "@/lib/fretboard-geometry";

/** Helper to get center x and width from getNotePosition. */
function getNoteCenterAndWidth(string: number, fret: number): { centerX: number; width: number } {
    const pos = getNotePosition(string, fret);
    return { centerX: pos.x + pos.width / 2, width: pos.width };
}
import {
    GOD_RAY_WIDTH,
    GOD_RAY_OPACITY_BASE,
    GOD_RAY_OPACITY_VARY,
    BLOOM_BURST_THRESHOLD,
    THEME_PARTICLE_BEHAVIORS,
    THEME_COLOR_GRADES,
    THEME_VFX_PROFILES,
} from "@/lib/vfx-constants";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface EffectsNote {
    note: string;
    midi: number;
    string: number;
    fret: number;
    color: string;
    startTick: number;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface ImpactFlash {
    startTime: number;
    left: number;
    width: number;
    color: string;
}

interface PhosphorTrace {
    color: string;
    startTime: number;
    x: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const IMPACT_FLASH_DURATION = 200;

const DEBRIS_COOLDOWN = 250;

const FRESH_NOTE_WINDOW = 300;
const NOTE_ACTIVATION_MAX_AGE = 1000;

const THEME_ACCENTS: Record<string, string> = {
    cool: "#38bdf8",
    warm: "#f59e0b",
    mono: "#22c55e",
    "8bit": "#e52521",
    "16bit": "#f08030",
    hibit: "#ff6188",
};

const THEME_ATMOSPHERE: Record<string, string> = {
    cool: "#6366f1",
    warm: "#f59e0b",
    mono: "#22c55e",
    "8bit": "#ff3232",
    "16bit": "#f08030",
    hibit: "#ab9df2",
};

// ---------------------------------------------------------------------------
// Module-level helpers
// ---------------------------------------------------------------------------

function parseColor(color: string): { r: number; g: number; b: number } | null {
    if (color.startsWith("var(")) {
        const varName = color.match(/var\((--[^)]+)\)/)?.[1];
        if (varName && typeof window !== "undefined") {
            const resolved = getComputedStyle(document.documentElement)
                .getPropertyValue(varName)
                .trim();
            if (resolved) return parseColor(resolved);
        }
    }

    const hex = color.match(/^#([0-9a-f]{6})$/i);
    if (hex) {
        const v = parseInt(hex[1], 16);
        return { r: (v >> 16) & 0xff, g: (v >> 8) & 0xff, b: v & 0xff };
    }
    const rgb = color.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/);
    if (rgb) {
        return { r: parseInt(rgb[1]), g: parseInt(rgb[2]), b: parseInt(rgb[3]) };
    }
    return null;
}

function shiftHue(
    r: number,
    g: number,
    b: number,
    shift: number,
): { r: number; g: number; b: number } {
    const cos = Math.cos(shift);
    const sin = Math.sin(shift);
    return {
        r: Math.round(
            Math.min(255, Math.max(0,
                r * (0.667 + cos * 0.333) +
                g * (0.333 - cos * 0.333 + sin * 0.577) +
                b * (0.333 - cos * 0.333 - sin * 0.577),
            )),
        ),
        g: Math.round(
            Math.min(255, Math.max(0,
                r * (0.333 - cos * 0.333 - sin * 0.577) +
                g * (0.667 + cos * 0.333) +
                b * (0.333 - cos * 0.333 + sin * 0.577),
            )),
        ),
        b: Math.round(
            Math.min(255, Math.max(0,
                r * (0.333 - cos * 0.333 + sin * 0.577) +
                g * (0.333 - cos * 0.333 - sin * 0.577) +
                b * (0.667 + cos * 0.333),
            )),
        ),
    };
}

// ---------------------------------------------------------------------------
// EffectsEngine
// ---------------------------------------------------------------------------

export class EffectsEngine {
    // --- Public mutable properties (set by React wrapper) ---
    containerHeight = 0;
    impactY = 0;
    theme = "cool";
    isPlaying = false;
    activeNotes: EffectsNote[] = [];

    // --- Internal state ---
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private bloomCanvas: HTMLCanvasElement;
    private bloomCtx: CanvasRenderingContext2D | null;

    private particles: ParticleSystem;
    private prevNotes = new Set<string>();
    private phosphorTraces: PhosphorTrace[] = [];
    private impactFlashes: ImpactFlash[] = [];
    private lastTime = 0;
    private rafId = 0;
    private running = false;

    private lastDebrisTime = 0;

    private noteActivationTimes = new Map<string, number>();

    private totalWidth: number;

    private lastCanvasW = 0;
    private lastCanvasH = 0;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not get 2d context from canvas");
        this.ctx = ctx;
        this.ctx.imageSmoothingEnabled = false;

        this.bloomCanvas = document.createElement("canvas");
        this.bloomCtx = this.bloomCanvas.getContext("2d");

        this.particles = new ParticleSystem();
        this.totalWidth = getTotalFretboardWidth();
    }

    start(): void {
        if (this.running) return;
        this.running = true;
        this.lastTime = 0;
        this.rafId = requestAnimationFrame(this.loop);
    }

    stop(): void {
        if (!this.running) return;
        this.running = false;
        cancelAnimationFrame(this.rafId);
        this.rafId = 0;
    }

    reset(): void {
        this.particles.clear();
        this.prevNotes = new Set();
        this.phosphorTraces = [];
        this.impactFlashes = [];
        this.noteActivationTimes.clear();
        this.lastDebrisTime = 0;
        this.lastTime = 0;
    }

    destroy(): void {
        this.stop();
        this.reset();
    }

    emitForNewNotes(notes: EffectsNote[]): void {
        const currentKeys = new Set(notes.map((n) => `${n.midi}-${n.startTick}`));
        const prevKeys = this.prevNotes;
        const now = performance.now();

        const behavior = THEME_PARTICLE_BEHAVIORS[this.theme] || THEME_PARTICLE_BEHAVIORS.cool;
        const sizeMin = behavior.sizeRange[0];
        const sizeMax = behavior.sizeRange[1];
        const themeSize = sizeMin + Math.random() * (sizeMax - sizeMin);

        for (const n of notes) {
            const key = `${n.midi}-${n.startTick}`;
            if (!prevKeys.has(key)) {
                const { centerX, width: noteWidth_ } = getNoteCenterAndWidth(n.string, n.fret);

                this.particles.emit({
                    x: centerX,
                    y: this.impactY,
                    color: n.color,
                    count: 14,
                    speed: 100 * behavior.speedMul,
                    size: themeSize,
                    lifetime: 0.7 * behavior.lifetimeMul,
                    type: behavior.impactType,
                    z: 1.0,
                    gravityMul: behavior.gravityMul
                });

                this.particles.emit({
                    x: centerX,
                    y: this.impactY,
                    color: n.color,
                    count: 4,
                    speed: 150 * behavior.speedMul,
                    size: themeSize + 1,
                    lifetime: 0.8 * behavior.lifetimeMul,
                    type: behavior.impactType,
                    z: 1.5,
                    gravityMul: behavior.gravityMul
                });

                this.particles.emit({
                    x: centerX,
                    y: this.impactY,
                    color: n.color,
                    count: 1,
                    speed: 0,
                    size: 6,
                    lifetime: 0.35,
                    type: "shockwave",
                });

                this.particles.emit({
                    x: centerX,
                    y: this.impactY,
                    color: n.color,
                    count: 1,
                    speed: 0,
                    size: 8,
                    lifetime: 0.5,
                    type: "shockwave",
                });

                const noteWidth = noteWidth_;
                this.impactFlashes.push({
                    startTime: now,
                    left: centerX - noteWidth / 2,
                    width: noteWidth,
                    color: n.color,
                });

                this.noteActivationTimes.set(key, now);
            }
        }

        // Debris for sustained notes
        if (this.isPlaying && now - this.lastDebrisTime >= DEBRIS_COOLDOWN) {
            for (const n of notes) {
                if (Math.random() > 0.8) {
                    const { centerX: cx, width: w } = getNoteCenterAndWidth(n.string, n.fret);
                    this.particles.emit({
                        x: cx + (Math.random() - 0.5) * w,
                        y: this.impactY - 10,
                        color: n.color,
                        count: 1,
                        speed: 35,
                        spread: Math.PI / 4,
                        size: 2,
                        lifetime: 0.5,
                        type: "debris",
                    });
                }
            }
            this.lastDebrisTime = now;
        }

        this.impactFlashes = this.impactFlashes.filter(
            (f) => now - f.startTime < IMPACT_FLASH_DURATION,
        );

        // Phosphor persistence
        const vfxProfile = THEME_VFX_PROFILES[this.theme] || THEME_VFX_PROFILES.cool;
        const accentColor = THEME_ACCENTS[this.theme] || THEME_ACCENTS.cool;
        for (const prevKey of prevKeys) {
            if (!currentKeys.has(prevKey)) {
                // Extract midi from key to get approximate position
                const midi = parseInt(prevKey);
                this.phosphorTraces.push({
                    color: accentColor,
                    startTime: now,
                    x: this.totalWidth * (midi - 40) / 46, // Approximate x from MIDI range
                });
            }
        }
        this.phosphorTraces = this.phosphorTraces.filter(
            (t) => now - t.startTime < vfxProfile.phosphorDuration,
        );

        // Clean up old note activation entries
        for (const [key, activationTime] of this.noteActivationTimes) {
            if (now - activationTime > NOTE_ACTIVATION_MAX_AGE) {
                this.noteActivationTimes.delete(key);
            }
        }

        this.prevNotes = currentKeys;
    }

    // ------------------------------------------------------------------
    // rAF loop
    // ------------------------------------------------------------------

    private loop = (time: number): void => {
        if (!this.running) return;

        const dt = this.lastTime
            ? Math.min((time - this.lastTime) / 1000, 0.05)
            : 0.016;
        this.lastTime = time;

        const { canvas, ctx } = this;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        this.syncBloomCanvas();

        this.drawGodRays(ctx, time);

        this.particles.floorY = this.impactY;
        if (this.isPlaying) {
            this.emitAmbientSpores();
            this.particles.update(dt);
        }

        this.particles.draw(ctx);
        this.drawKeyGlow(ctx, this.activeNotes, time);
        this.drawNoteTrails(ctx, this.activeNotes);
        this.drawLightBeams(ctx, this.activeNotes, time);
        this.drawImpactRail(ctx, this.activeNotes);
        this.drawImpactFlash(ctx, time);
        this.drawPhosphor(ctx, time);

        if (this.bloomCtx && (this.activeNotes.length > 0 || this.particles.activeBurstCount > BLOOM_BURST_THRESHOLD)) {
            this.applyBloom(ctx, canvas);
        }

        this.drawColorGrade(ctx, canvas);
        this.drawScanlines(ctx, canvas);

        this.rafId = requestAnimationFrame(this.loop);
    };

    // ------------------------------------------------------------------
    // Bloom canvas management
    // ------------------------------------------------------------------

    private syncBloomCanvas(): void {
        const { canvas } = this;
        if (canvas.width !== this.lastCanvasW || canvas.height !== this.lastCanvasH) {
            const bloomScale = 0.25;
            this.bloomCanvas.width = Math.max(1, Math.round(canvas.width * bloomScale));
            this.bloomCanvas.height = Math.max(1, Math.round(canvas.height * bloomScale));
            this.lastCanvasW = canvas.width;
            this.lastCanvasH = canvas.height;
        }
    }

    private applyBloom(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
        if (canvas.width === 0 || canvas.height === 0) return;

        const bloomCtx = this.bloomCtx!;
        const bloomCanvas = this.bloomCanvas;
        const profile = THEME_VFX_PROFILES[this.theme] || THEME_VFX_PROFILES.cool;

        bloomCtx.clearRect(0, 0, bloomCanvas.width, bloomCanvas.height);
        bloomCtx.imageSmoothingEnabled = true;
        bloomCtx.drawImage(canvas, 0, 0, bloomCanvas.width, bloomCanvas.height);

        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.imageSmoothingEnabled = true;

        if (profile.chromaticOffset > 0) {
            ctx.globalAlpha = profile.chromaticAlpha;
            ctx.drawImage(bloomCanvas, -profile.chromaticOffset, 0, canvas.width, canvas.height);
            ctx.drawImage(bloomCanvas, profile.chromaticOffset, 0, canvas.width, canvas.height);
        }

        ctx.globalAlpha = profile.bloomAlpha;
        ctx.drawImage(bloomCanvas, 0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    // ------------------------------------------------------------------
    // Drawing routines
    // ------------------------------------------------------------------

    private drawGodRays(ctx: CanvasRenderingContext2D, time: number): void {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        const atmosphereColor = THEME_ATMOSPHERE[this.theme] || THEME_ATMOSPHERE.cool;
        const parsed = parseColor(atmosphereColor)!;
        const shimmer = 0.5 + 0.5 * Math.sin(time * 0.001);

        const rayWidth = GOD_RAY_WIDTH;
        const rays = [
            { x: this.totalWidth * 0.2, angle: Math.PI * 0.2 },
            { x: this.totalWidth * 0.5, angle: Math.PI * 0.15 },
            { x: this.totalWidth * 0.8, angle: Math.PI * 0.25 }
        ];

        rays.forEach((ray, i) => {
            const opacity = (GOD_RAY_OPACITY_BASE + GOD_RAY_OPACITY_VARY * Math.sin(time * 0.0007 + i)) * shimmer;
            const grad = ctx.createLinearGradient(ray.x, 0, ray.x + Math.tan(ray.angle) * this.containerHeight, this.containerHeight);
            grad.addColorStop(0, `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, 0)`);
            grad.addColorStop(0.5, `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${opacity})`);
            grad.addColorStop(1, `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, 0)`);

            ctx.fillStyle = grad;

            ctx.beginPath();
            ctx.moveTo(ray.x - rayWidth / 2, 0);
            ctx.lineTo(ray.x + rayWidth / 2, 0);
            ctx.lineTo(ray.x + rayWidth / 2 + Math.tan(ray.angle) * this.containerHeight, this.containerHeight);
            ctx.lineTo(ray.x - rayWidth / 2 + Math.tan(ray.angle) * this.containerHeight, this.containerHeight);
            ctx.fill();
        });

        ctx.restore();
    }

    private emitAmbientSpores(): void {
        const behavior = THEME_PARTICLE_BEHAVIORS[this.theme] || THEME_PARTICLE_BEHAVIORS.cool;
        if (Math.random() > (1 - behavior.ambientRate)) {
            const atmosphereColor = THEME_ATMOSPHERE[this.theme] || THEME_ATMOSPHERE.cool;
            const x = Math.random() * this.totalWidth;
            const y = Math.random() * this.containerHeight;
            const z = Math.random() * 2;
            const sizeMin = behavior.sizeRange[0];
            const sizeMax = behavior.sizeRange[1];

            this.particles.emit({
                x, y,
                color: atmosphereColor,
                count: 1,
                speed: 10 * behavior.speedMul,
                size: z > 1.2 ? sizeMax : sizeMin,
                lifetime: (2 + Math.random() * 3) * behavior.lifetimeMul,
                type: behavior.ambientType,
                z,
                gravityMul: behavior.gravityMul
            });
        }
    }

    private drawKeyGlow(
        ctx: CanvasRenderingContext2D,
        notes: EffectsNote[],
        time: number,
    ): void {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        const pulse = 0.85 + 0.15 * Math.sin(time * 0.002 * Math.PI * 4);
        const hueShift = time * 0.0001;

        for (const n of notes) {
            let parsed = parseColor(n.color);
            if (!parsed) continue;

            parsed = shiftHue(parsed.r, parsed.g, parsed.b, hueShift);

            const { centerX } = getNoteCenterAndWidth(n.string, n.fret);
            const radius = 24;

            const baseAlpha = 0.35 * pulse;
            const midAlpha = 0.12 * pulse;

            const grad = ctx.createRadialGradient(
                centerX, this.impactY, 0,
                centerX, this.impactY, radius,
            );
            grad.addColorStop(0, `rgba(${parsed.r},${parsed.g},${parsed.b},${baseAlpha})`);
            grad.addColorStop(0.5, `rgba(${parsed.r},${parsed.g},${parsed.b},${midAlpha})`);
            grad.addColorStop(1, `rgba(${parsed.r},${parsed.g},${parsed.b},0)`);

            ctx.fillStyle = grad;
            ctx.fillRect(
                Math.round(centerX - radius),
                Math.round(this.impactY - radius),
                Math.round(radius * 2),
                Math.round(radius * 2),
            );
        }

        ctx.restore();
    }

    private drawNoteTrails(
        ctx: CanvasRenderingContext2D,
        notes: EffectsNote[],
    ): void {
        const trailHeight = 5;

        for (const n of notes) {
            const parsed = parseColor(n.color);
            if (!parsed) continue;

            const { centerX, width: noteW } = getNoteCenterAndWidth(n.string, n.fret);

            const grad = ctx.createLinearGradient(0, this.impactY - trailHeight, 0, this.impactY);
            grad.addColorStop(0, `rgba(${parsed.r},${parsed.g},${parsed.b},0)`);
            grad.addColorStop(1, `rgba(${parsed.r},${parsed.g},${parsed.b},0.4)`);

            ctx.fillStyle = grad;
            ctx.fillRect(
                Math.round(centerX - noteW / 2),
                Math.round(this.impactY - trailHeight),
                noteW,
                trailHeight,
            );
        }
    }

    private drawImpactFlash(ctx: CanvasRenderingContext2D, now: number): void {
        const flashes = this.impactFlashes;
        if (flashes.length === 0) return;

        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        for (const f of flashes) {
            const elapsed = now - f.startTime;
            if (elapsed >= IMPACT_FLASH_DURATION) continue;

            const progress = elapsed / IMPACT_FLASH_DURATION;
            const alpha = 0.7 * (1 - progress) * (1 - progress);

            const parsed = parseColor(f.color);
            const r = parsed ? Math.round((255 + parsed.r) / 2) : 255;
            const g = parsed ? Math.round((255 + parsed.g) / 2) : 255;
            const b = parsed ? Math.round((255 + parsed.b) / 2) : 255;

            // Hot flash on the strike line
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            ctx.fillRect(
                Math.round(f.left - 2),
                Math.round(this.impactY - 8),
                f.width + 4,
                8,
            );

            // Expanding burst glow
            const burstRadius = f.width * (1 + progress * 1.5);
            const centerX = f.left + f.width / 2;
            const burstGrad = ctx.createRadialGradient(
                centerX, this.impactY, 0,
                centerX, this.impactY, burstRadius,
            );
            burstGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.6})`);
            burstGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
            ctx.fillStyle = burstGrad;
            ctx.fillRect(
                Math.round(centerX - burstRadius),
                Math.round(this.impactY - burstRadius),
                Math.round(burstRadius * 2),
                Math.round(burstRadius * 2),
            );
        }

        ctx.restore();
    }

    private drawPhosphor(ctx: CanvasRenderingContext2D, now: number): void {
        const traces = this.phosphorTraces;
        if (traces.length === 0) return;

        const profile = THEME_VFX_PROFILES[this.theme] || THEME_VFX_PROFILES.cool;
        const phosphorColor = profile.phosphorColor;

        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        for (const t of traces) {
            const elapsed = now - t.startTime;
            if (elapsed >= profile.phosphorDuration) continue;

            const alpha = 0.3 * (1 - elapsed / profile.phosphorDuration);
            const centerX = t.x;
            const radius = 20;

            const grad = ctx.createRadialGradient(
                centerX, this.impactY, 0,
                centerX, this.impactY, radius,
            );
            grad.addColorStop(0, `rgba(${phosphorColor.r},${phosphorColor.g},${phosphorColor.b},${alpha})`);
            grad.addColorStop(1, `rgba(${phosphorColor.r},${phosphorColor.g},${phosphorColor.b},0)`);

            ctx.fillStyle = grad;
            ctx.fillRect(
                Math.round(centerX - radius),
                Math.round(this.impactY - radius),
                Math.round(radius * 2),
                Math.round(radius * 2),
            );
        }

        ctx.restore();
    }

    private drawLightBeams(
        ctx: CanvasRenderingContext2D,
        notes: EffectsNote[],
        time: number,
    ): void {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        for (const n of notes) {
            const parsed = parseColor(n.color);
            if (!parsed) continue;

            const { centerX, width: noteW } = getNoteCenterAndWidth(n.string, n.fret);

            const key = `${n.midi}`;
            const activationTime = this.noteActivationTimes.get(key);
            let freshness = 0;
            if (activationTime !== undefined) {
                const elapsed = time - activationTime;
                if (elapsed < FRESH_NOTE_WINDOW) {
                    freshness = 1 - elapsed / FRESH_NOTE_WINDOW;
                }
            }

            const beamHeight = 120 + 60 * freshness;
            const beamAlpha = 0.15 + 0.25 * freshness;

            const grad = ctx.createLinearGradient(0, this.impactY - beamHeight, 0, this.impactY);
            grad.addColorStop(0, "rgba(255, 255, 255, 0)");
            grad.addColorStop(1, `rgba(${parsed.r},${parsed.g},${parsed.b},${beamAlpha})`);

            ctx.fillStyle = grad;
            ctx.fillRect(
                Math.round(centerX - noteW / 2 + 1),
                Math.round(this.impactY - beamHeight),
                noteW - 2,
                beamHeight,
            );
        }
        ctx.restore();
    }

    private drawImpactRail(
        ctx: CanvasRenderingContext2D,
        notes: EffectsNote[],
    ): void {
        ctx.save();
        const railHeight = 4;
        const y = this.impactY - railHeight;

        const themeColor = THEME_ACCENTS[this.theme] || THEME_ACCENTS.cool;
        const parsedTheme = parseColor(themeColor)!;

        // Base rail glow
        const baseGrad = ctx.createLinearGradient(0, y - 4, 0, y + railHeight + 4);
        baseGrad.addColorStop(0, "rgba(0,0,0,0)");
        baseGrad.addColorStop(0.3, `rgba(${parsedTheme.r}, ${parsedTheme.g}, ${parsedTheme.b}, 0.08)`);
        baseGrad.addColorStop(0.5, `rgba(${parsedTheme.r}, ${parsedTheme.g}, ${parsedTheme.b}, 0.25)`);
        baseGrad.addColorStop(0.7, `rgba(${parsedTheme.r}, ${parsedTheme.g}, ${parsedTheme.b}, 0.08)`);
        baseGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = baseGrad;
        ctx.fillRect(0, Math.round(y - 4), this.totalWidth, railHeight + 8);

        // Bright center line
        ctx.fillStyle = `rgba(${parsedTheme.r}, ${parsedTheme.g}, ${parsedTheme.b}, 0.5)`;
        ctx.fillRect(0, Math.round(y + 1), this.totalWidth, 2);

        ctx.globalCompositeOperation = "lighter";
        for (const n of notes) {
            const parsed = parseColor(n.color);
            if (!parsed) continue;

            const { centerX, width } = getNoteCenterAndWidth(n.string, n.fret);
            const left = centerX - width / 2;

            // Hot spot on rail where note meets strike line
            const grad = ctx.createLinearGradient(0, y, 0, y + railHeight);
            grad.addColorStop(0, `rgba(${parsed.r},${parsed.g},${parsed.b}, 1)`);
            grad.addColorStop(0.5, "rgba(255, 255, 255, 1)");
            grad.addColorStop(1, `rgba(${parsed.r},${parsed.g},${parsed.b}, 1)`);

            ctx.fillStyle = grad;
            ctx.fillRect(Math.round(left), Math.round(y), width, railHeight);

            // Bloom around active strike points
            const bloomGrad = ctx.createRadialGradient(
                centerX, y + railHeight / 2, 0,
                centerX, y + railHeight / 2, width * 1.5,
            );
            bloomGrad.addColorStop(0, `rgba(${parsed.r},${parsed.g},${parsed.b}, 0.6)`);
            bloomGrad.addColorStop(0.5, `rgba(${parsed.r},${parsed.g},${parsed.b}, 0.15)`);
            bloomGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
            ctx.fillStyle = bloomGrad;
            ctx.fillRect(
                Math.round(left - width),
                Math.round(y - 14),
                width * 3,
                28 + railHeight,
            );
        }
        ctx.restore();
    }

    private drawScanlines(
        ctx: CanvasRenderingContext2D,
        canvas: HTMLCanvasElement,
    ): void {
        const profile = THEME_VFX_PROFILES[this.theme] || THEME_VFX_PROFILES.cool;
        if (profile.scanlineAlpha <= 0) return;

        ctx.save();
        ctx.fillStyle = `rgba(0,0,0,${profile.scanlineAlpha})`;
        for (let y = 0; y < canvas.height; y += 2) {
            ctx.fillRect(0, y, canvas.width, 1);
        }
        ctx.restore();
    }

    private drawColorGrade(
        ctx: CanvasRenderingContext2D,
        canvas: HTMLCanvasElement,
    ): void {
        const grade = THEME_COLOR_GRADES[this.theme];
        if (!grade) return;

        ctx.save();
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = grade.shadowTint;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = grade.highlightTint;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.restore();
    }
}
