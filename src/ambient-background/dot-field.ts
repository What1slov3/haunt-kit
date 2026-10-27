import { reactionGain, type AmbientPulse, type AmbientReaction } from './ambient-events';

/*
 * Точечная сетка с живыми частицами на <canvas>. Статичная сетка рисуется один раз во внеэкранный
 * canvas и копируется каждый кадр; заново рисуются только точки рядом с курсором, кольца волн,
 * область фокуса и частицы — так кадр дешёвый даже на большом экране.
 */

const SPACING = 22;
const DOT_RADIUS = 1;
const MAX_PARTICLES = 36;
const RIPPLE_DURATION = 720;
const RIPPLE_RADIUS = 260;
const RIPPLE_WIDTH = 26;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  phase: number;
}

interface Ripple extends AmbientPulse {
  startedAt: number;
}

export interface DotFieldColors {
  dot: string;
  dotAlpha: number;
  particle: string;
  particleAlpha: number;
}

export interface DotFieldOptions {
  reaction: AmbientReaction;
  reducedMotion: boolean;
  readColors: () => DotFieldColors;
}

export class DotField {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly base = document.createElement('canvas');
  private width = 0;
  private height = 0;
  private dpr = 1;
  private colors: DotFieldColors;
  private particles: Particle[] = [];
  private ripples: Ripple[] = [];
  private pointer: { x: number; y: number } | null = null;
  private smoothPointer = { x: -1e4, y: -1e4, weight: 0 };
  private focusRect: DOMRect | null = null;
  private focusWeight = 0;
  private frame = 0;
  private lastTime = 0;
  private running = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private options: DotFieldOptions,
  ) {
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('DotField: canvas 2d context недоступен');

    this.ctx = ctx;
    this.colors = options.readColors();
  }

  setOptions(options: Partial<DotFieldOptions>): void {
    this.options = { ...this.options, ...options };

    if (this.options.reducedMotion) this.stop();
    else this.start();

    this.drawStatic();
  }

  refreshColors(): void {
    this.colors = this.options.readColors();
    this.renderBase();
    this.drawStatic();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.renderBase();
    this.seedParticles();
    this.drawStatic();
  }

  start(): void {
    if (this.running || this.options.reducedMotion) return;

    this.running = true;
    this.lastTime = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frame);
  }

  destroy(): void {
    this.stop();
  }

  pulse(pulse: AmbientPulse): void {
    if (this.gain() === 0 || this.options.reducedMotion) return;

    // Не больше четырёх волн разом: клики подряд не превращают фон в лужу
    this.ripples = [...this.ripples.slice(-3), { ...pulse, startedAt: performance.now() }];
  }

  setPointer(point: { x: number; y: number } | null): void {
    this.pointer = point;
  }

  setFocusRect(rect: DOMRect | null): void {
    this.focusRect = rect;
  }

  private gain(): number {
    return reactionGain[this.options.reaction];
  }

  /* --- Статичные слои ------------------------------------------------------------- */

  private renderBase(): void {
    this.base.width = this.canvas.width;
    this.base.height = this.canvas.height;

    const ctx = this.base.getContext('2d');

    if (!ctx) return;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = this.colors.dot;
    ctx.globalAlpha = this.colors.dotAlpha;

    for (let y = SPACING / 2; y < this.height; y += SPACING) {
      for (let x = SPACING / 2; x < this.width; x += SPACING) {
        ctx.beginPath();
        ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private seedParticles(): void {
    const count = Math.round(
      Math.min(MAX_PARTICLES, Math.max(8, (this.width * this.height) / 60000)),
    );

    this.particles = Array.from({ length: count }, () => ({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.12,
      radius: 1 + Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  /** Кадр без движения: при reduced-motion и до первого тика */
  private drawStatic(): void {
    if (this.running) return;

    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(this.base, 0, 0, this.width, this.height);
    this.drawParticles(0);
  }

  /* --- Кадр ----------------------------------------------------------------------- */

  private readonly tick = (now: number): void => {
    if (!this.running) return;

    const delta = Math.min(now - this.lastTime, 64);

    this.lastTime = now;
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(this.base, 0, 0, this.width, this.height);
    this.updatePointer();
    this.drawFocus(delta);
    this.drawPointerGlow();
    this.drawRipples(now);
    this.moveParticles(delta);
    this.drawParticles(now);
    this.frame = requestAnimationFrame(this.tick);
  };

  private updatePointer(): void {
    const target = this.pointer;
    const smooth = this.smoothPointer;

    // Курсор догоняется с запаздыванием, а при уходе эффект затухает, а не обрывается
    if (target) {
      if (smooth.weight === 0) {
        smooth.x = target.x;
        smooth.y = target.y;
      }

      smooth.x += (target.x - smooth.x) * 0.18;
      smooth.y += (target.y - smooth.y) * 0.18;
      smooth.weight = Math.min(1, smooth.weight + 0.08);
    } else {
      smooth.weight = Math.max(0, smooth.weight - 0.04);
    }
  }

  private drawPointerGlow(): void {
    const gain = this.gain();
    const { x, y, weight } = this.smoothPointer;

    if (gain === 0 || weight === 0) return;

    const radius = 70 + 70 * gain;
    const ctx = this.ctx;

    ctx.fillStyle = this.colors.dot;

    this.forDotsNear(x, y, radius, (dx, dy, distance) => {
      const falloff = 1 - distance / radius;
      const alpha = this.colors.dotAlpha + 0.45 * falloff * falloff * gain * weight;
      // Точки чуть сдвигаются к курсору — ощущение притяжения, а не подсветки
      const shift = 2.5 * falloff * gain * weight;
      const nx = dx - ((dx - x) / (distance || 1)) * shift;
      const ny = dy - ((dy - y) / (distance || 1)) * shift;

      ctx.globalAlpha = Math.min(1, alpha);
      ctx.beginPath();
      ctx.arc(nx, ny, DOT_RADIUS + 0.6 * falloff * gain, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private drawRipples(now: number): void {
    const gain = this.gain();

    this.ripples = this.ripples.filter((ripple) => now - ripple.startedAt < RIPPLE_DURATION);

    if (gain === 0 || this.ripples.length === 0) return;

    const ctx = this.ctx;

    ctx.fillStyle = this.colors.particle;

    for (const ripple of this.ripples) {
      const progress = (now - ripple.startedAt) / RIPPLE_DURATION;
      const eased = 1 - (1 - progress) ** 2;
      const ringRadius = eased * RIPPLE_RADIUS * (0.6 + 0.4 * ripple.strength);
      const fade = (1 - progress) * ripple.strength * gain;

      this.forDotsNear(ripple.x, ripple.y, ringRadius + RIPPLE_WIDTH, (dx, dy, distance) => {
        const offRing = Math.abs(distance - ringRadius);

        if (offRing > RIPPLE_WIDTH) return;

        const onRing = 1 - offRing / RIPPLE_WIDTH;
        const push = 3 * onRing * fade;
        const nx = dx + ((dx - ripple.x) / (distance || 1)) * push;
        const ny = dy + ((dy - ripple.y) / (distance || 1)) * push;

        ctx.globalAlpha = Math.min(1, 0.7 * onRing * fade);
        ctx.beginPath();
        ctx.arc(nx, ny, DOT_RADIUS + onRing * fade, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  private drawFocus(delta: number): void {
    const gain = this.gain();
    const target = this.focusRect && gain > 0 ? 1 : 0;

    this.focusWeight += (target - this.focusWeight) * Math.min(1, delta / 260);

    if (this.focusWeight < 0.01 || !this.focusRect) return;

    const rect = this.focusRect;
    const ctx = this.ctx;

    // Под активной панелью точки просто чуть ярче — тихо, без контура
    ctx.fillStyle = this.colors.dot;
    ctx.globalAlpha = Math.min(1, this.colors.dotAlpha * (0.6 + 0.9 * gain) * this.focusWeight);

    const x0 = Math.max(
      SPACING / 2,
      Math.ceil((rect.left - SPACING / 2) / SPACING) * SPACING + SPACING / 2,
    );
    const y0 = Math.max(
      SPACING / 2,
      Math.ceil((rect.top - SPACING / 2) / SPACING) * SPACING + SPACING / 2,
    );

    for (let y = y0; y < Math.min(rect.bottom, this.height); y += SPACING) {
      for (let x = x0; x < Math.min(rect.right, this.width); x += SPACING) {
        ctx.beginPath();
        ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private moveParticles(delta: number): void {
    const step = delta / 16;

    for (const particle of this.particles) {
      particle.x += particle.vx * step;
      particle.y += particle.vy * step;

      if (particle.x < -4) particle.x = this.width + 4;
      if (particle.x > this.width + 4) particle.x = -4;
      if (particle.y < -4) particle.y = this.height + 4;
      if (particle.y > this.height + 4) particle.y = -4;
    }
  }

  private drawParticles(now: number): void {
    const ctx = this.ctx;

    ctx.fillStyle = this.colors.particle;

    for (const particle of this.particles) {
      const twinkle = 0.6 + 0.4 * Math.sin(now / 1400 + particle.phase);

      ctx.globalAlpha = this.colors.particleAlpha * twinkle;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** Обход только точек сетки внутри квадрата вокруг центра — без перебора всего поля */
  private forDotsNear(
    cx: number,
    cy: number,
    radius: number,
    draw: (x: number, y: number, distance: number) => void,
  ): void {
    const x0 = Math.max(SPACING / 2, Math.floor((cx - radius) / SPACING) * SPACING + SPACING / 2);
    const y0 = Math.max(SPACING / 2, Math.floor((cy - radius) / SPACING) * SPACING + SPACING / 2);

    for (let y = y0; y <= Math.min(cy + radius, this.height); y += SPACING) {
      for (let x = x0; x <= Math.min(cx + radius, this.width); x += SPACING) {
        const distance = Math.hypot(x - cx, y - cy);

        if (distance <= radius) draw(x, y, distance);
      }
    }
  }
}
