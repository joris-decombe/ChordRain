let ctx: AudioContext | null = null;
let lastPlayTime = 0;
const THROTTLE_MS = 80;

function ensureContext(): AudioContext | null {
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx.state === 'running' ? ctx : null;
}

/**
 * Eagerly create and resume the AudioContext on the first user activation
 * (click, keydown, etc.) so hover sounds work immediately after.
 * mouseenter/mouseover are NOT user activation events, so hover alone
 * can never unlock audio — this is a browser restriction.
 */
export function warmUpAudio() {
  const unlock = () => {
    ensureContext();
    for (const evt of ['click', 'keydown', 'touchend'] as const) {
      document.removeEventListener(evt, unlock, true);
    }
  };
  for (const evt of ['click', 'keydown', 'touchend'] as const) {
    document.addEventListener(evt, unlock, { capture: true, once: false });
  }
}

function beep(frequency: number, duration: number) {
  const now = performance.now();
  if (now - lastPlayTime < THROTTLE_MS) return;
  lastPlayTime = now;

  const c = ensureContext();
  if (!c) return;

  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'square';
  osc.frequency.value = frequency;
  gain.gain.value = 0.04;
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + duration);
}

export function playHoverSound() {
  beep(1047, 0.03); // C6
}

export function playSelectSound() {
  beep(1319, 0.06); // E6
}
