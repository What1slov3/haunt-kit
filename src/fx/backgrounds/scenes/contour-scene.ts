import { contourLevels, contourSegments, sampleHeights } from '../contour-field';
import { createNoise3 } from '../noise';
import type { BackgroundScene, SceneColors, SceneInput, SceneOptions } from '../scene';

import { context2d, fitCanvas, rgba } from './canvas';
import {
  addPulse,
  createSmoothPointer,
  followPointer,
  livePulses,
  type TimedPulse,
} from './shared';

/*
 * `contour` на Canvas 2D: поле высот на сетке ~24 px, изолинии marching squares, отрезки уровня —
 * одним stroke(). Курсор приподнимает рельеф под собой — горизонтали огибают его, волна шины
 * проходит по карте кольцом.
 */

const CELL = 24;
const LEVELS = 14;
const SCALE = 0.1;
/** Единиц шума в секунду: рельеф заметно меняется за десятки секунд */
const DRIFT = 0.025;
const PULSE_MS = 1400;

export function createScene(canvas: HTMLCanvasElement, { seed }: SceneOptions): BackgroundScene {
  const ctx = context2d(canvas);
  const noise = createNoise3(seed);
  const levels = contourLevels(LEVELS);
  const pointer = createSmoothPointer();
  let width = 0;
  let height = 0;
  let cols = 0;
  let rows = 0;
  let heights = new Float32Array(0);
  let colors: SceneColors | null = null;
  let time = seed % 97;
  let pulses: TimedPulse[] = [];

  /** Холм под курсором и кольцо волны — добавкой к высотам узлов */
  const shape = (input: SceneInput, now: number) => {
    const active = livePulses(pulses, now, PULSE_MS);

    pulses = active;

    if ((pointer.weight === 0 || input.gain === 0) && active.length === 0) return;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const px = x * CELL;
        const py = y * CELL;
        let bump = 0;

        if (pointer.weight > 0) {
          const d2 = (px - pointer.x) ** 2 + (py - pointer.y) ** 2;

          bump += 0.16 * input.gain * pointer.weight * Math.exp(-d2 / (2 * 90 * 90));
        }

        for (const pulse of active) {
          const progress = (now - pulse.at) / PULSE_MS;
          const d = Math.hypot(px - pulse.x, py - pulse.y);
          const off = (d - progress * 520) / 60;

          bump += 0.1 * pulse.strength * input.gain * (1 - progress) * Math.exp(-off * off);
        }

        heights[y * cols + x] = heights[y * cols + x]! + bump;
      }
    }
  };

  const draw = () => {
    if (!colors) return;

    ctx.clearRect(0, 0, width, height);
    ctx.lineJoin = 'round';

    for (const { index, segments } of contourSegments(heights, cols, rows, levels)) {
      const path = new Path2D();

      for (let s = 0; s < segments.length; s += 4) {
        path.moveTo(segments[s]! * CELL, segments[s + 1]! * CELL);
        path.lineTo(segments[s + 2]! * CELL, segments[s + 3]! * CELL);
      }

      // Индексная горизонталь — акцентом и чуть толще, как на топокарте
      ctx.lineWidth = index ? 1.25 : 1;
      ctx.strokeStyle = index
        ? rgba(colors.accent, colors.accentAlpha * 0.6)
        : rgba(colors.ink, colors.inkAlpha * 1.5);
      ctx.stroke(path);
    }
  };

  const render = (input: SceneInput, now: number) => {
    sampleHeights(noise, cols, rows, SCALE, time, heights);
    shape(input, now);
    draw();
  };

  return {
    resize(w, h, dpr) {
      width = w;
      height = h;
      cols = Math.ceil(w / CELL) + 2;
      rows = Math.ceil(h / CELL) + 2;
      heights = new Float32Array(cols * rows);
      fitCanvas(canvas, ctx, w, h, dpr);
    },
    setColors(next) {
      colors = next;
    },
    frame(now, dt, input) {
      time += (dt / 1000) * DRIFT;
      followPointer(pointer, input.pointer, dt);
      render(input, now);

      return true;
    },
    still(input) {
      pointer.weight = 0;
      render(input, 0);

      return true;
    },
    pulse(pulse, now) {
      pulses = addPulse(pulses, pulse, now);
    },
  };
}
