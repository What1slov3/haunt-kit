import { hexCells, hexDistance, pixelToHex, waveIntensity, type Hex } from '../hex-grid';
import { random } from '../noise';
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
 * `hex` на Canvas 2D. Контуры всех клеток — один раз во внеэкранный холст; кадр — копия основы и
 * заливка только «горящих» клеток: под фронтом волны шины, у курсора и пара редких мерцаний, чтобы
 * сетка была живой и без действий.
 */

const SIZE = 18;
const PULSE_LIFE = 1.2;
const TWINKLES = 5;

interface Twinkle {
  cell: Hex;
  at: number;
  life: number;
}

export function createScene(canvas: HTMLCanvasElement, { seed }: SceneOptions): BackgroundScene {
  const ctx = context2d(canvas);
  const rand = random(seed);
  const base = document.createElement('canvas');
  const pointer = createSmoothPointer();
  let width = 0;
  let height = 0;
  let scale = 1;
  let cells: Hex[] = [];
  let colors: SceneColors | null = null;
  let pulses: TimedPulse[] = [];
  let twinkles: Twinkle[] = [];
  let time = 0;

  const hexPath = (path: Path2D, x: number, y: number, size: number) => {
    for (let k = 0; k < 6; k++) {
      const a = (Math.PI / 3) * k;
      const px = x + Math.cos(a) * size;
      const py = y + Math.sin(a) * size;

      if (k === 0) path.moveTo(px, py);
      else path.lineTo(px, py);
    }

    path.closePath();
  };

  const renderBase = () => {
    const bctx = base.getContext('2d');

    if (!bctx || !colors) return;

    fitCanvas(base, bctx, width, height, scale);
    bctx.clearRect(0, 0, width, height);

    const path = new Path2D();

    for (const cell of cells) hexPath(path, cell.x, cell.y, SIZE - 1.5);

    bctx.strokeStyle = rgba(colors.ink, colors.inkAlpha * 1.1);
    bctx.lineWidth = 1;
    bctx.stroke(path);
  };

  const spawnTwinkle = (): Twinkle => ({
    cell: cells[Math.floor(rand() * cells.length)]!,
    at: time + rand() * 3,
    life: 2 + rand() * 2,
  });

  const draw = (input: SceneInput, now: number) => {
    if (!colors) return;

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(base, 0, 0, width, height);

    // Заливки — корзинами по силе, одним fill() на корзину
    const levels = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    const add = (cell: Hex, strength: number) => {
      if (strength < 0.06) return;

      hexPath(levels[Math.min(3, Math.floor(strength * 4))]!, cell.x, cell.y, SIZE - 2.5);
    };

    pulses = livePulses(pulses, now, PULSE_LIFE * 1000);

    const sources = pulses.map((pulse) => ({
      hex: pixelToHex(pulse.x, pulse.y, SIZE),
      elapsed: (now - pulse.at) / 1000,
      strength: pulse.strength,
    }));
    const pointerHex = pointer.weight > 0 ? pixelToHex(pointer.x, pointer.y, SIZE) : null;

    for (const cell of cells) {
      let strength = 0;

      for (const source of sources) {
        strength += waveIntensity(hexDistance(cell, source.hex), source.elapsed) * source.strength;
      }

      if (pointerHex) {
        const d = hexDistance(cell, pointerHex);

        if (d <= 2) strength += (1 - d / 3) * 0.45 * pointer.weight * input.gain;
      }

      if (strength > 0) add(cell, Math.min(1, strength));
    }

    for (const twinkle of twinkles) {
      const t = (time - twinkle.at) / twinkle.life;

      if (t > 0 && t < 1) add(twinkle.cell, Math.sin(Math.PI * t) * 0.3);
    }

    levels.forEach((path, i) => {
      ctx.fillStyle = rgba(colors!.accent, colors!.accentAlpha * 0.28 * ((i + 1) / 4));
      ctx.fill(path);
    });
  };

  return {
    resize(w, h, dpr) {
      width = w;
      height = h;
      scale = dpr;
      fitCanvas(canvas, ctx, w, h, dpr);
      cells = hexCells(w, h, SIZE);
      twinkles = Array.from({ length: TWINKLES }, spawnTwinkle);
      renderBase();
    },
    setColors(next) {
      colors = next;
      renderBase();
    },
    frame(now, dt, input) {
      time += dt / 1000;
      followPointer(pointer, input.gain > 0 ? input.pointer : null, dt);
      twinkles = twinkles.map((t) => (time - t.at > t.life ? spawnTwinkle() : t));
      draw(input, now);

      return true;
    },
    still(input) {
      pointer.weight = 0;
      pulses = [];
      draw(input, 0);

      return true;
    },
    pulse(pulse, now) {
      pulses = addPulse(pulses, pulse, now);
    },
  };
}
