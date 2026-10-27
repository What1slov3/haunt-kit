import { graphemes } from '../text-utils';

/*
 * Очередь перекидывания табло — чистые функции. Как у настоящего табло, флажок идёт только вперёд по
 * барабану символов (с переходом через начало) и останавливается на нужном; ячейки стартуют по очереди
 * слева направо. Компонент на каждом кадре спрашивает `flapFrame`, сколько шагов уже сделала ячейка.
 */

/** Барабаны: цифры (счёт), время, код. Первый символ — пустой флажок */
export const FLAP_DIGITS = ' 0123456789';
export const FLAP_TIME = ' 0123456789:';
export const FLAP_ALPHANUMERIC = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-';

/**
 * Символы, через которые флажок пройдёт от `from` до `to`, включая `to`. Пустой массив — менять нечего.
 * Символ вне барабана ставится одним шагом. Больше `maxFlips` шагов не делаем: берутся последние,
 * табло «докручивает» к цели, а не прокручивает весь барабан на длинном наборе.
 */
export function flapPath(from: string, to: string, charset: string, maxFlips = 10): string[] {
  if (from === to) return [];

  const drum = graphemes(charset);
  const target = drum.indexOf(to);

  if (target === -1) return [to];

  const start = Math.max(drum.indexOf(from), 0);
  const path: string[] = [];

  for (let index = (start + 1) % drum.length; ; index = (index + 1) % drum.length) {
    path.push(drum[index]!);

    if (index === target) break;
  }

  return path.slice(-Math.max(1, maxFlips));
}

/** Значение → ячейки табло длины `length` (по умолчанию — по значению): выравнивание пробелами */
export function boardCells(
  value: string,
  length?: number,
  align: 'start' | 'end' = 'end',
): string[] {
  const chars = graphemes(value);

  if (length === undefined || chars.length >= length) return chars.slice(0, length ?? chars.length);

  const padding = Array.from({ length: length - chars.length }, () => ' ');

  return align === 'end' ? [...padding, ...chars] : [...chars, ...padding];
}

export interface FlapCellPlan {
  from: string;
  path: string[];
  /** Начало первого шага от старта табло, мс */
  start: number;
}

export interface FlapPlan {
  cells: FlapCellPlan[];
  flipMs: number;
  /** Когда закончится последняя ячейка, мс */
  duration: number;
}

export interface FlapTiming {
  /** Один переброс флажка, мс */
  flipMs: number;
  /** Задержка старта соседней меняющейся ячейки, мс */
  staggerMs: number;
  maxFlips: number;
}

/**
 * План смены табло. Очередь — только среди меняющихся ячеек: неизменная ячейка не задерживает соседей.
 * Длины выравниваются пробелами справа — табло меняет ширину только целыми ячейками.
 */
export function planFlaps(
  from: readonly string[],
  to: readonly string[],
  charset: string,
  { flipMs, staggerMs, maxFlips }: FlapTiming,
): FlapPlan {
  const length = Math.max(from.length, to.length);
  const cells: FlapCellPlan[] = [];
  let order = 0;
  let duration = 0;

  for (let index = 0; index < length; index++) {
    const current = from[index] ?? ' ';
    const path = flapPath(current, to[index] ?? ' ', charset, maxFlips);
    const start = path.length ? order++ * staggerMs : 0;

    cells.push({ from: current, path, start });
    duration = Math.max(duration, start + path.length * flipMs);
  }

  return { cells, flipMs, duration };
}

/**
 * Какой по счёту переброс идёт у каждой ячейки в момент `elapsed`: 0 — ещё не начала, k — идёт (или
 * последним закончился) k-й. Последний переброс держится до конца плана: его анимация стоит на итоге.
 */
export function flapFrame(plan: FlapPlan, elapsed: number): number[] {
  return plan.cells.map(({ path, start }) =>
    Math.min(path.length, Math.max(0, Math.floor((elapsed - start) / plan.flipMs) + 1)),
  );
}

/** Что показывает ячейка на шаге `step`: символ, с которого перекидывается, и в который */
export function flapCell(
  cell: FlapCellPlan,
  step: number,
): { current: string; next: string | null } {
  if (step === 0) return { current: cell.from, next: null };

  return {
    current: step === 1 ? cell.from : cell.path[step - 2]!,
    next: cell.path[step - 1] ?? null,
  };
}
