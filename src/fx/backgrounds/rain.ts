/*
 * Дождь символов — ядро фона `rain`. Колонка — «капля»: голова на дробной строке, скорость, длина
 * хвоста и пауза перед следующим падением. Символы лежат сеткой и изредка меняются сами — так хвост
 * «шуршит», а не просто едет. Чистые функции: кадр рисует rain-сцена, здесь только состояние.
 */

/** Только то, что есть в моно-шрифте кита: чужой шрифт-заменитель сбил бы ширину колонок */
export const RAIN_GLYPHS = '0123456789ABCDEFHKLMNPRTXZЖЯЦШЫ:=+*<>|#%'.split('');

export interface RainState {
  cols: number;
  rows: number;
  /** Строка головы колонки (может быть < 0 — капля ещё не вошла в экран) */
  head: Float32Array;
  /** Строк в секунду */
  speed: Float32Array;
  /** Длина хвоста, строк */
  length: Float32Array;
  /** Индексы символов в RAIN_GLYPHS, cols × rows */
  glyphs: Uint8Array;
}

/** Медленно: от 1.5 до 4.5 строк в секунду — фон, а не заставка из кино */
const MIN_SPEED = 1.5;
const MAX_SPEED = 4.5;

function restart(state: RainState, col: number, rand: () => number, initial: boolean) {
  state.speed[col] = MIN_SPEED + rand() * (MAX_SPEED - MIN_SPEED);
  state.length[col] = 6 + Math.floor(rand() * 14);
  // Пауза перед падением — голова выше экрана на случайное число строк
  state.head[col] = initial ? rand() * (state.rows + 20) - 10 : -rand() * state.rows * 1.5;
}

export function createRain(cols: number, rows: number, rand: () => number): RainState {
  const state: RainState = {
    cols,
    rows,
    head: new Float32Array(cols),
    speed: new Float32Array(cols),
    length: new Float32Array(cols),
    glyphs: new Uint8Array(cols * rows),
  };

  for (let c = 0; c < cols; c++) restart(state, c, rand, true);

  for (let i = 0; i < state.glyphs.length; i++) {
    state.glyphs[i] = Math.floor(rand() * RAIN_GLYPHS.length);
  }

  return state;
}

/** Шаг на dt секунд: головы падают, ушедшие за низ — перезапускаются, часть символов меняется */
export function stepRain(state: RainState, dt: number, rand: () => number): void {
  for (let c = 0; c < state.cols; c++) {
    state.head[c] = state.head[c]! + state.speed[c]! * dt;

    if (state.head[c]! - state.length[c]! > state.rows) restart(state, c, rand, false);
  }

  // ~2 % символов в секунду: шорох в хвостах без мельтешения
  const changes = Math.round(state.glyphs.length * 0.02 * dt);

  for (let i = 0; i < changes; i++) {
    state.glyphs[Math.floor(rand() * state.glyphs.length)] = Math.floor(
      rand() * RAIN_GLYPHS.length,
    );
  }
}

/**
 * Яркость клетки 0…1: голова — 1, хвост гаснет к концу, над головой и за хвостом — 0.
 */
export function cellBrightness(state: RainState, col: number, row: number): number {
  const behind = state.head[col]! - row;

  if (behind < 0 || behind > state.length[col]!) return 0;

  return 1 - behind / state.length[col]!;
}
