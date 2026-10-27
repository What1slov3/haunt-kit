import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import { Maximize2, Minus, X } from 'lucide-react';
import { VisuallyHidden } from 'radix-ui';

import { Icon } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';
import { usePortalContainer } from '../theme/portal-container';

import {
  clampPoint,
  clampSize,
  cornerPlacement,
  moveByKey,
  resizeFromCorner,
  resolvePlacement,
  snapPlacement,
  type Placement,
  type Point,
  type Rect,
  type ResizeCorner,
  type Size,
} from './floating-geometry';
import styles from './floating-panel.module.css';
import { readFloatingState, writeFloatingState, type FloatingState } from './floating-storage';

export interface FloatingPanelProps extends Omit<ComponentPropsWithRef<'section'>, 'title'> {
  /** Заголовок в шапке — за неё панель и перетаскивают */
  title: ReactNode;
  /** Подпись для скринридера, если `title` не строка */
  label?: string;
  /** Угол, в котором панель появляется впервые */
  defaultCorner?: ResizeCorner;
  defaultSize?: Size;
  minSize?: Size;
  maxSize?: Size;
  /** Тянется за углы; по умолчанию да */
  resizable?: boolean;
  /** Свёрнута до пилюли */
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Крестик в шапке и в пилюле */
  onClose?: () => void;
  /** Кнопки в шапке перед «свернуть» */
  actions?: ReactNode;
  /** Что видно в пилюле; по умолчанию — заголовок */
  pill?: ReactNode;
  /** Ключ localStorage: место, размер и свёрнутость переживают перезагрузку */
  autoSaveId?: string;
  /** Отступ от края окна, px */
  margin?: number;
  /**
   * Ближе этого к краю (px) — прилипает к нему, у двух краёв — к углу. 72 — край ловит панель с броска,
   * не прицеливаясь
   */
  snapThreshold?: number;
}

type Gesture =
  | { kind: 'move'; pointerId: number; origin: Point; start: Point }
  | { kind: 'resize'; pointerId: number; origin: Point; start: Rect; corner: ResizeCorner };

const CORNERS: readonly ResizeCorner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

/** Шаг стрелок; с Shift — вчетверо */
const KEY_STEP = 16;

const readViewport = (): Size =>
  typeof window === 'undefined'
    ? { width: 1280, height: 800 }
    : { width: window.innerWidth, height: window.innerHeight };

/** Захват указателя: курсор уходит с шапки, а жест продолжается. Синтетический указатель (тесты) захватить нельзя — без захвата тоже работает, пока курсор над элементом */
function capture(element: Element, pointerId: number, on: boolean) {
  try {
    if (on) element.setPointerCapture(pointerId);
    else element.releasePointerCapture(pointerId);
  } catch {
    // InvalidPointerId: указатель уже отпущен или не настоящий
  }
}

/** Кнопки и поля в шапке — не ручка: нажатие на них не начинает перетаскивание */
const isControl = (target: EventTarget | null, handle: HTMLElement) => {
  const control =
    target instanceof Element ? target.closest('button, a, input, [role="button"]') : null;

  return control !== null && control !== handle && handle.contains(control);
};

/**
 * Плавающее окно внутри приложения — голос поверх всего, картинка в картинке. Тянется за шапку и прилипает
 * к краям и углам (прижатая к краю едет за ним, когда окно меняет размер), меняет размер за углы,
 * сворачивается в пилюлю в том же углу. Двигается только transform; позиция — в localStorage
 * (`autoSaveId`). Не модальная: фокус не ловит, Tab уходит дальше по странице. Шапка в фокусе —
 * стрелки двигают, Alt+стрелки меняют размер.
 */
