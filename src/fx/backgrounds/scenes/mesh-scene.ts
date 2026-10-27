import { meshColors, meshNodes, pullNodes, type MeshNode } from '../mesh';
import type { BackgroundScene, Rgb, SceneColors, SceneInput, SceneOptions } from '../scene';

import { context2d, fitCanvas, rgba } from './canvas';
import {
  addPulse,
  createSmoothPointer,
  followPointer,
  livePulses,
  type TimedPulse,
} from './shared';

/*
 * `mesh` на Canvas 2D: радиальные градиенты узлов на холсте в 1/8 размера — браузер растягивает его
 * билинейно, и мягкость получается даром: ни blur, ни полноразмерной заливки. Тот же набор узлов
 * (`meshNodes`) получает шейдер.
 */

const SCALE = 0.125;
const PULSE_MS = 1600;

export function createScene(canvas: HTMLCanvasElement, _options: SceneOptions): BackgroundScene {
  const ctx = context2d(canvas);
  const pointer = createSmoothPointer();
  let width = 0;
  let height = 0;
  let colors: SceneColors | null = null;
  let time = 11;
  let pulses: TimedPulse[] = [];

  const draw = (nodes: MeshNode[], input: SceneInput) => {
    if (!colors) return;

    const palette = meshColors(colors);
    const span = Math.max(width, height);
    const alpha = colors.dark ? 0.34 : 0.42;

    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = colors.dark ? 'lighter' : 'source-over';

    const blob = (x: number, y: number, radius: number, color: Rgb, a: number) => {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);

      gradient.addColorStop(0, rgba(color, a));
      gradient.addColorStop(0.55, rgba(color, a * 0.45));
      gradient.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    };

    nodes.forEach((node, i) => {
      blob(
        node.x * width,
        node.y * height,
        node.radius * span,
        palette[i % palette.length]!,
        alpha,
      );
    });

    if (pointer.weight > 0 && input.gain > 0) {
      blob(
        pointer.x,
        pointer.y,
        span * 0.22,
        colors.accent,
        alpha * 0.5 * pointer.weight * input.gain,
      );
    }

    ctx.globalCompositeOperation = 'source-over';
  };

  const nodesNow = (now: number) => {
    let nodes = meshNodes(time);

    pulses = livePulses(pulses, now, PULSE_MS);

    for (const pulse of pulses) {
      const t = (now - pulse.at) / PULSE_MS;
      // Втягивание и отпускание: синус по времени жизни волны
      const amount = 0.18 * pulse.strength * Math.sin(Math.PI * t);

      nodes = pullNodes(nodes, pulse.x / width, pulse.y / height, amount);
    }

    return nodes;
  };

  return {
    resize(w, h) {
      width = w;
      height = h;
      fitCanvas(canvas, ctx, w, h, SCALE);
    },
    setColors(next) {
      colors = next;
    },
    frame(now, dt, input) {
      time += dt / 1000;
      followPointer(pointer, input.pointer, dt);
      draw(nodesNow(now), input);

      return true;
    },
    still(input) {
      pointer.weight = 0;
      draw(meshNodes(time), input);

      return true;
    },
    pulse(pulse, now) {
      pulses = addPulse(pulses, pulse, now);
    },
  };
}
