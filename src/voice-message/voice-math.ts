/*
 * Чистая логика голосового: пики волны из сэмплов, подгонка готовых пиков под число столбцов, время и
 * перемотка с клавиатуры. Без Web Audio и DOM — тестируется на массивах.
 */

/** Пики к [0, 1] по максимуму: тихая запись тоже рисуется полной волной, а не полоской у дна */
export function normalizePeaks(peaks: readonly number[]): number[] {
  // NaN от сервера не должен отравить максимум: Math.max(x, NaN) — NaN, и вся волна обнулилась бы
  const max = peaks.reduce(
    (top, value) => (Number.isFinite(value) ? Math.max(top, Math.abs(value)) : top),
    0,
  );

  return peaks.map((value) => (max > 0 && Number.isFinite(value) ? Math.abs(value) / max : 0));
}

/**
 * Сэмплы каналов → `bars` столбцов: среднее модуля амплитуды по отрезку и по всем каналам, затем нормировка.
 * Среднее, а не максимум: одиночный щелчок не превращает столбец в пик, волна похожа на громкость речи.
 */
export function computePeaks(channels: readonly ArrayLike<number>[], bars: number): number[] {
  const count = Math.max(0, Math.floor(bars));
  const length = channels.length ? Math.min(...channels.map((channel) => channel.length)) : 0;

  if (count === 0) return [];
  if (length === 0) return new Array<number>(count).fill(0);

  const peaks: number[] = [];

  for (let bar = 0; bar < count; bar++) {
    const start = Math.floor((bar * length) / count);
    const end = Math.max(start + 1, Math.floor(((bar + 1) * length) / count));
    let sum = 0;

    for (const channel of channels) {
      for (let i = start; i < end && i < length; i++) sum += Math.abs(channel[i]!);
    }

    peaks.push(sum / ((end - start) * channels.length));
  }

  return normalizePeaks(peaks);
}

/**
 * Готовые пики (от сервера, любой длины) → `bars` столбцов: при сжатии — среднее по отрезку, при растяжении —
 * линейная интерполяция, чтобы короткий массив не превращался в ступеньки.
 */
export function resamplePeaks(peaks: readonly number[], bars: number): number[] {
  const count = Math.max(0, Math.floor(bars));

  if (count === 0) return [];
  if (peaks.length === 0) return new Array<number>(count).fill(0);
  if (peaks.length === count) return normalizePeaks(peaks);

  if (peaks.length > count) return computePeaks([peaks], count);

  const result: number[] = [];

  for (let bar = 0; bar < count; bar++) {
    const position = count === 1 ? 0 : (bar * (peaks.length - 1)) / (count - 1);
    const left = Math.floor(position);
    const right = Math.min(left + 1, peaks.length - 1);
    const t = position - left;

    result.push(peaks[left]! * (1 - t) + peaks[right]! * t);
  }

  return normalizePeaks(result);
}

/** `m:ss`, от часа — `h:mm:ss`; не число и бесконечность (длина ещё неизвестна) — `0:00` */
export function formatTime(seconds: number): string {
  const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');

  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** Шаги перемотки: стрелки — 5 с, PageUp / PageDown — 15 с */
const ARROW_STEP = 5;
const PAGE_STEP = 15;

/** Новое время по клавише slider-семантики; `null` — клавиша не наша */
export function seekByKey(key: string, current: number, duration: number): number | null {
  const clamp = (value: number) => Math.min(Math.max(value, 0), Math.max(duration, 0));

  switch (key) {
    case 'ArrowLeft':
    case 'ArrowDown':
      return clamp(current - ARROW_STEP);
    case 'ArrowRight':
    case 'ArrowUp':
      return clamp(current + ARROW_STEP);
    case 'PageDown':
      return clamp(current - PAGE_STEP);
    case 'PageUp':
      return clamp(current + PAGE_STEP);
    case 'Home':
      return 0;
    case 'End':
      return clamp(duration);
    default:
      return null;
  }
}

/** Доля дорожки под курсором, [0, 1] */
export function ratioAt(clientX: number, left: number, width: number): number {
  if (width <= 0) return 0;

  return Math.min(Math.max((clientX - left) / width, 0), 1);
}

export const PLAYBACK_RATES = [1, 1.5, 2] as const;

export function nextRate(rate: number): number {
  const index = PLAYBACK_RATES.indexOf(rate as (typeof PLAYBACK_RATES)[number]);

  return PLAYBACK_RATES[(index + 1) % PLAYBACK_RATES.length]!;
}
