import type { Key } from 'react';

/*
 * Математика окна виртуального списка. Строки переменной высоты: высота строки — измеренная (кэш по
 * ключу) или оценка, смещения — префиксные суммы. Всё здесь чистое: компонент передаёт числа, получает
 * индексы и смещения, а DOM трогает сам.
 */

export type ScrollAlign = 'start' | 'center' | 'end' | 'auto';

export interface VisibleRange {
  start: number;
  /** Не включительно */
  end: number;
}

/** Смещение кромки строки: offsets[i] — верх строки i, offsets[count] — высота всего списка */
export function offsetAt(offsets: ArrayLike<number>, index: number): number {
  return offsets[index] ?? 0;
}

/** Префиксные суммы высот. Массив на count + 1 элементов: последний — полная высота */
export function buildOffsets(count: number, sizeOf: (index: number) => number): Float64Array {
  const offsets = new Float64Array(count + 1);

  for (let index = 0; index < count; index += 1) {
    offsets[index + 1] = offsetAt(offsets, index) + sizeOf(index);
  }

  return offsets;
}

/** Строка, в которую попадает смещение: последняя, чей верх не ниже него. Бинарный поиск — O(log n) */
export function indexAtOffset(offsets: ArrayLike<number>, offset: number): number {
  const count = offsets.length - 1;

  if (count <= 0) return 0;

  let low = 0;
  let high = count - 1;

  while (low < high) {
    const middle = (low + high + 1) >> 1;

    if (offsetAt(offsets, middle) <= offset) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }

  return low;
}

/**
 * Какие строки рисовать: видимые в окне [viewTop, viewTop + viewHeight) и `overscan` строк с каждой
 * стороны — запас, чтобы при быстрой прокрутке край не мелькал пустотой.
 */
export function visibleRange(
  offsets: ArrayLike<number>,
  viewTop: number,
  viewHeight: number,
  overscan: number,
): VisibleRange {
  const count = offsets.length - 1;

  if (count <= 0) return { start: 0, end: 0 };

  const first = indexAtOffset(offsets, Math.max(0, viewTop));
  // Нижний край окна — не включительно: строка, начинающаяся ровно на краю, ещё не видна
  const last = indexAtOffset(offsets, Math.max(0, viewTop + viewHeight - 0.5));

  return {
    start: Math.max(0, first - overscan),
    end: Math.min(count, Math.max(first, last) + 1 + overscan),
  };
}

/**
 * Куда прокрутить, чтобы показать строку: `start` — вверху окна, `end` — внизу, `center` — посередине,
 * `auto` — ближайшим краем и только если строка видна не целиком. `null` — прокручивать не нужно.
 * Смещение — относительно начала списка; отступ списка в области прокрутки добавляет вызывающий.
 */
export function scrollTopForIndex(
  offsets: ArrayLike<number>,
  index: number,
  align: ScrollAlign,
  viewHeight: number,
  viewTop: number,
): number | null {
  const count = offsets.length - 1;

  if (count <= 0) return null;

  const clamped = Math.min(Math.max(0, index), count - 1);
  const start = offsetAt(offsets, clamped);
  const end = offsetAt(offsets, clamped + 1);
  let target: number;

  if (align === 'start') {
    target = start;
  } else if (align === 'end') {
    target = end - viewHeight;
  } else if (align === 'center') {
    target = start + (end - start) / 2 - viewHeight / 2;
  } else {
    if (start >= viewTop && end <= viewTop + viewHeight) return null;

    // Строка выше окна или сама длиннее окна — к верху, иначе — к низу
    target = start < viewTop || end - start > viewHeight ? start : end - viewHeight;
  }

  return Math.max(0, target);
}

/**
 * Поправка прокрутки, когда строка изменила высоту после измерения. Строка выше окна сдвигает всё под
 * собой — на ту же разницу сдвигаем прокрутку, и то, что человек читает, остаётся на месте. Строка в окне
 * или ниже — не трогаем: растёт то, что видно, или то, чего ещё не видно.
 */
export function measureCorrection(itemStart: number, delta: number, viewTop: number): number {
  return itemStart < viewTop ? delta : 0;
}

/** Якорь прокрутки: первая видимая строка и насколько её верх ушёл за край окна */
export interface ScrollAnchor {
  key: Key;
  offset: number;
}

export function captureAnchor(
  offsets: ArrayLike<number>,
  viewTop: number,
  keyAt: (index: number) => Key,
): ScrollAnchor | null {
  const count = offsets.length - 1;

  if (count <= 0) return null;

  const index = indexAtOffset(offsets, Math.max(0, viewTop));

  return { key: keyAt(index), offset: viewTop - offsetAt(offsets, index) };
}

/**
 * Прокрутка, при которой якорь стоит там же, где стоял: подгрузили сообщения сверху — строки съехали
 * вниз на высоту подгруженного, и окно едет за ними без прыжка. `null` — якоря больше нет в списке.
 */
export function restoreAnchor(
  anchor: ScrollAnchor,
  offsets: ArrayLike<number>,
  indexOfKey: (key: Key) => number,
): number | null {
  const index = indexOfKey(anchor.key);

  if (index < 0) return null;

  return offsetAt(offsets, index) + anchor.offset;
}

export interface EdgeState {
  /** Окно у края — ближе порога */
  near: boolean;
  /** Сколько строк было, когда смотрели */
  count: number;
}

/**
 * Звать ли подгрузку у края: окно только что подошло к краю или строк стало другое число, а окно всё
 * ещё у края (подгрузили страницу, а её не хватило до порога). Пока список не меняется и окно стоит у
 * края, повторно не зовём — иначе каждое событие прокрутки слало бы новый запрос.
 */
export function shouldReach(previous: EdgeState, next: EdgeState): boolean {
  return next.near && (!previous.near || previous.count !== next.count);
}

export interface ScrollMetrics {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

/** Сколько осталось до нижнего края; дробный scrollTop при масштабе 125 % не доходит до нуля ровно */
export function distanceToEnd(metrics: ScrollMetrics): number {
  return Math.max(0, metrics.scrollHeight - metrics.scrollTop - metrics.clientHeight);
}
