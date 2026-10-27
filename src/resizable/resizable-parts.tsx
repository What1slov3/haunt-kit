import {
  Children,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import { cx } from '../lib/cx';
import { assignRef } from '../lib/assign-ref';

import { ResizableContext, ResizableIndexContext } from './resizable-context';
import {
  collapsibleNeighbour,
  handleBounds,
  isCollapsed,
  isPixelSize,
  normalizePanels,
  pixelPanels,
  pixelsToPercent,
  rememberExpanded,
  rescaleSizes,
  resizeAt,
  resizeByKey,
  resizeTo,
  resolveSizes,
  serializeLayout,
  toggleCollapse,
  type PanelSize,
  type PanelSpec,
  type ResizeDirection,
} from './resizable-math';
import { readLayout, writeLayout } from './resizable-storage';
import styles from './resizable.module.css';

export interface ResizableRootProps extends Omit<ComponentPropsWithRef<'div'>, 'onResize'> {
  /** horizontal — панели рядом (ширина), vertical — друг под другом (высота) */
  direction?: ResizeDirection;
  /** Новые размеры в %, на каждом шаге перетаскивания и клавиатуры */
  onResize?: (sizes: number[]) => void;
  /**
   * Жест закончен (отпустили ручку, клавиша, сворачивание): размеры в % и раскладка в единицах панелей
   * (пиксельные — в px) — её можно сохранить и вернуть в `defaultSize`
   */
  onResizeEnd?: (sizes: number[], layout: PanelSize[]) => void;
  /** Ключ для localStorage: раскладка сохраняется по окончании жеста и возвращается при монтировании */
  autoSaveId?: string;
  /** Шаг стрелок, % */
  step?: number;
}

interface Layout {
  count: number;
  /** Место под панели (px), при котором посчитаны `sizes`; 0 — ещё не измерено */
  available: number;
  sizes: number[];
  expanded: (number | undefined)[];
  /** Раскладка из localStorage — подменяет `defaultSize` до первого измерения */
  saved: PanelSize[] | null;
}

const pixelsOf = (size: PanelSize | undefined) =>
  isPixelSize(size) ? Number.parseFloat(size) || 0 : 0;

/** Место под панели — сумма самих панелей вдоль оси: ручки занимают свои пиксели */
function measureAvailable(root: HTMLElement, horizontal: boolean): number {
  return [...root.children]
    .filter((el) => el.hasAttribute('data-resizable-panel'))
    .reduce((total, el) => {
      const rect = el.getBoundingClientRect();

      return total + (horizontal ? rect.width : rect.height);
    }, 0);
}

/**
 * Ограничения панелей Root читает прямо из пропсов детей: так размеры известны до первого рендера, без
 * регистрации панелей эффектами и мигания раскладки. Поэтому Panel и Handle — прямые дети Root.
 */
export function ResizableRoot({
  direction = 'horizontal',
  onResize,
  onResizeEnd,
  autoSaveId,
  step = 5,
  className,
  children,
  ref,
  ...rest
}: ResizableRootProps) {
  const baseId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const horizontal = direction === 'horizontal';
  const items = Children.toArray(children);
  const specs: PanelSpec[] = [];
  const panelIds: string[] = [];

  for (const child of items) {
    if (!isValidElement<ResizablePanelProps>(child) || child.type !== ResizablePanel) continue;

    const { defaultSize, minSize, maxSize, collapsible, collapsedSize, id } = child.props;

    specs.push({ defaultSize, minSize, maxSize, collapsible, collapsedSize });
    panelIds.push(id ?? `${baseId}-panel-${panelIds.length}`);
  }

  const [available, setAvailable] = useState(0);
  const [layout, setLayout] = useState<Layout>(() => {
    const saved = autoSaveId ? readLayout(autoSaveId, specs.length) : null;

    return {
      count: specs.length,
      available: 0,
      sizes: resolveSizes(normalizePanels(specs, 0, saved)),
      expanded: [],
      saved,
    };
  });
  const [dragging, setDragging] = useState(false);
  const panels = normalizePanels(specs, available);
  const pixel = pixelPanels(specs);
  let sizes = layout.sizes;

  // Число панелей сменилось — прежние размеры не к чему приложить, раскладка начинается заново
  if (layout.count !== specs.length) {
    sizes = resolveSizes(panels);
    setLayout({ count: specs.length, available, sizes, expanded: [], saved: null });
  } else if (layout.available !== available) {
    // Первое измерение переводит пиксели в проценты; дальше смена контейнера сохраняет пиксельные панели
    const previous = normalizePanels(specs, layout.available);

    sizes =
      layout.available > 0
        ? rescaleSizes(
            layout.sizes,
            panels,
            pixel,
            layout.sizes.map((size, i) => isCollapsed(size, previous[i])),
            layout.available,
            available,
          )
        : resolveSizes(normalizePanels(specs, available, layout.saved));
    setLayout({ ...layout, available, sizes });
  }

  // До отрисовки: иначе первый кадр показал бы пиксельные панели по долям, а не в их px
  useLayoutEffect(() => {
    const root = rootRef.current;

    if (!root) return;

    const measure = () => {
      const next = measureAvailable(root, horizontal);

      // Скрытый контейнер (display: none) меряется нулём — это не повод забыть раскладку
      if (next > 0) setAvailable((prev) => (Math.abs(prev - next) < 0.5 ? prev : next));
    };

    measure();

    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(measure);

    observer.observe(root);

    return () => observer.disconnect();
  }, [horizontal]);

  const collapsed = sizes.map((size, i) => isCollapsed(size, panels[i]));
  // Свёрнутая до px панель держит свои пиксели так же, как пиксельная
  const renderPixel = specs.map((spec, i) =>
    collapsed[i] ? isPixelSize(spec.collapsedSize) : pixel[i]!,
  );

  if (renderPixel.length && renderPixel.every(Boolean)) renderPixel[renderPixel.length - 1] = false;

  const flexTotal = sizes.reduce((total, size, i) => (renderPixel[i] ? total : total + size), 0);
  /*
   * Пиксельные панели — основой в px, гибкие — долей от остатка. Тянут окно — CSS сразу отдаёт прибавку
   * гибким, и сайдбар не дёргается на кадр до того, как ResizeObserver пересчитает проценты.
   */
  const flex = sizes.map((size, i) => {
    if (!renderPixel[i]) return `${flexTotal > 0 ? (size / flexTotal) * 100 : 0} 1 0px`;

    const fallback = collapsed[i]
      ? specs[i]!.collapsedSize
      : (layout.saved?.[i] ?? specs[i]!.defaultSize);
    const pixels = available > 0 ? (size * available) / 100 : pixelsOf(fallback);

    return `0 1 ${pixels}px`;
  });

  const resize = (next: readonly number[], base: readonly number[]) => {
    setLayout((prev) => ({
      ...prev,
      sizes: [...next],
      expanded: rememberExpanded(prev.expanded, base, next, panels),
    }));
    onResize?.([...next]);
  };

  const commit = (next: readonly number[]) => {
    const saved = serializeLayout(next, pixel, available);

    if (autoSaveId) writeLayout(autoSaveId, saved);

    onResizeEnd?.([...next], saved);
  };

  let panelIndex = -1;

  return (
    <ResizableContext.Provider
      value={{
        direction,
        sizes,
        panels,
        panelIds,
        flex,
        collapsed,
        initialSizes: resolveSizes(panels),
        expanded: layout.expanded,
        step,
        resize,
        commit,
        setDragging,
      }}
    >
      <div
        ref={(node) => {
          rootRef.current = node;
          assignRef(ref, node);
        }}
        className={cx(styles.root, styles[direction], className)}
        data-direction={direction}
        data-dragging={dragging || undefined}
        {...rest}
      >
        {items.map((child) => {
          if (isValidElement(child) && child.type === ResizablePanel) panelIndex += 1;

          return (
            <ResizableIndexContext.Provider
              key={isValidElement(child) ? child.key : undefined}
              value={panelIndex}
            >
              {child}
            </ResizableIndexContext.Provider>
          );
        })}
      </div>
    </ResizableContext.Provider>
  );
}

function useResizable(part: string) {
  const context = useContext(ResizableContext);

  if (!context) throw new Error(`Resizable.${part} должен быть прямым ребёнком Resizable.Root`);

  return { ...context, index: useContext(ResizableIndexContext) };
}

export interface ResizablePanelProps extends ComponentPropsWithRef<'div'> {
  /**
   * Начальный размер: число или `'30%'` — проценты, `'240px'` — пиксели (панель держит их при смене размера
   * окна, остальное забирают гибкие панели). Без него панели делят остаток поровну
   */
  defaultSize?: PanelSize;
  /** Минимум, % или px */
  minSize?: PanelSize;
  /** Максимум, % или px */
  maxSize?: PanelSize;
  /** Сворачивается: перетаскиванием за половину пути от минимума, двойным кликом или Enter на ручке */
  collapsible?: boolean;
  /** Размер свёрнутой, % или px; 0 по умолчанию — тогда содержимое становится inert */
  collapsedSize?: PanelSize;
}

export function ResizablePanel({
  defaultSize: _defaultSize,
  minSize: _minSize,
  maxSize: _maxSize,
  collapsible: _collapsible,
  collapsedSize,
  id,
  className,
  style,
  ...rest
}: ResizablePanelProps) {
  const { flex, collapsed, panelIds, index } = useResizable('Panel');
  const isFolded = collapsed[index] === true;

  return (
    <div
      id={id ?? panelIds[index]}
      data-resizable-panel=""
      data-collapsed={isFolded || undefined}
      // Свёрнутая в ноль панель невидима — её кнопки не должны ловить Tab
      inert={isFolded && !Number.parseFloat(String(collapsedSize ?? 0))}
      className={cx(styles.panel, className)}
      style={{ flex: flex[index], ...style }}
      {...rest}
    />
  );
}

export type ResizableHandleProps = ComponentPropsWithRef<'div'>;

export function ResizableHandle({
  className,
  onPointerDown,
  onKeyDown,
  onDoubleClick,
  ...rest
}: ResizableHandleProps) {
  const {
    direction,
    sizes,
    panels,
    panelIds,
    collapsed,
    initialSizes,
    expanded,
    step,
    resize,
    commit,
    setDragging,
    index,
  } = useResizable('Handle');
  const [active, setActive] = useState(false);
  const stopDrag = useRef<(() => void) | null>(null);
  const bounds = handleBounds(sizes, panels, index);
  const horizontal = direction === 'horizontal';
  const foldable = collapsibleNeighbour(panels, index);

  // Ручку убрали посреди перетаскивания — слушатели окна не должны пережить её
  useEffect(() => () => stopDrag.current?.(), []);

  const apply = (next: number[]) => {
    resize(next, sizes);
    commit(next);
  };

  const toggle = () => {
    const next = toggleCollapse(sizes, panels, index, expanded[foldable] ?? initialSizes[foldable]);

    if (next) apply(next);

    return next !== null;
  };

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    onPointerDown?.(event);

    if (event.defaultPrevented || event.button !== 0) return;

    // Без этого браузер начнёт выделять текст панелей и перетаскивать картинки
    event.preventDefault();

    const root = event.currentTarget.parentElement;
    const available = root ? measureAvailable(root, horizontal) : 0;
    const origin = horizontal ? event.clientX : event.clientY;
    const startSizes = sizes;
    let latest = sizes;

    // Слушатели на окне, а не захват указателя: курсор может уйти за ручку и за окно браузера
    const move = (moveEvent: PointerEvent) => {
      const position = horizontal ? moveEvent.clientX : moveEvent.clientY;

      latest = resizeAt(startSizes, panels, index, pixelsToPercent(position - origin, available));
      resize(latest, startSizes);
    };

    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      stopDrag.current = null;
      setActive(false);
      setDragging(false);

      if (latest !== startSizes) commit(latest);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    stopDrag.current = stop;
    setActive(true);
    setDragging(true);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);

    if (event.defaultPrevented) return;

    if (event.key === 'Enter') {
      if (toggle()) event.preventDefault();

      return;
    }

    const next = resizeByKey(sizes, panels, index, event.key, direction, step);

    if (!next) return;

    event.preventDefault();
    apply(next);
  };

  return (
    <div
      role="separator"
      tabIndex={0}
      // Ручка между колонками — вертикальная черта, между строками — горизонтальная
      aria-orientation={horizontal ? 'vertical' : 'horizontal'}
      aria-controls={panelIds[foldable >= 0 ? foldable : index]}
      aria-valuenow={Math.round(sizes[index] ?? 0)}
      aria-valuemin={Math.round(bounds.min)}
      aria-valuemax={Math.round(bounds.max)}
      data-dragging={active || undefined}
      data-collapsed={(foldable >= 0 && collapsed[foldable]) || undefined}
      className={cx(styles.handle, className)}
      onPointerDown={startDrag}
      onKeyDown={handleKeyDown}
      onDoubleClick={(event) => {
        onDoubleClick?.(event);

        // Сворачиваемая соседка — свернуть / развернуть, иначе — сброс к defaultSize
        if (!event.defaultPrevented && !toggle())
          apply(resizeTo(sizes, panels, index, initialSizes[index] ?? 0));
      }}
      {...rest}
    />
  );
}

// Имена как в объекте-фасаде: так их показывают React DevTools и «Show code» в Storybook
ResizableRoot.displayName = 'Resizable.Root';
ResizablePanel.displayName = 'Resizable.Panel';
ResizableHandle.displayName = 'Resizable.Handle';
