import { useLayoutEffect, useRef } from 'react';

import { Box, type BoxProps } from '../box/box';
import { cx } from '../lib/cx';
import { spaceVar, type Space } from '../lib/space';
import { assignRef } from '../lib/assign-ref';

import styles from './sticky.module.css';

export interface StickyProps extends BoxProps {
  /** К какому краю прокрутки прилипать */
  edge?: 'top' | 'bottom';
  /** Отступ от края, на котором элемент останавливается */
  offset?: Space;
  /** Прилипший — на стекле, с тенью и кромкой: видно, что под ним уезжает содержимое. По умолчанию да */
  elevate?: boolean;
  onStuckChange?: (stuck: boolean) => void;
}

/** Ближайший предок с прокруткой: относительно него элемент и прилипает */
function scrollParent(node: HTMLElement): HTMLElement | null {
  for (let element = node.parentElement; element; element = element.parentElement) {
    if (/auto|scroll|overlay/.test(getComputedStyle(element).overflowY)) return element;
  }

  return null;
}

/**
 * Прилипает к краю прокрутки — шапка, полоса «сохранить», вкладки. Прилип ли он, CSS не сообщает,
 * поэтому за элементом следит IntersectionObserver: граница корня сдвинута на отступ плюс 1 px, и
 * прилипший элемент всегда чуть «срезан» ею. Состояние — атрибутом `data-stuck` (без перерисовки React) и
 * в `onStuckChange`.
 */
export function Sticky({
  edge = 'top',
  offset = 0,
  elevate = true,
  onStuckChange,
  className,
  style,
  ref,
  ...rest
}: StickyProps) {
  const element = useRef<HTMLDivElement | null>(null);
  const onChange = useRef(onStuckChange);

  useLayoutEffect(() => {
    onChange.current = onStuckChange;
  });

  useLayoutEffect(() => {
    const node = element.current;

    if (!node || typeof IntersectionObserver === 'undefined') return;

    const inset = parseFloat(getComputedStyle(node)[edge]) || 0;
    let stuck = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;

        const rect = entry.boundingClientRect;
        const root = entry.rootBounds;
        // Срезан, но виден — и срезан своим краем, а не потому что уезжает за противоположный
        const atEdge =
          edge === 'top'
            ? rect.top - (root?.top ?? 0) <= inset + 1
            : (root?.bottom ?? window.innerHeight) - rect.bottom <= inset + 1;
        const next = entry.isIntersecting && entry.intersectionRatio < 1 && atEdge;

        if (next === stuck) return;

        stuck = next;

        if (next) node.dataset.stuck = '';
        else delete node.dataset.stuck;

        onChange.current?.(next);
      },
      {
        root: scrollParent(node),
        threshold: [0, 1],
        rootMargin: edge === 'top' ? `-${inset + 1}px 0px 0px 0px` : `0px 0px -${inset + 1}px 0px`,
      },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [edge, offset]);

  return (
    <Box
      ref={(node: HTMLDivElement | null) => {
        element.current = node;
        assignRef(ref, node);
      }}
      className={cx(styles.sticky, className)}
      data-edge={edge}
      data-elevate={elevate || undefined}
      style={{ [edge]: spaceVar(offset), ...style }}
      {...rest}
    />
  );
}
