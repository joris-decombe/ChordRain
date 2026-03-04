/**
 * Constants for Dead Cells style VFX and Game Feel.
 */

export const PARTICLE_Z_MIN = 0;
export const PARTICLE_Z_MAX = 2.0;
export const PARTICLE_PLAY_PLANE = 1.0;

/** Scaling factor for particle physics and size based on Z depth */
export const getZScale = (z: number) => 0.5 + (z * 0.5);

/** God Ray Constants */
export const GOD_RAY_WIDTH = 120;
export const GOD_RAY_OPACITY_BASE = 0.04;
export const GOD_RAY_OPACITY_VARY = 0.02;

/** Bloom Thresholds */
export const BLOOM_BURST_THRESHOLD = 5;

// ---------------------------------------------------------------------------
// Theme-Specific Particle Behaviors
// ---------------------------------------------------------------------------

export type ThemeParticleType = 'burst' | 'debris' | 'shockwave' | 'spore' | 'ember' | 'pixel_debris' | 'phosphor_flicker';

export interface ThemeParticleBehavior {
    impactType: ThemeParticleType;
    ambientType: ThemeParticleType;
    gravityMul: number;
    speedMul: number;
    sizeRange: [number, number];
    lifetimeMul: number;
    ambientRate: number; // chance per frame (0-1)
}

export const THEME_PARTICLE_BEHAVIORS: Record<string, ThemeParticleBehavior> = {
    cool:  { impactType: 'burst',   ambientType: 'spore',            gravityMul: 1.0,  speedMul: 1.0, sizeRange: [2, 4], lifetimeMul: 1.0, ambientRate: 0.10 },
    warm:  { impactType: 'ember',   ambientType: 'ember',            gravityMul: -0.3, speedMul: 0.7, sizeRange: [1, 3], lifetimeMul: 1.5, ambientRate: 0.12 },
    mono:  { impactType: 'burst',   ambientType: 'phosphor_flicker', gravityMul: 0.2,  speedMul: 0.5, sizeRange: [2, 3], lifetimeMul: 2.0, ambientRate: 0.08 },
    "8bit":  { impactType: 'pixel_debris', ambientType: 'pixel_debris', gravityMul: 2.0,  speedMul: 1.3, sizeRange: [3, 5], lifetimeMul: 0.6, ambientRate: 0.06 },
    "16bit": { impactType: 'burst',   ambientType: 'spore',            gravityMul: 1.2,  speedMul: 1.1, sizeRange: [2, 4], lifetimeMul: 0.9, ambientRate: 0.10 },
    hibit: { impactType: 'burst',   ambientType: 'spore',            gravityMul: 0.8,  speedMul: 1.2, sizeRange: [2, 5], lifetimeMul: 1.2, ambientRate: 0.10 },
};

// ---------------------------------------------------------------------------
// Theme Color Grading
// ---------------------------------------------------------------------------

export interface ThemeColorGrade {
    shadowTint: string;
    highlightTint: string;
}

export const THEME_COLOR_GRADES: Record<string, ThemeColorGrade> = {
    cool:    { shadowTint: 'rgba(20, 40, 100, 0.08)',  highlightTint: 'rgba(200, 220, 255, 0.04)' },
    warm:    { shadowTint: 'rgba(80, 30, 10, 0.10)',   highlightTint: 'rgba(255, 200, 120, 0.06)' },
    mono:    { shadowTint: 'rgba(0, 30, 10, 0.08)',    highlightTint: 'rgba(34, 197, 94, 0.05)' },
    "8bit":  { shadowTint: 'rgba(10, 10, 50, 0.06)',   highlightTint: 'rgba(255, 255, 200, 0.03)' },
    "16bit": { shadowTint: 'rgba(40, 10, 60, 0.08)',   highlightTint: 'rgba(255, 180, 100, 0.05)' },
    hibit:   { shadowTint: 'rgba(30, 10, 50, 0.10)',   highlightTint: 'rgba(255, 150, 200, 0.05)' },
};

// ---------------------------------------------------------------------------
// Theme VFX Profile (bloom, chromatic aberration, scanlines, phosphor)
// ---------------------------------------------------------------------------

export interface ThemeVfxProfile {
    bloomAlpha: number;
    chromaticOffset: number;
    chromaticAlpha: number;
    scanlineAlpha: number;
    phosphorColor: { r: number; g: number; b: number };
    phosphorDuration: number;
    vignetteAlpha: number;
}

export const THEME_VFX_PROFILES: Record<string, ThemeVfxProfile> = {
    cool:    { bloomAlpha: 0.5,  chromaticOffset: 1, chromaticAlpha: 0.35, scanlineAlpha: 0.03,  phosphorColor: { r: 99, g: 102, b: 241 }, phosphorDuration: 350, vignetteAlpha: 0.4  },
    warm:    { bloomAlpha: 0.45, chromaticOffset: 1, chromaticAlpha: 0.20, scanlineAlpha: 0.03,  phosphorColor: { r: 245, g: 158, b: 11 }, phosphorDuration: 400, vignetteAlpha: 0.35 },
    mono:    { bloomAlpha: 0.5,  chromaticOffset: 0, chromaticAlpha: 0,    scanlineAlpha: 0.04,  phosphorColor: { r: 34, g: 197, b: 94 },  phosphorDuration: 500, vignetteAlpha: 0.5  },
    "8bit":  { bloomAlpha: 0.35, chromaticOffset: 0, chromaticAlpha: 0,    scanlineAlpha: 0.04,  phosphorColor: { r: 229, g: 37, b: 33 },  phosphorDuration: 250, vignetteAlpha: 0.3  },
    "16bit": { bloomAlpha: 0.45, chromaticOffset: 1, chromaticAlpha: 0.15, scanlineAlpha: 0.04,  phosphorColor: { r: 240, g: 128, b: 48 }, phosphorDuration: 300, vignetteAlpha: 0.35 },
    hibit:   { bloomAlpha: 0.7,  chromaticOffset: 1, chromaticAlpha: 0.25, scanlineAlpha: 0.03,  phosphorColor: { r: 255, g: 97, b: 136 }, phosphorDuration: 400, vignetteAlpha: 0.45 },
};
