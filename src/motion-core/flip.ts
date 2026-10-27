/*
 * Расчёт FLIP для списков — чистые функции. Позиции — относительно контейнера списка: прокрутка
 * страницы и сдвиг самого контейнера не должны «двигать» элементы.
 */

export interface Point {
  x: number;
  y: number;
}

/** Сдвиг меньше полпикселя глазу не виден — анимацию не запускаем */
const MIN_SHIFT = 0.5;

export function relativePoint(
  rect: { left: number; top: number },
  base: { left: number; top: number },
): Point {
  return { x: rect.left - base.left, y: rect.top - base.top };
}

/**
 * Откуда элемент должен «приехать» в новое место: прежняя позиция раскладки плюс сдвиг, на котором
 * его застала прерванная анимация (видимое место сейчас), минус новая позиция. null — не сдвинулся или
 * новый элемент.
 *
 * @param previous позиция раскладки на прошлом коммите (без transform)
 * @param next позиция раскладки сейчас
 * @param running сдвиг от ещё идущей FLIP-анимации (видимое место − раскладка), иначе 0
 */
export function flipDelta(
  previous: Point | undefined,
  next: Point,
  running: Point = { x: 0, y: 0 },
): Point | null {
  if (!previous) return null;

  const x = previous.x + running.x - next.x;
  const y = previous.y + running.y - next.y;

  if (Math.abs(x) < MIN_SHIFT && Math.abs(y) < MIN_SHIFT) return null;

  return { x, y };
}
