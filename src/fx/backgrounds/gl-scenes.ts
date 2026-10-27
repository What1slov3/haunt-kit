import type { UniformValue } from '../webgl/gl';
import { renderShaderPass } from '../webgl/shared-context';

import { CONTOUR, FLOW, MESH, STARFIELD } from './background-shaders';
import { meshColors, meshNodes, pullNodes } from './mesh';
import type { BackgroundScene, Rgb, SceneColors, SceneInput, SceneOptions } from './scene';
import {
  addPulse,
  createSmoothPointer,
  followPointer,
  livePulses,
  type TimedPulse,
} from './scenes/shared';
import { jumpSpeed } from './starfield';

/*
 * Шейдерные сцены фонов: проход фрагментного шейдера в общем WebGL-контексте страницы
 * (`renderShaderPass`) и копия результата в холст фона. Модуль — отдельный чанк, грузится только на
 * пути webgl. Проход не удался (контекст потерян, программа не собралась) — `frame` возвращает false,
 * хост переходит на Canvas 2D.
 */

export type GlVariant = 'flow' | 'contour' | 'mesh' | 'starfield';

interface Spec {
  program: string;
  fragment: string;
  /** Пикселей прохода на CSS px: мягким фонам хватает доли разрешения, браузер растянет */
  scale(dpr: number): number;
  pulseMs: number;
  /** Свои uniforms варианта; `time` — секунды сцены */
  uniforms(
    time: number,
    dt: number,
    input: SceneInput,
    state: SceneState,
  ): Record<string, UniformValue>;
}

interface SceneState {
  width: number;
  height: number;
  pulses: TimedPulse[];
  now: number;
  colors: SceneColors;
}

const unit = (color: Rgb): number[] => [color[0] / 255, color[1] / 255, color[2] / 255];

function starfieldSpec(): Spec & { jump(strength: number): void } {
  const look = { x: 0, y: 0 };
  const pointer = createSmoothPointer();
  let travel = 0;
  let jumpAt = -Infinity;
  let jumpStrength = 0;
  let seconds = 0;

  return {
    program: 'bg-starfield',
    fragment: STARFIELD,
    scale: (dpr) => Math.min(dpr, 2),
    pulseMs: 1,
    uniforms(time, dt, input, state) {
      seconds = time;
      followPointer(pointer, input.gain > 0 ? input.pointer : null, dt);

      const k = 1 - Math.exp(-dt / 400);
      const tx = pointer.weight
        ? ((pointer.x / state.width) * 2 - 1) * pointer.weight * input.gain
        : 0;
      const ty = pointer.weight
        ? ((pointer.y / state.height) * 2 - 1) * pointer.weight * input.gain
        : 0;
      const warp = jumpStrength * jumpSpeed(time - jumpAt);

      look.x += (tx - look.x) * k;
      look.y += (ty - look.y) * k;
      // Путь копится, а не считается от времени: прыжок ускоряет полёт, не телепортирует
      travel = (travel + (dt / 1000) * (0.012 + 1.2 * warp)) % 1;

      return { u_travel: travel, u_warp: warp, u_look: [look.x, look.y] };
    },
    jump(strength) {
      jumpAt = seconds;
      jumpStrength = Math.min(1, Math.max(0.2, strength));
    },
  };
}

function specFor(variant: GlVariant): Spec & { jump?(strength: number): void } {
  switch (variant) {
    case 'contour':
      return {
        program: 'bg-contour',
        fragment: CONTOUR,
        scale: (dpr) => Math.min(dpr, 2),
        pulseMs: 1400,
        uniforms: (time) => ({ u_time: time * 0.025 }),
      };
    case 'flow':
      return {
        program: 'bg-flow',
        fragment: FLOW,
        scale: () => 0.5,
        pulseMs: 900,
        uniforms: (time) => ({ u_time: time }),
      };
    case 'mesh':
      return {
        program: 'bg-mesh',
        fragment: MESH,
        scale: () => 0.25,
        pulseMs: 1600,
        uniforms(time, _dt, _input, state) {
          let nodes = meshNodes(time + 11);

          for (const pulse of state.pulses) {
            const t = (state.now - pulse.at) / 1600;

            nodes = pullNodes(
              nodes,
              pulse.x / state.width,
              pulse.y / state.height,
              0.18 * pulse.strength * Math.sin(Math.PI * t),
            );
          }

          return {
            u_time: time,
            u_nodes: nodes.flatMap((node) => [node.x, node.y, node.radius]),
            u_nodeColors: meshColors(state.colors).flatMap(unit),
          };
        },
      };
    case 'starfield':
      return starfieldSpec();
  }
}

export function createGlScene(
  variant: GlVariant,
  canvas: HTMLCanvasElement,
  { seed }: SceneOptions,
): BackgroundScene {
  const spec = specFor(variant);
  const pointer = createSmoothPointer();
  const pulseData = new Float32Array(16);
  let width = 0;
  let height = 0;
  let scale = 1;
  let colors: SceneColors | null = null;
  let pulses: TimedPulse[] = [];
  // Разный seed — разное место во времени: две копии одного фона рядом не совпадают
  let time = (seed % 1000) * 0.37;

  const render = (now: number, dt: number, input: SceneInput) => {
    if (!colors || width < 1 || height < 1) return true;

    followPointer(pointer, input.gain > 0 ? input.pointer : null, dt);
    pulses = livePulses(pulses, now, spec.pulseMs);
    pulseData.fill(0);

    for (let i = 0; i < 4; i++) {
      const pulse = pulses[i];

      pulseData[i * 4 + 2] = -1;

      if (!pulse) continue;

      pulseData[i * 4] = pulse.x;
      pulseData[i * 4 + 1] = pulse.y;
      pulseData[i * 4 + 2] = (now - pulse.at) / spec.pulseMs;
      pulseData[i * 4 + 3] = pulse.strength;
    }

    const own = spec.uniforms(time, dt, input, { width, height, pulses, now, colors });

    return renderShaderPass(canvas, {
      program: spec.program,
      fragment: spec.fragment,
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale)),
      textures: {},
      uniforms: {
        u_resolution: [Math.round(width * scale), Math.round(height * scale)],
        u_scale: scale,
        u_size: [width, height],
        u_time: time,
        u_ink: unit(colors.ink),
        u_accent: unit(colors.accent),
        u_accent2: unit(colors.accent2),
        u_tint2: unit(colors.tint2),
        u_tint3: unit(colors.tint3),
        u_inkAlpha: colors.inkAlpha,
        u_accentAlpha: colors.accentAlpha,
        u_dark: colors.dark,
        u_pointer: [pointer.x, pointer.y, pointer.weight * input.gain],
        u_pulses: pulseData,
        ...own,
      },
    });
  };

  return {
    resize(w, h, dpr) {
      width = w;
      height = h;
      scale = spec.scale(dpr);
    },
    setColors(next) {
      colors = next;
    },
    frame(now, dt, input) {
      time += dt / 1000;

      return render(now, dt, input);
    },
    still(input) {
      pointer.weight = 0;
      pulses = [];

      return render(0, 0, { ...input, pointer: null });
    },
    pulse(pulse, now) {
      pulses = addPulse(pulses, pulse, now);
    },
    jump: spec.jump ? (strength) => spec.jump?.(strength) : undefined,
  };
}