export function FloatingPanel({
  title,
  label,
  defaultCorner = 'bottom-right',
  defaultSize = { width: 320, height: 200 },
  minSize = { width: 220, height: 120 },
  maxSize = { width: 960, height: 720 },
  resizable = true,
  collapsed: collapsedProp,
  defaultCollapsed = false,
  onCollapsedChange,
  onClose,
  actions,
  pill,
  autoSaveId,
  margin = 12,
  snapThreshold = 72,
  className,
  style,
  children,
  ...rest
}: FloatingPanelProps) {
  const strings = useUiStrings().floatingPanel;
  const container = usePortalContainer();
  const titleId = useId();
  const instructionsId = useId();
  const pillRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const [saved] = useState<FloatingState | null>(() =>
    autoSaveId ? readFloatingState(autoSaveId) : null,
  );
  const [viewport, setViewport] = useState(readViewport);
  const [placement, setPlacement] = useState<Placement>(
    () => saved?.placement ?? cornerPlacement(defaultCorner),
  );
  const [size, setSize] = useState<Size>(() => saved?.size ?? defaultSize);
  const [collapsedState, setCollapsedState] = useState(saved?.collapsed ?? defaultCollapsed);
  const [pillSize, setPillSize] = useState<Size>({ width: 160, height: 32 });
  // Живой прямоугольник жеста: пока тянут, место ещё не решено, решит прилипание на отпускании
  const [live, setLiveState] = useState<Rect | null>(null);
  // То же в ref: pointerup может прийти раньше, чем React отрисует последний pointermove
  const liveRef = useRef<Rect | null>(null);
  const collapsed = collapsedProp ?? collapsedState;
  const boxSize = clampSize(size, minSize, maxSize, viewport, margin);
  const shown = collapsed ? pillSize : boxSize;
  const point = live ?? resolvePlacement(placement, shown, viewport, margin);
  const accessibleName = label ?? (typeof title === 'string' ? title : undefined);

  const persist = (patch: Partial<FloatingState>) => {
    if (!autoSaveId) return;

    writeFloatingState(autoSaveId, { placement, size, collapsed, ...patch });
  };

  const setCollapsed = (next: boolean) => {
    setCollapsedState(next);
    onCollapsedChange?.(next);
    persist({ collapsed: next });
  };

  // Окно меняет размер — панель остаётся в нём: прижатая едет за краем, свободная упирается
  useEffect(() => {
    const onResize = () => setViewport(readViewport());

    window.addEventListener('resize', onResize);

    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Пилюля меряется сама: её ширина — от заголовка, а встать она должна в тот же угол
  useLayoutEffect(() => {
    const element = pillRef.current;

    if (!collapsed || !element) return;

    const measure = () => {
      const next = { width: element.offsetWidth, height: element.offsetHeight };

      setPillSize((prev) =>
        prev.width === next.width && prev.height === next.height ? prev : next,
      );
    };

    measure();

    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(measure);

    observer.observe(element);

    return () => observer.disconnect();
  }, [collapsed]);

  const setLive = (next: Rect | null) => {
    liveRef.current = next;
    setLiveState(next);
  };

  const finishGesture = () => {
    const current = gesture.current;
    const live = liveRef.current;

    gesture.current = null;

    if (!current || !live) return;

    if (current.kind === 'move') {
      const next = snapPlacement(live, shown, viewport, { margin, threshold: snapThreshold });

      setPlacement(next);
      persist({ placement: next });
    } else {
      const nextSize = { width: live.width, height: live.height };
      // Размер сменили — прилипание пересчитывается: угол, оставшийся у края, остаётся прижатым
      const next = snapPlacement(live, nextSize, viewport, { margin, threshold: 1 });

      setSize(nextSize);
      setPlacement(next);
      persist({ placement: next, size: nextSize });
    }

    setLive(null);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const current = gesture.current;

    if (!current || event.pointerId !== current.pointerId) return;

    const dx = event.clientX - current.origin.x;
    const dy = event.clientY - current.origin.y;

    if (current.kind === 'move') {
      const next = clampPoint(
        { x: current.start.x + dx, y: current.start.y + dy },
        shown,
        viewport,
        margin,
      );

      setLive({ ...next, ...shown });
    } else {
      setLive(
        resizeFromCorner(current.start, current.corner, dx, dy, minSize, maxSize, viewport, margin),
      );
    }
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLElement>) => {
    if (gesture.current?.pointerId !== event.pointerId) return;

    capture(event.currentTarget, event.pointerId, false);
    finishGesture();
  };

  const startMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || isControl(event.target, event.currentTarget)) return;

    event.preventDefault();
    capture(event.currentTarget, event.pointerId, true);
    gesture.current = {
      kind: 'move',
      pointerId: event.pointerId,
      origin: { x: event.clientX, y: event.clientY },
      start: point,
    };
    setLive({ ...point, ...shown });
  };

  const startResize = (event: ReactPointerEvent<HTMLElement>, corner: ResizeCorner) => {
    if (event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();
    capture(event.currentTarget, event.pointerId, true);

    const start = { ...point, ...boxSize };

    gesture.current = {
      kind: 'resize',
      pointerId: event.pointerId,
      origin: { x: event.clientX, y: event.clientY },
      start,
      corner,
    };
    setLive(start);
  };

  const gestureHandlers = {
    onPointerMove,
    onPointerUp: onPointerEnd,
    onPointerCancel: onPointerEnd,
  };

  const onHandleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;

    const step = event.shiftKey ? KEY_STEP * 4 : KEY_STEP;

    if (event.altKey && !collapsed && resizable) {
      const grow: Record<string, Size> = {
        ArrowRight: { width: step, height: 0 },
        ArrowLeft: { width: -step, height: 0 },
        ArrowDown: { width: 0, height: step },
        ArrowUp: { width: 0, height: -step },
      };
      const delta = grow[event.key];

      if (!delta) return;

      event.preventDefault();

      const nextSize = clampSize(
        { width: boxSize.width + delta.width, height: boxSize.height + delta.height },
        minSize,
        maxSize,
        viewport,
        margin,
      );

      setSize(nextSize);
      persist({ size: nextSize });

      return;
    }

    const next = moveByKey(point, event.key, step, shown, viewport, margin);

    if (!next) return;

    event.preventDefault();

    // Порог 0: шаг стрелкой от края не должен прилипать обратно — прижата, только если стоит вплотную
    const nextPlacement = snapPlacement(next, shown, viewport, { margin, threshold: 0 });

    setPlacement(nextPlacement);
    persist({ placement: nextPlacement });
  };

  const positionStyle = {
    ...style,
    transform: `translate3d(${point.x}px, ${point.y}px, 0)`,
    ...(collapsed
      ? null
      : { width: live?.width ?? boxSize.width, height: live?.height ?? boxSize.height }),
  } as CSSProperties;

  const closeButton = onClose && (
    <IconButton label={strings.close} size="xs" onClick={onClose}>
      <Icon icon={X} size="xs" />
    </IconButton>
  );

  const panel = collapsed ? (
    <section
      aria-label={accessibleName}
      aria-labelledby={accessibleName ? undefined : titleId}
      className={cx(styles.root, className)}
      data-gesture={live ? '' : undefined}
      style={positionStyle}
      {...rest}
    >
      <div
        ref={pillRef}
        className={styles.pill}
        tabIndex={0}
        aria-describedby={instructionsId}
        onPointerDown={startMove}
        onKeyDown={onHandleKeyDown}
        {...gestureHandlers}
      >
        <span id={titleId} className={styles.pillTitle}>
          {pill ?? title}
        </span>

        <IconButton label={strings.expand} size="xs" onClick={() => setCollapsed(false)}>
          <Icon icon={Maximize2} size="xs" />
        </IconButton>

        {closeButton}
      </div>

      <VisuallyHidden.Root id={instructionsId}>{strings.instructions}</VisuallyHidden.Root>
    </section>
  ) : (
    <section
      aria-label={accessibleName}
      aria-labelledby={accessibleName ? undefined : titleId}
      className={cx(styles.root, className)}
      data-gesture={live ? '' : undefined}
      style={positionStyle}
      {...rest}
    >
      {/* Появление — у внутреннего слоя: keyframes с transform перебили бы место панели */}
      <div className={styles.panel}>
        <div
          className={styles.header}
          tabIndex={0}
          aria-describedby={instructionsId}
          onPointerDown={startMove}
          onKeyDown={onHandleKeyDown}
          {...gestureHandlers}
        >
          <span id={titleId} className={styles.title}>
            {title}
          </span>

          {actions}

          <IconButton label={strings.collapse} size="xs" onClick={() => setCollapsed(true)}>
            <Icon icon={Minus} size="xs" />
          </IconButton>

          {closeButton}
        </div>

        <div className={styles.body}>{children}</div>

        {resizable &&
          CORNERS.map((corner) => (
            <span
              key={corner}
              aria-hidden
              title={strings.resize}
              className={styles.corner}
              data-corner={corner}
              onPointerDown={(event) => startResize(event, corner)}
              {...gestureHandlers}
            />
          ))}
      </div>

      <VisuallyHidden.Root id={instructionsId}>{strings.instructions}</VisuallyHidden.Root>
    </section>
  );

  if (typeof document === 'undefined') return null;

  return createPortal(panel, container ?? document.body);
}
