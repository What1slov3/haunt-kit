import type { BackgroundScene, SceneColors, SceneInput, SceneOptions } from '../scene';
import { smoothLevel, waveSample } from '../waveform';

import { context2d, fitCanvas, rgba } from './canvas';
import { createSmoothPointer, followPointer } from './shared';

/*
 * `waveform` на Canvas 2D: сетка осциллографа (один раз во внеэкранный холст) и три линии. Главная —
 * акцентом и со свечением в тёмной теме, две вторые — тише и со сдвигом фазы. Уровень голоса
 * сглаживается здесь же; волна шины — короткий всплеск уровня, курсор чуть раскачивает линии под собой.
 */

const LINES = 3;
const STEP = 4;
const GRID = 48;

export function createScene(canvas: HTMLCanvasElement, _options: SceneOptions): BackgroundScene {
  const ctx = context2d(canvas);
  const base = document.createElement('canvas');
  const pointer = createSmoothPointer();
  let width = 0;
  let height = 0;
  let scale = 1;
  let colors: SceneColors | null = null;
  let level = 0;
  let burst = 0;
  let time = 0;

  const renderBase = () => {
    const bctx = base.getContext('2d');

    if (!bctx || !colors) return;

    fitCanvas(base, bctx, width, height, scale);
    bctx.clearRect(0, 0, width, height);
    bctx.strokeStyle = rgba(colors.ink, colors.inkAlpha * 0.8);
    bctx.lineWidth = 1;
    bctx.beginPath();

    for (let x = (width / 2) % GRID; x < width; x += GRID) {
      bctx.moveTo(Math.round(x) + 0.5, 0);
      bctx.lineTo(Math.round(x) + 0.5, height);
    }

    for (let y = (height / 2) % GRID; y < height; y += GRID) {
      bctx.moveTo(0, Math.round(y) + 0.5);
      bctx.lineTo(width, Math.round(y) + 0.5);
    }

    bctx.stroke();
  };

  const linePath = (line: number, amplitude: number, input: SceneInput) => {
    const path = new Path2D();
    const center = height / 2 + (line - 1) * 26;

    for (let x = 0; x <= width + STEP; x += STEP) {
      const u = x / width;
      // Под курсором амплитуда чуть выше — линия «тянется» к руке
      const near =
        pointer.weight > 0
          ? 1 + 0.6 * input.gain * pointer.weight * Math.exp(-(((x - pointer.x) / 160) ** 2))
          : 1;
      const y = center + waveSample(u, time, Math.min(1, level + burst), line) * amplitude * near;

      if (x === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    }

    return path;
  };

  const draw = (input: SceneInput) => {
    if (!colors) return;

    const amplitude = Math.min(height * 0.28, 160);

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(base, 0, 0, width, height);
    ctx.lineJoin = 'round';

    for (let line = LINES - 1; line >= 0; line--) {
      const path = linePath(line, amplitude * (line === 0 ? 1 : 0.6), input);

      if (line === 0) {
        if (colors.dark) {
          ctx.strokeStyle = rgba(colors.accent, colors.accentAlpha * 0.18);
          ctx.lineWidth = 6;
          ctx.stroke(path);
        }

        ctx.strokeStyle = rgba(colors.accent, colors.accentAlpha * 0.85);
        ctx.lineWidth = 1.5;
      } else {
        ctx.strokeStyle = rgba(colors.ink, colors.inkAlpha * 2.2);
        ctx.lineWidth = 1;
      }

      ctx.stroke(path);
    }
  };

  return {
    resize(w, h, dpr) {
      width = w;
      height = h;
      scale = dpr;
      fitCanvas(canvas, ctx, w, h, dpr);
      renderBase();
    },
    setColors(next) {
      colors = next;
      renderBase();
    },
    frame(_now, dt, input) {
      const seconds = dt / 1000;

      time += seconds;
      level = smoothLevel(level, input.level, seconds);
      burst *= Math.exp(-seconds / 0.35);
      followPointer(pointer, input.pointer, dt);
      draw(input);

      return true;
    },
    still(input) {
      level = input.level;
      time = 1.3;
      pointer.weight = 0;
      draw(input);

      return true;
    },
    pulse(pulse) {
      burst = Math.min(0.8, burst + pulse.strength * 0.6);
    },
  };
}
