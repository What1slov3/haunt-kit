import { random } from '../noise';
import { cellBrightness, createRain, RAIN_GLYPHS, stepRain, type RainState } from '../rain';
import type { BackgroundScene, SceneColors, SceneOptions } from '../scene';

import { context2d, fitCanvas, rgba } from './canvas';
import { createSmoothPointer, followPointer } from './shared';

/*
 * `rain` на Canvas 2D. Символы один раз рисуются в атлас (fillText дорогой, а клеток на кадр —
 * сотни), кадр — только drawImage из атласа с прозрачностью по яркости клетки. Голова капли —
 * акцентом, хвост — нейтральным цветом; всё тёмное и тихое, это фон под чатом.
 */

const COL = 16;
const ROW = 20;
const FONT_PX = 13;

export function createScene(canvas: HTMLCanvasElement, { seed }: SceneOptions): BackgroundScene {
  const ctx = context2d(canvas);
  const rand = random(seed);
  const atlas = document.createElement('canvas');
  const pointer = createSmoothPointer();
  let width = 0;
  let height = 0;
  let scale = 1;
  let state: RainState | null = null;
  let colors: SceneColors | null = null;

  /** Две строки атласа: нейтральные символы и акцентные (голова), по клетке COL × ROW на символ */
  const buildAtlas = () => {
    const actx = atlas.getContext('2d');

    if (!actx || !colors) return;

    atlas.width = Math.ceil(RAIN_GLYPHS.length * COL * scale);
    atlas.height = Math.ceil(ROW * 2 * scale);
    actx.setTransform(scale, 0, 0, scale, 0, 0);
    actx.clearRect(0, 0, RAIN_GLYPHS.length * COL, ROW * 2);
    actx.font = `${FONT_PX}px ${colors.monoFont}`;
    actx.textAlign = 'center';
    actx.textBaseline = 'middle';

    RAIN_GLYPHS.forEach((glyph, i) => {
      actx.fillStyle = rgba(colors!.ink, 1);
      actx.fillText(glyph, i * COL + COL / 2, ROW / 2);
      actx.fillStyle = rgba(colors!.accent, 1);
      actx.fillText(glyph, i * COL + COL / 2, ROW + ROW / 2);
    });
  };

  const draw = () => {
    if (!state || !colors) return;

    const sw = COL * scale;
    const sh = ROW * scale;
    // Нейтральный хвост едва виден: прозрачность точек сетки ×3 — порядка 0.25 в тёмной теме
    const tail = Math.min(0.5, colors.inkAlpha * 3);

    ctx.clearRect(0, 0, width, height);

    for (let c = 0; c < state.cols; c++) {
      const headRow = Math.floor(state.head[c]!);
      const from = Math.max(0, Math.ceil(state.head[c]! - state.length[c]!));
      const to = Math.min(state.rows - 1, headRow);
      // Колонки у курсора чуть ярче — «присмотрелся»
      const near =
        pointer.weight > 0
          ? Math.max(0, 1 - Math.abs(c * COL - pointer.x) / 120) * pointer.weight
          : 0;

      for (let r = from; r <= to; r++) {
        const brightness = cellBrightness(state, c, r);

        if (brightness <= 0) continue;

        const glyph = state.glyphs[r * state.cols + c]!;
        const isHead = r === headRow;

        ctx.globalAlpha = isHead
          ? colors.accentAlpha * 0.9
          : tail * brightness * brightness * (1 + near * 1.5);
        ctx.drawImage(atlas, glyph * sw, isHead ? sh : 0, sw, sh, c * COL, r * ROW, COL, ROW);
      }
    }

    ctx.globalAlpha = 1;
  };

  return {
    resize(w, h, dpr) {
      width = w;
      height = h;
      scale = dpr;
      fitCanvas(canvas, ctx, w, h, dpr);
      state = createRain(Math.ceil(w / COL), Math.ceil(h / ROW), rand);
      buildAtlas();
    },
    setColors(next) {
      colors = next;
      buildAtlas();
    },
    frame(_now, dt, input) {
      if (!state) return true;

      followPointer(pointer, input.gain > 0 ? input.pointer : null, dt);
      stepRain(state, dt / 1000, rand);
      draw();

      return true;
    },
    still() {
      draw();

      return true;
    },
    pulse(pulse) {
      if (!state) return;

      // Волна шины — капли срываются с места действия в нескольких соседних колонках
      const center = Math.round(pulse.x / COL);
      const spread = Math.round(2 + pulse.strength * 4);

      for (let c = center - spread; c <= center + spread; c++) {
        if (c < 0 || c >= state.cols) continue;

        state.head[c] = pulse.y / ROW + rand() * 2;
        state.length[c] = 4 + rand() * 6;
      }
    },
  };
}
