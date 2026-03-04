import { getZScale, type ThemeParticleType } from "./vfx-constants";

/**
 * Pool-based particle system for canvas effects.
 * Particles are pixel-snapped for the retro aesthetic.
 */

export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    color: string;
    size: number;
    active: boolean;
    type: ThemeParticleType;
    z: number; // 0 (far) to 2 (close). 1.0 is the play plane.
    gravityMul: number; // per-particle gravity multiplier (default 1.0)
}

export interface EmitOptions {
    x: number;
    y: number;
    color: string;
    count?: number;
    speed?: number;
    spread?: number;
    size?: number;
    lifetime?: number;
    gravity?: number;
    type?: ThemeParticleType;
    z?: number;
    gravityMul?: number;
}

const POOL_SIZE = 1200;
const DEFAULT_GRAVITY = 120; // pixels per second^2 (downward)

export class ParticleSystem {
    particles: Particle[];
    gravity: number;
    /** Y position of the fretboard top edge (floor for bouncing particles). */
    floorY = Infinity;
    private _activeCount = 0;

    constructor(gravity = DEFAULT_GRAVITY) {
        this.gravity = gravity;
        this.particles = Array.from({ length: POOL_SIZE }, () => ({
            x: 0, y: 0, vx: 0, vy: 0,
            life: 0, maxLife: 0,
            color: '', size: 1, active: false,
            type: 'burst' as ThemeParticleType,
            z: 1.0,
            gravityMul: 1.0
        }));
    }

    private acquire(): Particle | null {
        for (let i = 0; i < this.particles.length; i++) {
            if (!this.particles[i].active) {
                this.particles[i].active = true;
                this._activeCount++;
                return this.particles[i];
            }
        }
        return null;
    }

    /** Emit a burst of particles at a position. */
    emit(opts: EmitOptions): void {
        const {
            x, y, color,
            count = 6,
            speed = 60,
            spread = Math.PI * 0.6,
            size = 2,
            lifetime = 0.35,
            type = 'burst',
            z = 1.0,
            gravityMul = 1.0
        } = opts;

        const baseAngle = type === 'debris'
            ? Math.PI / 2       // debris drips downward
            : -Math.PI / 2;     // everything else bursts upward

        for (let i = 0; i < count; i++) {
            const p = this.acquire();
            if (!p) return;

            const angle = baseAngle + (Math.random() - 0.5) * spread;
            const spd = speed * (0.5 + Math.random() * 0.5);

            p.x = x;
            p.y = y;
            p.vx = Math.cos(angle) * spd;
            p.vy = Math.sin(angle) * spd;
            p.life = lifetime * (0.7 + Math.random() * 0.3);
            p.maxLife = p.life;
            p.color = color;
            p.size = type === 'shockwave' ? size * 4 : size;
            p.type = type;
            p.z = z;
            p.gravityMul = gravityMul;
        }
    }

