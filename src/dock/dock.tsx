import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

import { isMotionAllowed } from '../fx/environment';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';
import { Tooltip } from '../tooltip/tooltip';

import { dockGrowth, dockLayout, type DockMagnification } from './dock-math';
import styles from './dock.module.css';

export interface DockItem {
  id: string;
  /** Название — подсказка и aria-label */
  label: string;
  /** Аватар пространства или иконка; заполняет плитку */
  icon: ReactNode;
  /** Открытое пространство: точка под плиткой и aria-pressed */
  active?: boolean;
  /** Непрочитанное: число — счётчик в углу */
  unread?: boolean | number;
}

export interface DockProps extends Omit<ComponentPropsWithRef<'div'>, 'onSelect'> {
  items: readonly DockItem[];
  onSelect?: (id: string) => void;
  /** horizontal — док внизу, плитки растут вверх; vertical — сбоку, растут вправо */
  orientation?: 'horizontal' | 'vertical';
  /** Размер плитки в покое, px */
  size?: number;
  /** Масштаб плитки под курсором */
  magnification?: number;
  /** Насколько далеко от курсора (px) ещё увеличиваются соседи */
  range?: number;
  /** Подпись панели для скринридера */
  label?: string;
}

/**
 * Док быстрых пространств: плитки у курсора увеличиваются, соседи раздвигаются (`dock-math.ts`). Только
 * transform: масштаб и сдвиг пишутся CSS-переменными в rAF, без ре-рендера на каждое движение мыши. При
 * `data-effects="off"` и reduced-motion — без увеличения. Клавиатура — как у панели инструментов:
 * стрелки, Home / End.
 */
export function Dock({
  items,
  onSelect,
  orientation = 'horizontal',
  size = 40,
  magnification = 1.6,
  range = 120,
  label,
  className,
  style,
  onPointerMove,
  onPointerLeave,
  ...rest
}: DockProps) {
  const strings = useUiStrings().dock;
  const rootRef = useRef<HTMLDivElement>(null);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const frame = useRef(0);
  const [focusIndex, setFocusIndex] = useState(0);
  const horizontal = orientation === 'horizontal';
  const options: DockMagnification = { size, max: magnification, range };
  const tabStop = Math.min(focusIndex, Math.max(0, items.length - 1));

  const apply = (pointer: number | null) => {
    const elements = buttons.current.slice(0, items.length);
    // offset* — раскладка без transform: центры в покое, даже пока плитки увеличены
    const centers = elements.map((element) =>
      element
        ? horizontal
          ? element.offsetLeft + element.offsetWidth / 2
          : element.offsetTop + element.offsetHeight / 2
        : 0,
    );

    const layout = dockLayout(centers, pointer, options);
    const growth = dockGrowth(layout, size);

    layout.forEach(({ scale, offset }, index) => {
      const element = elements[index];

      element?.style.setProperty('--dock-scale', String(scale));
      element?.style.setProperty('--dock-offset', `${offset}px`);
    });
    rootRef.current?.style.setProperty('--dock-grow-start', `${growth.start}px`);
    rootRef.current?.style.setProperty('--dock-grow-end', `${growth.end}px`);
  };

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    onPointerMove?.(event);

    const root = rootRef.current;

    if (!root || event.pointerType === 'touch' || !isMotionAllowed(root)) return;

    const box = root.getBoundingClientRect();
    // Курсор в координатах offsetParent плиток — самого дока
    const pointer = horizontal
      ? event.clientX - box.left - root.clientLeft
      : event.clientY - box.top - root.clientTop;

    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => apply(pointer));
  };

  const handlePointerLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    onPointerLeave?.(event);
    cancelAnimationFrame(frame.current);
    apply(null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    let index: number | null = null;

    if (next !== undefined) index = (tabStop + next + items.length) % items.length;
    else if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = items.length - 1;

    if (index === null || items.length === 0) return;

    event.preventDefault();
    setFocusIndex(index);
    buttons.current[index]?.focus();
  };

  return (
    <div
      ref={rootRef}
      role="toolbar"
      aria-label={label ?? strings.label}
      aria-orientation={orientation}
      className={cx(styles.root, styles[orientation], className)}
      style={{ ...style, '--dock-size': `${size}px` } as CSSProperties}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onKeyDown={onKeyDown}
      {...rest}
    >
      {items.map((item, index) => {
        const count = typeof item.unread === 'number' && item.unread > 0 ? item.unread : null;

        return (
          <Tooltip key={item.id} content={item.label} side={horizontal ? 'top' : 'right'}>
            <button
              ref={(node) => {
                buttons.current[index] = node;
              }}
              type="button"
              aria-label={count !== null ? `${item.label}, ${strings.unread(count)}` : item.label}
              aria-pressed={item.active ?? undefined}
              tabIndex={index === tabStop ? 0 : -1}
              data-active={item.active || undefined}
              data-unread={item.unread ? '' : undefined}
              className={styles.item}
              onFocus={() => setFocusIndex(index)}
              onClick={() => onSelect?.(item.id)}
            >
              <span className={styles.plate}>{item.icon}</span>

              {count !== null && (
                <span className={styles.count} aria-hidden>
                  {count > 99 ? '99+' : count}
                </span>
              )}

              <span className={styles.indicator} aria-hidden />
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
