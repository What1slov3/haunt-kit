import {
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
} from 'react';

import { cx } from '../../../lib/cx';
import { schedule } from '../../scheduler';
import { useFxEnvironment } from '../../use-fx-environment';

import { dissolveLevel, dissolveTile, type DissolveOrder } from './dissolve-mask';
import styles from './pixel-dissolve.module.css';

export interface PixelDissolveProps extends ComponentPropsWithRef<'div'> {
  /** Виден ли элемент: смена запускает появление или растворение */
  visible: boolean;
  /** Длительность, мс */
  duration?: number;
  /** Клетка маски, CSS px */
  cell?: number;
  /** Матрица Байера: 4 — 16 ступеней, крупный узор; 8 — 64 ступени, плавнее */
  order?: DissolveOrder;
  /** Появиться пикселями и при монтировании */
  appear?: boolean;
  /** Переход закончен: `visible` — каким стал элемент */
  onComplete?: (visible: boolean) => void;
}

/**
 * Появление и растворение элемента пикселями по Байеру. Маска — повторяющаяся SVG-плитка
 * (`dissolve-mask.ts`), кадр меняет её только на новой ступени. Растворённый элемент остаётся в
 * раскладке с `visibility: hidden` — уходит из дерева доступности и порядка фокуса; размонтировать —
 * в `onComplete` или через `Presence`. `data-effects="off"` и reduced-motion — смена мгновенная.
 */
export function PixelDissolve({
  visible,
  duration = 420,
  cell = 6,
  order = 4,
  appear = true,
  onComplete,
  className,
  style,
  children,
  ...rest
}: PixelDissolveProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { motion } = useFxEnvironment(rootRef);
  const [hidden, setHidden] = useState(!visible);
  // Текущая ступень: прерванный переход идёт обратно с того же места, а не с начала
  const progressRef = useRef(visible && appear ? 0 : visible ? 1 : 0);
  const completeRef = useRef(onComplete);

  useLayoutEffect(() => {
    completeRef.current = onComplete;
  });

  useLayoutEffect(() => {
    const root = rootRef.current;

    if (!root) return;

    const target = visible ? 1 : 0;

    const clearMask = () => {
      root.style.removeProperty('mask-image');
      root.style.removeProperty('-webkit-mask-image');
      delete root.dataset.dissolving;
    };

    if (!motion || progressRef.current === target) {
      progressRef.current = target;
      clearMask();
      setHidden(!visible);

      return;
    }

    let level = -1;
    let startedAt = 0;
    const from = progressRef.current;
    const span = Math.abs(target - from) * duration;

    const paint = (progress: number) => {
      const next = dissolveLevel(progress, order);

      if (next === level) return;

      level = next;
      root.style.setProperty('mask-image', dissolveTile(next, order, cell));
      root.style.setProperty('-webkit-mask-image', dissolveTile(next, order, cell));
    };

    root.dataset.dissolving = '';
    setHidden(false);
    paint(from);

    const handle = schedule(
      {
        frame: (now) => {
          startedAt ||= now;

          const t = span ? Math.min(1, (now - startedAt) / span) : 1;
          const progress = from + (target - from) * t;

          progressRef.current = progress;
          paint(progress);

          if (t < 1) return;

          handle.cancel();
          clearMask();
          setHidden(!visible);
          completeRef.current?.(visible);
        },
      },
      { element: root },
    );

    return () => {
      handle.cancel();
    };
  }, [visible, motion, duration, cell, order]);

  return (
    <div
      ref={rootRef}
      className={cx(styles.root, className)}
      data-hidden={hidden ? '' : undefined}
      style={{ '--dissolve-tile': `${order * cell}px`, ...style } as CSSProperties}
      {...rest}
    >
      {children}
    </div>
  );
}
