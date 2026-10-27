import { useLayoutEffect, type RefObject } from 'react';

import { prefersReducedMotion } from '../fx/environment';

/*
 * Общий индикатор группы (подчёркивание вкладки, подсветка активного канала): при смене активного
 * элемента новый индикатор «переезжает» из места старого. Замена `layoutId` из Motion — без 135 kB
 * библиотеки в каждом экране с вкладками.
 *
 * Как: FLIP. Уходящий индикатор в cleanup запоминает свой прямоугольник (React вызывает layout-cleanup
 * удаляемого компонента до того, как снимет его DOM — элемент ещё на месте). Появившийся сравнивает свой
 * прямоугольник с запомненным и проигрывает обратный путь через Web Animations API: translate + scale из
 * старого места в своё. Только transform — композитор, без перерасчёта раскладки.
 */

interface Snapshot {
  rect: DOMRect;
  at: number;
}

const snapshots = new Map<string, Snapshot>();

/** Снимок старше — уже не «соседний» переход, а остаток от прошлого экрана: из него не анимируем */
const SNAPSHOT_TTL_MS = 600;
const DURATION_MS = 220;
// Та же кривая, что --ease-out в tokens.css: WAAPI не читает CSS-переменные
const EASING = 'cubic-bezier(0.2, 0.7, 0.2, 1)';

/** Обратное преобразование: как сдвинуть и растянуть `next`, чтобы он совпал с `prev` */
export function invertRect(prev: DOMRectReadOnly, next: DOMRectReadOnly): string | null {
  const dx = prev.left - next.left;
  const dy = prev.top - next.top;
  const sx = next.width ? prev.width / next.width : 1;
  const sy = next.height ? prev.height / next.height : 1;

  if (
    Math.abs(dx) < 0.5 &&
    Math.abs(dy) < 0.5 &&
    Math.abs(sx - 1) < 0.01 &&
    Math.abs(sy - 1) < 0.01
  ) {
    return null;
  }

  return `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
}

/**
 * Индикатор группы `group` на элементе `ref`: монтируется у активного пункта, переезжает от прежнего.
 * Без `group` — статичен. Элементу нужен `transform-origin: 0 0` (scale считается от левого верхнего угла).
 */
export function useSharedIndicator(
  group: string | undefined,
  ref: RefObject<HTMLElement | null>,
): void {
  useLayoutEffect(() => {
    const element = ref.current;

    if (!group || !element) return;

    const previous = snapshots.get(group);

    if (
      previous &&
      performance.now() - previous.at < SNAPSHOT_TTL_MS &&
      !prefersReducedMotion() &&
      typeof element.animate === 'function'
    ) {
      const from = invertRect(previous.rect, element.getBoundingClientRect());

      if (from) {
        element.animate([{ transform: from }, { transform: 'none' }], {
          duration: DURATION_MS,
          easing: EASING,
        });
      }
    }

    snapshots.delete(group);

    return () => {
      snapshots.set(group, { rect: element.getBoundingClientRect(), at: performance.now() });
    };
  }, [group, ref]);
}
