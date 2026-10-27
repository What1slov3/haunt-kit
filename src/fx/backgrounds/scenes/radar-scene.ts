import { random } from '../noise';
import { blipFromPoint, blipIntensity, seedBlips, sweepAngle, type Blip } from '../radar';
import type { BackgroundScene, SceneColors, SceneInput, SceneOptions } from '../scene';

import { context2d, fitCanvas, rgba } from './canvas';

/*
 * `radar` на Canvas 2D. Кольца, перекрестие и риски — один раз во внеэкранный холст; кадр — копия
 * основы, сектор следа (конический градиент) и метки. Волна шины ставит метку в точке действия,
 * курсор — «контакт», который луч подсвечивает при проходе.
 */

const PERIOD = 7;
const RING_GAP = 90;
/** Ширина следа луча, рад */
const TRAIL = 1.1;

export function createScene(canvas: HTMLCanvasElement, { seed }: SceneOptions): BackgroundScene {
  const ctx = context2d(canvas);
  const rand = random(seed);
  const base = document.createElement('canvas');
  const blips = seedBlips(9, rand);
  let external: Blip[] = [];
  let width = 0;
  let height = 0;
  let scale = 1;
  let cx = 0;
  let cy = 0;
  let radius = 0;
  let colors: SceneColors | null = null;
  let time = 0;

  const renderBase = () => {
    const bctx = base.getContext('2d');

    if (!bctx || !colors) return;

    fitCanvas(base, bctx, width, height, scale);
    bctx.clearRect(0, 0, width, height);
    bctx.strokeStyle = rgba(colors.ink, colors.inkAlpha * 1.4);
    bctx.lineWidth = 1;

    for (let r = RING_GAP; r < radius; r += RING_GAP) {
      bctx.beginPath();
      bctx.arc(cx, cy, r, 0, Math.PI * 2);
      bctx.stroke();
    }

    bctx.beginPath();
    bctx.moveTo(cx - radius, cy);
    bctx.lineTo(cx + radius, cy);
    bctx.moveTo(cx, cy - radius);
    bctx.lineTo(cx, cy + radius);

    // Риски по внутреннему кольцу через 10°, каждая третья длиннее
    for (let deg = 0; deg < 360; deg += 10) {
      const a = (deg * Math.PI) / 180;
      const inner = RING_GAP * 2 - (deg % 30 === 0 ? 10 : 5);

      bctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      bctx.lineTo(cx + Math.cos(a) * RING_GAP * 2, cy + Math.sin(a) * RING_GAP * 2);
    }

    bctx.stroke();
  };

  const drawSweep = (sweep: number) => {
    if (!colors) return;

    // Конический градиент — один fill на весь след; без него (старые движки) — тонкий луч
    if (typeof ctx.createConicGradient === 'function') {
      const gradient = ctx.createConicGradient(sweep - TRAIL, cx, cy);
      const end = TRAIL / (Math.PI * 2);

      gradient.addColorStop(0, rgba(colors.accent, 0));
      gradient.addColorStop(end * 0.98, rgba(colors.accent, colors.accentAlpha * 0.22));
      gradient.addColorStop(end, rgba(colors.accent, 0));
      gradient.addColorStop(1, rgba(colors.accent, 0));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, sweep - TRAIL, sweep);
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = rgba(colors.accent, colors.accentAlpha * 0.55);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweep) * radius, cy + Math.sin(sweep) * radius);
    ctx.stroke();
  };

  const drawBlip = (blip: Blip, sweep: number, fade: number) => {
    if (!colors) return;

    const intensity = blipIntensity(sweep, blip.angle) * fade;

    if (intensity < 0.02) return;

    const x = cx + Math.cos(blip.angle) * blip.radius * radius;
    const y = cy + Math.sin(blip.angle) * blip.radius * radius;

    ctx.fillStyle = rgba(colors.accent, colors.accentAlpha * intensity);
    ctx.beginPath();
    ctx.arc(x, y, 2 + intensity, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(colors.accent, colors.accentAlpha * intensity * 0.35);
    ctx.beginPath();
    ctx.arc(x, y, 6 + 6 * (1 - intensity), 0, Math.PI * 2);
    ctx.stroke();
  };

  const draw = (input: SceneInput) => {
    const sweep = sweepAngle(time, PERIOD);

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(base, 0, 0, width, height);
    drawSweep(sweep);

    for (const blip of blips) drawBlip(blip, sweep, 1);

    external = external.filter((blip) => time - blip.bornAt < blip.ttl);

    for (const blip of external) drawBlip(blip, sweep, 1 - (time - blip.bornAt) / blip.ttl);

    if (input.pointer && input.gain > 0) {
      const contact = blipFromPoint(input.pointer.x, input.pointer.y, cx, cy, radius, time);

      if (contact) drawBlip(contact, sweep, input.gain);
    }
  };

  return {
    resize(w, h, dpr) {
      width = w;
      height = h;
      scale = dpr;
      cx = w / 2;
      cy = h / 2;
      radius = Math.hypot(w, h) / 2;
      fitCanvas(canvas, ctx, w, h, dpr);
      renderBase();
    },
    setColors(next) {
      colors = next;
      renderBase();
    },
    frame(_now, dt, input) {
      time += dt / 1000;
      draw(input);

      return true;
    },
    still(input) {
      // Стоп-кадр — луч на «двух часах», часть меток ещё светится
      time = PERIOD * 0.9;
      draw({ ...input, pointer: null });

      return true;
    },
    pulse(pulse) {
      const blip = blipFromPoint(pulse.x, pulse.y, cx, cy, radius, time, 4 + pulse.strength * 4);

      if (blip) external = [...external.slice(-5), blip];
    },
  };
}
