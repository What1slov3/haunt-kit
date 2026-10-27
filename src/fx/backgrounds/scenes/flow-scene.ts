import { DEFAULT_FLOW, particleAlpha, seedParticles, STRIDE, stepParticles } from '../flow-field';
import { random } from '../noise';
import type { BackgroundScene, SceneColors, SceneInput, SceneOptions } from '../scene';

import { ALPHA_BUCKETS, bucketOf, context2d, fitCanvas, rgba } from './canvas';
import {
  addPulse,
  createSmoothPointer,
  followPointer,
  livePulses,
  type TimedPulse,
} from './shared';

/*
 * `flow` на Canvas 2D: частицы с короткими следами. След — последние TRAIL положений частицы
 * (кольцевой буфер), каждый кадр холст очищается и следы рисуются заново. Затухание «полупрозрачной
 * заливкой поверх» дешевле, но в 8-битном буфере оставляет вечные призраки следов: альфа 3/255
 * при множителе 0.94 округляется обратно в 3.
 */

const TRAIL = 12;
/** Положение в след пишется раз в столько мс: длина следа не зависит от частоты кадров */
const SAMPLE_MS = 50;
const PULSE_MS = 900;

export function createScene(canvas: HTMLCanvasElement, { seed }: SceneOptions): BackgroundScene {
  const ctx = context2d(canvas);
  const rand = random(seed);
  const pointer = createSmoothPointer();
  let width = 0;
  let height = 0;
  let colors: SceneColors | null = null;
  let particles: Float32Array = new Float32Array(0);
  let trail = new Float32Array(0);
  let head = 0;
  let sinceSample = 0;
  let time = 0;
  let pulses: TimedPulse[] = [];

  const count = () => Math.round(Math.min(900, Math.max(160, (width * height) / 1400)));

  const resetTrail = (i: number) => {
    const x = particles[i * STRIDE]!;
    const y = particles[i * STRIDE + 1]!;

    for (let k = 0; k < TRAIL; k++) {
      trail[(i * TRAIL + k) * 2] = x;
      trail[(i * TRAIL + k) * 2 + 1] = y;
    }
  };

  const reseed = () => {
    particles = seedParticles(count(), width, height, rand);
    trail = new Float32Array((particles.length / STRIDE) * TRAIL * 2);

    for (let i = 0; i < particles.length / STRIDE; i++) resetTrail(i);
  };

  /** Курсор закручивает частицы вокруг себя, волна шины расталкивает — сдвигом положения после шага */
  const react = (input: SceneInput, now: number, dt: number) => {
    const reach = 140;
    const active = livePulses(pulses, now, PULSE_MS);

    pulses = active;

    for (let o = 0; o < particles.length; o += STRIDE) {
      let x = particles[o]!;
      let y = particles[o + 1]!;

      if (pointer.weight > 0 && input.gain > 0) {
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const d = Math.hypot(dx, dy);

        if (d < reach && d > 1) {
          const swirl = (1 - d / reach) * input.gain * pointer.weight * 40 * dt;

          x += (-dy / d) * swirl;
          y += (dx / d) * swirl;
        }
      }

      for (const pulse of active) {
        const progress = (now - pulse.at) / PULSE_MS;
        const ring = progress * 320;
        const dx = x - pulse.x;
        const dy = y - pulse.y;
        const d = Math.hypot(dx, dy);
        const off = Math.abs(d - ring);

        if (off < 40 && d > 1) {
          const push = (1 - off / 40) * (1 - progress) * pulse.strength * input.gain * 120 * dt;

          x += (dx / d) * push;
          y += (dy / d) * push;
        }
      }

      particles[o] = x;
      particles[o + 1] = y;
    }
  };

  const draw = () => {
    if (!colors) return;

    const n = particles.length / STRIDE;
    const paths = Array.from({ length: ALPHA_BUCKETS }, () => new Path2D());

    for (let i = 0; i < n; i++) {
      const o = i * STRIDE;
      const alpha = particleAlpha(particles[o + 4]!, particles[o + 5]!);

      if (alpha <= 0.02) continue;

      const path = paths[bucketOf(alpha)]!;

      // От старого к новому: кольцо начинается за последней записанной позицией
      path.moveTo(trail[(i * TRAIL + head) * 2]!, trail[(i * TRAIL + head) * 2 + 1]!);

      for (let k = 1; k < TRAIL; k++) {
        const index = (head + k) % TRAIL;

        path.lineTo(trail[(i * TRAIL + index) * 2]!, trail[(i * TRAIL + index) * 2 + 1]!);
      }

      path.lineTo(particles[o]!, particles[o + 1]!);
    }

    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = colors.dark ? 'lighter' : 'source-over';

    for (let b = 0; b < ALPHA_BUCKETS; b++) {
      ctx.strokeStyle = rgba(
        colors.accent,
        colors.accentAlpha * 0.55 * ((b + 0.5) / ALPHA_BUCKETS),
      );
      ctx.stroke(paths[b]!);
    }

    ctx.globalCompositeOperation = 'source-over';
  };

  const advance = (dtMs: number) => {
    const dt = dtMs / 1000;

    time += dt;
    stepParticles(particles, width, height, time, dt, rand, DEFAULT_FLOW);
    sinceSample += dtMs;

    const n = particles.length / STRIDE;

    if (sinceSample >= SAMPLE_MS) {
      sinceSample = 0;
      head = (head + 1) % TRAIL;
    }

    for (let i = 0; i < n; i++) {
      const o = i * STRIDE;

      // Новорождённая частица — след из одной точки, без линии через весь экран
      if (particles[o + 4] === 0) resetTrail(i);
      else if (sinceSample === 0) {
        const index = (head + TRAIL - 1) % TRAIL;

        trail[(i * TRAIL + index) * 2] = particles[o]!;
        trail[(i * TRAIL + index) * 2 + 1] = particles[o + 1]!;
      }
    }
  };

  return {
    resize(w, h, dpr) {
      width = w;
      height = h;
      fitCanvas(canvas, ctx, w, h, dpr);
      reseed();
    },
    setColors(next) {
      colors = next;
    },
    frame(now, dt, input) {
      followPointer(pointer, input.pointer, dt);
      advance(dt);
      react(input, now, dt / 1000);
      draw();

      return true;
    },
    still() {
      // Стоп-кадр — прогон в 1.5 с: следы набраны, частицы разошлись по полю
      for (let i = 0; i < 45; i++) advance(SAMPLE_MS * 0.7);

      draw();

      return true;
    },
    pulse(pulse, now) {
      pulses = addPulse(pulses, pulse, now);
    },
  };
}