    /** Advance all particles by dt seconds. */
    update(dt: number): void {
        if (this._activeCount === 0) return;

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            if (!p.active) continue;

            p.life -= dt;
            if (p.life <= 0) {
                p.active = false;
                this._activeCount--;
                continue;
            }

            // Depth affects effective physics
            const parallax = getZScale(p.z);

            if (p.type === 'burst' || p.type === 'debris') {
                p.vy += this.gravity * p.gravityMul * dt * parallax;
            } else if (p.type === 'shockwave') {
                p.size += 40 * dt * parallax;
            } else if (p.type === 'spore') {
                p.vx += Math.sin(p.life * 2) * 5 * dt;
                p.vy = -15 * parallax;
            } else if (p.type === 'ember') {
                p.vy -= this.gravity * 0.3 * dt * parallax;
                p.vx += Math.sin(p.life * 6) * 15 * dt;
            } else if (p.type === 'pixel_debris') {
                p.vy += this.gravity * 2.0 * dt * parallax;
            } else if (p.type === 'phosphor_flicker') {
                p.vx *= 0.95;
                p.vy *= 0.95;
            }

            p.x += p.vx * dt * parallax;
            p.y += p.vy * dt * parallax;

            // Floor collision for physics-driven types
            if ((p.type === 'burst' || p.type === 'debris' || p.type === 'pixel_debris') &&
                p.y > this.floorY && p.vy > 0) {
                p.y = this.floorY;
                p.vy = -p.vy * 0.4;
                p.vx *= 0.8;
                if (Math.abs(p.vy) < 10) {
                    p.life = 0;
                }
            }
        }
    }

    /** Draw all active particles to a canvas context. */
    draw(ctx: CanvasRenderingContext2D): void {
        if (this._activeCount === 0) return;

        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        const drawPass = (minZ: number, maxZ: number) => {
            for (let i = 0; i < this.particles.length; i++) {
                const p = this.particles[i];
                if (!p.active || p.z < minZ || p.z >= maxZ) continue;

                const alpha = Math.max(0, p.life / p.maxLife);
                ctx.fillStyle = p.color;
                const x = Math.round(p.x);
                const y = Math.round(p.y);

                const zScale = getZScale(p.z);
                const size = p.size * zScale;

                if (p.type === 'shockwave') {
                    const outerR = size / 2;
                    const thickness = 4 * (p.life / p.maxLife) * zScale;
                    const innerR = Math.max(0, outerR - thickness);
                    ctx.globalAlpha = alpha * 0.8;
                    ctx.beginPath();
                    ctx.arc(x, y, outerR, 0, Math.PI * 2);
                    ctx.arc(x, y, innerR, 0, Math.PI * 2, true);
                    ctx.fill();
                } else if (p.type === 'ember') {
                    const flicker = 0.6 + 0.4 * Math.sin(p.life * 10);
                    ctx.globalAlpha = alpha * flicker;
                    ctx.fillRect(x, y, Math.max(1, size), Math.max(1, size));
                    ctx.globalAlpha = alpha * flicker * 0.25;
                    ctx.fillRect(x - 1, y - 1, size + 2, size + 2);
                } else if (p.type === 'pixel_debris') {
                    ctx.globalAlpha = alpha;
                    ctx.fillRect(x, y, Math.max(1, Math.round(size)), Math.max(1, Math.round(size)));
                    ctx.fillStyle = 'rgba(255,255,255,0.6)';
                    ctx.fillRect(x, y, Math.max(1, Math.round(size)), 1);
                    ctx.fillStyle = p.color;
                } else if (p.type === 'phosphor_flicker') {
                    const flickerAlpha = alpha * (0.3 + Math.random() * 0.7);
                    ctx.globalAlpha = flickerAlpha;
                    ctx.fillRect(x, y, Math.max(1, size), Math.max(1, size));
                    ctx.globalAlpha = flickerAlpha * 0.3;
                    ctx.fillRect(x, y + Math.max(1, size), Math.max(1, size), 2);
                } else {
                    if (p.type === 'spore' && p.z < 0.8) {
                        ctx.globalAlpha = alpha * 0.4;
                        ctx.fillRect(x, y, Math.max(1, size), Math.max(1, size));
                    }
                    else if (p.z > 1.2) {
                        ctx.globalAlpha = alpha * 0.2;
                        ctx.fillRect(x - Math.floor(size/2), y - Math.floor(size/2), size, size);
                        ctx.globalAlpha = alpha * 0.1;
                        ctx.fillRect(x - Math.floor(size/2) - 1, y - Math.floor(size/2) - 1, size + 2, size + 2);
                    }
                    else {
                        ctx.globalAlpha = alpha * 0.3;
                        ctx.fillRect(x - 1, y - 1, size + 2, size + 2);
                        ctx.globalAlpha = alpha;
                        ctx.fillRect(x, y, size, size);
                    }
                }
            }
        };

        drawPass(0, 0.8);   // Back
        drawPass(0.8, 1.2); // Mid
        drawPass(1.2, 3.0); // Front

        ctx.restore();
    }

    /** Number of currently active particles. */
    get activeCount(): number {
        return this._activeCount;
    }

    /** Number of active impact particles (for bloom threshold). */
    get activeBurstCount(): number {
        let count = 0;
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            if (p.active && (p.type === 'burst' || p.type === 'shockwave' || p.type === 'ember' || p.type === 'pixel_debris')) {
                count++;
            }
        }
        return count;
    }

    /** Deactivate all particles. */
    clear(): void {
        for (let i = 0; i < this.particles.length; i++) {
            this.particles[i].active = false;
        }
        this._activeCount = 0;
    }
}
