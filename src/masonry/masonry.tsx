import {
  Children,
  isValidElement,
  useLayoutEffect,
  useRef,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
} from 'react';

import { cx } from '../lib/cx';
import { spaceVar, type Space } from '../lib/space';

import styles from './masonry.module.css';
import { masonryColumns, masonryLayout } from './masonry-layout';

export interface MasonryProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** Плитки — любые элементы; высота у каждой своя (картинка, текст разной длины) */
  children: ReactNode;
  /** Минимальная ширина колонки, px: колонок столько, сколько влезет */
  minColumnWidth?: number;
  /** Ровно столько колонок — вместо подсчёта по ширине */
  columns?: number;
  gap?: Space;
}

/**
 * Галерея плиток разной высоты без дыр: каждая плитка встаёт в самую короткую колонку
 * (`masonry-layout.ts`). Высоты плиток меряются после того, как задана ширина колонки, и пересчитываются,
 * когда меняется контейнер или плитка (догрузилась картинка). Порядок в разметке — порядок чтения. До
 * первого расчёта и без JavaScript — обычная сетка той же ширины колонок.
 */
export function Masonry({
  children,
  minColumnWidth = 220,
  columns,
  gap = 3,
  className,
  style,
  ...rest
}: MasonryProps) {
  const root = useRef<HTMLDivElement>(null);
  const items = Children.toArray(children);
  const count = items.length;

  useLayoutEffect(() => {
    const container = root.current;

    if (!container || typeof ResizeObserver === 'undefined') return;

    let frame = 0;

    const layout = () => {
      frame = 0;

      const tiles = [...container.children] as HTMLElement[];
      const space = parseFloat(getComputedStyle(container).columnGap) || 0;
      const width = container.clientWidth;
      const columnCount = columns ?? masonryColumns(width, minColumnWidth, space);
      const columnWidth = (width - space * (columnCount - 1)) / columnCount;

      // Сначала ширина всем, потом чтение высот — один пересчёт раскладки, а не по одному на плитку
      for (const tile of tiles) tile.style.width = `${columnWidth}px`;

      const result = masonryLayout(
        tiles.map((tile) => tile.offsetHeight),
        columnCount,
        columnWidth,
        space,
      );

      tiles.forEach((tile, index) => {
        const { x, y } = result.positions[index]!;

        tile.style.transform = `translate(${x}px, ${y}px)`;
      });
      container.style.height = `${result.height}px`;

      if (container.dataset.ready === undefined) {
        container.dataset.ready = '';
        // Плитки едут к новым местам только после первой расстановки: при появлении — сразу на месте
        requestAnimationFrame(() => {
          container.dataset.settled = '';
        });
      }
    };

    const schedule = () => {
      frame ||= requestAnimationFrame(layout);
    };

    const observer = new ResizeObserver(schedule);

    observer.observe(container);

    for (const tile of container.children) observer.observe(tile);

    layout();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [count, columns, minColumnWidth]);

  return (
    <div
      ref={root}
      className={cx(styles.root, className)}
      style={
        {
          '--masonry-gap': spaceVar(gap),
          '--masonry-min': `${minColumnWidth}px`,
          ...style,
        } as CSSProperties
      }
      {...rest}
    >
      {items.map((item, index) => (
        <div key={isValidElement(item) ? item.key : index} className={styles.tile}>
          {item}
        </div>
      ))}
    </div>
  );
}
