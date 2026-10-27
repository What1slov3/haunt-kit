import { driftPoints, linksNear, seedPoints, STRIDE } from '../constellation';
import { random } from '../noise';
import type { BackgroundScene, SceneColors, SceneOptions } from '../scene';

import { ALPHA_BUCKETS, bucketOf, context2d, fitCanvas, rgba } from './canvas';
import {
  addPulse,
  createSmoothPointer,
  followPointer,
  livePulses,
  type TimedPulse,
} from './shared';

/*
 * `constellation` на Canvas 2D: редкие дрейфующие точки; у курсора и у места волны шины они
 * соединяются линиями. Линии — корзинами прозрачности, по stroke() на корзину.
 */

const REACH = 170;
const SPAN = 120;
const FAINT_SPAN = 64;
const PULSE_MS = 1100;

export function createScene(canvas: HTMLCanvasElement, { seed }: SceneOptions): BackgroundScene {
  const ctx = context2d(canvas);
  const rand = random(seed);
  const pointer = createSmoothPointer();
  let width = 0;
  let height = 0;
  let points: Float32Array = new Float32Array(0);
  let colors: SceneColors | null = null;
  let pulses: TimedPulse[] = [];

  const draw = (now: number, gain: number) => {
    if (!colors) return;

    ctx.clearRect(0, 0, width, height);

    const paths = Array.from({ length: ALPHA_BUCKETS }, () => new Path2D());
    const centers: { x: number; y: number; weight: number }[] = [];

    if (pointer.weight > 0 && gain > 0) {
      centers.push({ x: pointer.x, y: pointer.y, weight: pointer.weight * gain });
    }

    pulses = livePulses(pulses, now, PULSE_MS);

    for (const pulse of pulses) {
      const progress = (now - pulse.at) / PULSE_MS;

      centers.push({ x: pulse.x, y: pulse.y, weight: pulse.strength * (1 - progress) ** 2 });
    }

    for (const center of centers) {
      for (const link of linksNear(points, center.x, center.y, REACH, SPAN)) {
        const path = paths[bucketOf(link.strength * center.weight)]!;

        path.moveTo(points[link.a * STRIDE]!, points[link.a * STRIDE + 1]!);
        path.lineTo(points[link.b * STRIDE]!, points[link.b * STRIDE + 1]!);
      }
    }

    ctx.lineWidth = 1;

    // Совсем близкие пары соединены всегда, едва заметно: без курсора это всё ещё созвездие
    const faint = new Path2D();

    for (let a = 0; a < points.length; a += STRIDE) {
      for (let b = a + STRIDE; b < points.length; b += STRIDE) {
        const dx = points[a]! - points[b]!;
        const dy = points[a + 1]! - points[b + 1]!;

        if (dx * dx + dy * dy > FAINT_SPAN * FAINT_SPAN) continue;

        faint.moveTo(points[a]!, points[a + 1]!);
        faint.lineTo(points[b]!, points[b + 1]!);
      }
    }

    ctx.strokeStyle = rgba(colors.ink, colors.inkAlpha * 1.2);
    ctx.stroke(faint);

    for (let b = 0; b < ALPHA_BUCKETS; b++) {
      ctx.strokeStyle = rgba(colors.accent, colors.accentAlpha * ((b + 0.5) / ALPHA_BUCKETS));
      ctx.stroke(paths[b]!);
    }

    // Точки — одним путём: квадраты 1.5 px дешевле дуг и на таком размере неотличимы
    const dots = new Path2D();

    for (let o = 0; o < points.length; o += STRIDE)
      dots.rect(points[o]! - 0.75, points[o + 1]! - 0.75, 1.5, 1.5);

    ctx.fillStyle = rgba(colors.ink, Math.min(0.6, colors.inkAlpha * 4));
    ctx.fill(dots);
  };

  return {
    resize(w, h, dpr) {
      width = w;
      height = h;
      fitCanvas(canvas, ctx, w, h, dpr);
      points = seedPoints(Math.round(Math.min(170, Math.max(40, (w * h) / 7000))), w, h, rand);
    },
    setColors(next) {
      colors = next;
    },
    frame(now, dt, input) {
      followPointer(pointer, input.pointer, dt);
      driftPoints(points, width, height, dt / 1000);
      draw(now, input.gain);

      return true;
    },
    still() {
      pointer.weight = 0;
      draw(0, 0);

      return true;
    },
    pulse(pulse, now) {
      pulses = addPulse(pulses, pulse, now);
    },
  };
}
