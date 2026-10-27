import { random } from '../noise';
import type { BackgroundScene, SceneColors, SceneInput, SceneOptions } from '../scene';
import {
  advanceStars,
  jumpSpeed,
  layoutStars,
  projectStar,
  STRIDE,
  type Projection,
} from '../starfield';

import { ALPHA_BUCKETS, bucketOf, context2d, fitCanvas, rgba } from './canvas';
import { createSmoothPointer, followPointer } from './shared';

/*
 * `starfield` на Canvas 2D: звёзды летят к камере очень медленно, взгляд сдвигается за курсором
 * (параллакс по глубине), «прыжок» по `ambient.jump()` разгоняет поле — звёзды тянутся в штрихи
 * от центра. Точки и штрихи — корзинами прозрачности.
 */

const BASE_SPEED = 0.012;
const JUMP_SPEED = 1.6;

export function createScene(canvas: HTMLCanvasElement, { seed }: SceneOptions): BackgroundScene {
  const ctx = context2d(canvas);
  const rand = random(seed);
  const pointer = createSmoothPointer();
  const look = { x: 0, y: 0 };
  const a: Projection = { x: 0, y: 0, size: 0, alpha: 0 };
  const b: Projection = { x: 0, y: 0, size: 0, alpha: 0 };
  let width = 0;
  let height = 0;
  let stars: Float32Array = new Float32Array(0);
  let colors: SceneColors | null = null;
  let jumpAt = -Infinity;
  let jumpStrength = 0;
  let time = 0;

  const draw = (speed: number) => {
    if (!colors) return;

    const dots = Array.from({ length: ALPHA_BUCKETS }, () => new Path2D());
    const streaks = Array.from({ length: ALPHA_BUCKETS }, () => new Path2D());
    // Длина штриха — путь звезды за ~60 мс: на крейсерской скорости это точка, в прыжке — линия
    const trail = speed * 0.06;

    for (let i = 0; i < stars.length / STRIDE; i++) {
      projectStar(stars, i, width, height, look.x, look.y, a);

      if (a.alpha < 0.03 || a.x < -4 || a.y < -4 || a.x > width + 4 || a.y > height + 4) continue;

      const bucket = bucketOf(a.alpha);

      if (trail > 0.004) {
        stars[i * STRIDE + 2] = stars[i * STRIDE + 2]! + trail;
        projectStar(stars, i, width, height, look.x, look.y, b);
        stars[i * STRIDE + 2] = stars[i * STRIDE + 2]! - trail;
        streaks[bucket]!.moveTo(b.x, b.y);
        streaks[bucket]!.lineTo(a.x, a.y);
      } else {
        dots[bucket]!.rect(a.x - a.size / 2, a.y - a.size / 2, a.size, a.size);
      }
    }

    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';

    for (let k = 0; k < ALPHA_BUCKETS; k++) {
      const alpha = Math.min(1, colors.inkAlpha * 11) * ((k + 0.5) / ALPHA_BUCKETS);

      ctx.fillStyle = rgba(colors.ink, alpha);
      ctx.fill(dots[k]!);
      ctx.strokeStyle = rgba(colors.accent, colors.accentAlpha * ((k + 0.5) / ALPHA_BUCKETS));
      ctx.stroke(streaks[k]!);
    }
  };

  const steer = (input: SceneInput, dt: number) => {
    followPointer(pointer, input.gain > 0 ? input.pointer : null, dt);

    const k = 1 - Math.exp(-dt / 400);
    const tx = pointer.weight > 0 ? ((pointer.x / width) * 2 - 1) * pointer.weight * input.gain : 0;
    const ty =
      pointer.weight > 0 ? ((pointer.y / height) * 2 - 1) * pointer.weight * input.gain : 0;

    look.x += (tx - look.x) * k;
    look.y += (ty - look.y) * k;
  };

  return {
    resize(w, h, dpr) {
      width = w;
      height = h;
      fitCanvas(canvas, ctx, w, h, dpr);
      stars = layoutStars(Math.round(Math.min(900, Math.max(250, (w * h) / 1500))), rand);
    },
    setColors(next) {
      colors = next;
    },
    frame(_now, dt, input) {
      const seconds = dt / 1000;

      time += seconds;
      steer(input, dt);

      const speed = BASE_SPEED + JUMP_SPEED * jumpStrength * jumpSpeed(time - jumpAt);

      advanceStars(stars, speed, seconds, rand);
      draw(speed);

      return true;
    },
    still() {
      look.x = 0;
      look.y = 0;
      draw(0);

      return true;
    },
    jump(strength) {
      jumpAt = time;
      jumpStrength = Math.min(1, Math.max(0.2, strength));
    },
    pulse(pulse) {
      // Волна шины — едва заметный толчок вперёд, не прыжок
      if (time - jumpAt > 1.4) {
        jumpAt = time;
        jumpStrength = 0.12 * pulse.strength;
      }
    },
  };
}
