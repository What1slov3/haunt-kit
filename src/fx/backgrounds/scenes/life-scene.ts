import { GLIDER, isStagnant, seedLife, stamp, stepLife } from '../life';
import { random } from '../noise';
import type { BackgroundScene, SceneColors, SceneOptions } from '../scene';

import { context2d, fitCanvas, rgba } from './canvas';
import { createSmoothPointer, followPointer } from './shared';

/*
 * `life` на Canvas 2D: поколение раз в GENERATION_MS, между поколениями — плавный переход
 * (рождённые проявляются, умершие гаснут), так автомат читается как текстура, а не мигание. Застой —
 * подсев случайного пятна; волна шины бросает глайдеры в место действия; у курсора клетки — акцентом.
 */

const CELL = 12;
const GENERATION_MS = 900;
const DENSITY = 0.3;
const SOUP = 14;
const GLIDER_EVERY = 16;

export function createScene(canvas: HTMLCanvasElement, { seed }: SceneOptions): BackgroundScene {
  const ctx = context2d(canvas);
  const rand = random(seed);
  const pointer = createSmoothPointer();
  let width = 0;
  let height = 0;
  let cols = 0;
  let rows = 0;
  let previous: Uint8Array = new Uint8Array(0);
  let current: Uint8Array = new Uint8Array(0);
  let twoAgo: Uint8Array = new Uint8Array(0);
  let spare: Uint8Array = new Uint8Array(0);
  let alive = 0;
  let generations = 0;
  let sinceStep = 0;
  let colors: SceneColors | null = null;

  const generation = () => {
    // Буферы по кругу: next ← spare, current → previous, previous → twoAgo
    alive = stepLife(current, spare, cols, rows);

    const recycled = twoAgo;

    twoAgo = previous;
    previous = current;
    current = spare;
    spare = recycled;

    generations += 1;

    // Поле на торе быстро застывает в блоки и мигалки: застой — подсев пятна «бульона», а редкий
    // глайдер не даёт узору замереть совсем
    if (isStagnant(current, twoAgo, alive, (cols * rows) / 60)) {
      const x = Math.floor(rand() * cols);
      const y = Math.floor(rand() * rows);

      for (let dy = 0; dy < SOUP; dy++) {
        for (let dx = 0; dx < SOUP; dx++) {
          if (rand() < 0.45) stamp(current, cols, rows, x + dx, y + dy, [[0, 0]]);
        }
      }
    }

    if (generations % GLIDER_EVERY === 0) {
      stamp(current, cols, rows, Math.floor(rand() * cols), Math.floor(rand() * rows), GLIDER);
    }
  };

  const draw = (t: number) => {
    if (!colors) return;

    const steady = new Path2D();
    const born = new Path2D();
    const dying = new Path2D();
    const lit = new Path2D();
    const near = pointer.weight > 0.05;
    const reach2 = 90 * 90;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const now = current[i] === 1;
        const was = previous[i] === 1;

        if (!now && !was) continue;

        const px = x * CELL + 1;
        const py = y * CELL + 1;
        const size = CELL - 2;

        if (near && now && (px - pointer.x) ** 2 + (py - pointer.y) ** 2 < reach2) {
          lit.rect(px, py, size, size);
        } else if (now && was) steady.rect(px, py, size, size);
        else if (now) born.rect(px, py, size, size);
        else dying.rect(px, py, size, size);
      }
    }

    const alpha = Math.min(0.35, colors.inkAlpha * 1.6);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = rgba(colors.ink, alpha);
    ctx.fill(steady);
    ctx.fillStyle = rgba(colors.ink, alpha * t);
    ctx.fill(born);
    ctx.fillStyle = rgba(colors.ink, alpha * (1 - t));
    ctx.fill(dying);
    ctx.fillStyle = rgba(colors.accent, colors.accentAlpha * 0.45 * pointer.weight);
    ctx.fill(lit);
  };

  return {
    resize(w, h, dpr) {
      width = w;
      height = h;
      cols = Math.ceil(w / CELL);
      rows = Math.ceil(h / CELL);
      fitCanvas(canvas, ctx, w, h, dpr);
      current = seedLife(cols, rows, DENSITY, rand);
      previous = current.slice();
      twoAgo = new Uint8Array(cols * rows);
      spare = new Uint8Array(cols * rows);

      // Первые поколения случайного поля — «кипение»; фон показывает уже успокоившийся узор
      for (let i = 0; i < 12; i++) generation();
    },
    setColors(next) {
      colors = next;
    },
    frame(_now, dt, input) {
      followPointer(pointer, input.gain > 0 ? input.pointer : null, dt);
      sinceStep += dt;

      if (sinceStep >= GENERATION_MS) {
        sinceStep %= GENERATION_MS;
        generation();
      }

      draw(Math.min(1, sinceStep / (GENERATION_MS * 0.6)));

      return true;
    },
    still() {
      pointer.weight = 0;
      draw(1);

      return true;
    },
    pulse(pulse) {
      const x = Math.floor(pulse.x / CELL);
      const y = Math.floor(pulse.y / CELL);
      const count = 1 + Math.round(pulse.strength * 2);

      for (let k = 0; k < count; k++) stamp(current, cols, rows, x + k * 4, y - k * 4, GLIDER);
    },
  };
}
