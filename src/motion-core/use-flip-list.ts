import { useLayoutEffect, useRef, type RefObject } from 'react';

import { prefersReducedMotion } from '../fx/environment';

import { flipDelta, relativePoint, type Point } from './flip';
import { spring, springEasing, springPresets } from './spring';

export interface FlipListOptions {
  /** Длительность переезда, мс; по умолчанию — пружина `snappy` */
  duration?: number;
  /** Кривая; по умолчанию — та же пружина как `linear()` */
  easing?: string;
  /** Новые элементы появляются (opacity + лёгкий масштаб); false — просто встают на место */
  enter?: boolean;
}

/** Атрибут элемента списка: значение — стабильный ключ (id), как `key` у React */
export const FLIP_KEY_ATTRIBUTE = 'data-flip-key';

const ENTER_MS = 150;
// Та же кривая, что --ease-out в tokens.css: WAAPI не читает CSS-переменные
const EASE_OUT = 'cubic-bezier(0.2, 0.7, 0.2, 1)';
const ZERO: Point = { x: 0, y: 0 };

/** Сдвиг, который сейчас даёт идущая анимация: translate из вычисленной матрицы transform */
function currentShift(element: Element): Point {
  const transform = getComputedStyle(element).transform;

  if (!transform || transform === 'none' || typeof DOMMatrixReadOnly === 'undefined') return ZERO;

  const matrix = new DOMMatrixReadOnly(transform);

  return { x: matrix.m41, y: matrix.m42 };
}

let defaultCurve: { duration: number; easing: string } | null = null;

function snappyCurve() {
  if (!defaultCurve) {
    const curve = spring(springPresets.snappy);

    defaultCurve = { duration: curve.duration, easing: springEasing(curve) };
  }

  return defaultCurve;
}

/**
 * FLIP для перестановки и добавления элементов списка — обобщение `use-shared-indicator` на много
 * элементов. Элементам контейнера `ref` нужен атрибут `data-flip-key={id}`. После каждого коммита
 * компонента хук сравнивает позиции раскладки с прошлым коммитом и проигрывает обратный путь через
 * WAAPI (только transform). Прерванный переезд продолжается с видимого места; элемент, чьё место не
 * изменилось, свою анимацию не перезапускает. Удаление не анимирует: уход — `Presence` вокруг элемента,
 * соседи переедут, когда он снимется. Вызывать в компоненте, который рендерит список: хук срабатывает
 * на его коммитах. reduced-motion — без анимации, как у FLIP-индикатора.
 */
export function useFlipList(
  ref: RefObject<HTMLElement | null>,
  options: FlipListOptions = {},
): void {
  const positions = useRef<Map<string, Point> | null>(null);
  const running = useRef(new Map<Element, Animation>());
  const { duration, easing, enter = true } = options;

  useLayoutEffect(() => {
    const container = ref.current;

    if (!container) return;

    const items = [...container.querySelectorAll<HTMLElement>(`[${FLIP_KEY_ATTRIBUTE}]`)];
    const base = container.getBoundingClientRect();
    const previous = positions.current;
    const next = new Map<string, Point>();
    const animate =
      previous !== null && !prefersReducedMotion() && typeof container.animate === 'function';
    const stillRunning = new Map<Element, Animation>();

    // Сначала все чтения, потом все записи: один пересчёт раскладки на весь список
    const measured = items.map((item) => {
      const animation = running.current.get(item);
      const shift = animation ? currentShift(item) : ZERO;
      const visual = relativePoint(item.getBoundingClientRect(), base);

      return { item, animation, shift, layout: { x: visual.x - shift.x, y: visual.y - shift.y } };
    });

    for (const { item, animation, shift, layout } of measured) {
      const key = item.getAttribute(FLIP_KEY_ATTRIBUTE) ?? '';
      const before = previous?.get(key);
      const delta = flipDelta(before, layout, shift);
      const moved = before !== undefined && flipDelta(before, layout) !== null;

      next.set(key, layout);

      if (!animate) continue;

      // Место то же — идущая анимация (переезд или появление) доигрывает как есть
      if (!moved && animation) {
        stillRunning.set(item, animation);
        continue;
      }

      // Место сменилось — старая анимация считала путь от прежней раскладки, она больше не верна
      if (moved) animation?.cancel();

      let started: Animation | null = null;

      if (delta) {
        const curve = snappyCurve();

        started = item.animate(
          [{ transform: `translate(${delta.x}px, ${delta.y}px)` }, { transform: 'none' }],
          { duration: duration ?? curve.duration, easing: easing ?? curve.easing },
        );
      } else if (enter && before === undefined) {
        started = item.animate(
          [
            { opacity: 0, transform: 'scale(0.98)' },
            { opacity: 1, transform: 'none' },
          ],
          { duration: ENTER_MS, easing: EASE_OUT },
        );
      }

      if (!started) continue;

      const current = started;

      stillRunning.set(item, current);
      current.onfinish = () => {
        if (running.current.get(item) === current) running.current.delete(item);
      };
    }

    running.current = stillRunning;
    positions.current = next;
  });
}
