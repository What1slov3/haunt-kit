import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type FocusEvent,
  type Key,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

import { GripVertical } from 'lucide-react';
import { VisuallyHidden } from 'radix-ui';

import { Icon } from '../icon/icon';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';

import styles from './sortable-list.module.css';
import {
  autoScrollSpeed,
  clampIndex,
  shiftFor,
  slotTop,
  stepDistance,
  targetIndex,
  type ItemRect,
  type SortableMessages,
} from './sortable-math';

export interface SortableItemState {
  index: number;
  /** Эту строку сейчас тащат */
  dragging: boolean;
  /**
   * Ручка: с `handle` — кнопка, за которую тянут (мышью, пальцем, клавиатурой); без него — значок-подсказка
   * без поведения. Поставьте её в строке, где удобно
   */
  handle: ReactNode;
}

export interface SortableListProps<T> extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  items: readonly T[];
  /** Устойчивый ключ — id: по нему строка узнаётся после перестановки */
  getKey: (item: T, index: number) => Key;
  /** Название строки для скринридера: «Взято: general, позиция 2 из 5» */
  getLabel: (item: T) => string;
  renderItem: (item: T, state: SortableItemState) => ReactNode;
  /** Строку from положили на место to; порядок меняет владелец списка (`moveItem`) */
  onReorder: (from: number, to: number) => void;
  /** Тянуть только за ручку: строка остаётся кликабельной и прокручивается пальцем */
  handle?: boolean;
  /** Подпись списка для скринридера */
  label?: string;
  disabled?: boolean;
  /** Свои фразы для скринридера (другой язык) */
  messages?: Partial<SortableMessages>;
}

interface DragState {
  key: Key;
  from: number;
  to: number;
  mode: 'pointer' | 'keyboard';
  /** Сдвиг перетаскиваемой строки от её места в снимке */
  offset: number;
  /** drop — строка доезжает до места, после этого onReorder */
  phase: 'drag' | 'drop';
  rects: ItemRect[];
}

interface PointerSession {
  index: number;
  key: Key;
  pointerId: number;
  startX: number;
  startY: number;
  clientY: number;
  /** Точка захвата от верха списка — с ней считается сдвиг, даже когда контейнер прокрутился */
  startListY: number;
  started: boolean;
  scroller: HTMLElement | null;
  frame: number;
  /** Слушатели окна этой сессии: снимаются те же функции, что ставились, а не из нового рендера */
  listeners: WindowListeners;
}

interface WindowListeners {
  move: (event: PointerEvent) => void;
  up: (event: PointerEvent) => void;
  cancel: (event: PointerEvent) => void;
  key: (event: globalThis.KeyboardEvent) => void;
}

/** Порог начала перетаскивания: короче — это клик по строке */
const DRAG_THRESHOLD = 4;
/** Поднятая строка чуть крупнее соседей: видно, что её держат, даже когда она стоит на «призраке» */
const LIFT_SCALE = 1.02;
/** Доезд до места после отпускания — как --duration-base */
const DROP_MS = 150;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Ближайший прокручиваемый предок — его и крутим у края; нет — документ */
function scrollParent(element: HTMLElement): HTMLElement | null {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);

    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
      return node;
    }
  }

  return document.scrollingElement instanceof HTMLElement ? document.scrollingElement : null;
}

/** В строке без ручки клик по своей кнопке или полю не должен начинать перетаскивание */
function isInteractive(target: EventTarget | null, row: HTMLElement): boolean {
  const element =
    target instanceof Element ? target.closest('button, a, input, textarea, select') : null;

  return element !== null && element !== row && row.contains(element);
}

/**
 * Перетаскиваемый список: порядок каналов, ролей. Pointer-события, а не HTML5 drag-and-drop: тот не
 * стилизуется и не работает пальцем. Строка едет за курсором, соседи раздвигаются transform-ами,
 * «призрак» показывает место; у края контейнер прокручивается. Клавиатура — по WAI-ARIA: Пробел /
 * Enter — взять, стрелки — двигать, Пробел / Enter — положить, Esc — отменить; ход объявляется
 * скринридеру.
 */
export function SortableList<T>({
  items,
  getKey,
  getLabel,
  renderItem,
  onReorder,
  handle = false,
  label,
  disabled = false,
  messages,
  className,
  ...rest
}: SortableListProps<T>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const rows = useRef(new Map<Key, HTMLLIElement>());
  const session = useRef<PointerSession | null>(null);
  // Последнее состояние — для обработчиков на window, живущих дольше одного рендера
  const dragRef = useRef<DragState | null>(null);
  const focusKey = useRef<Key | null>(null);
  const [drag, setDragState] = useState<DragState | null>(null);
  // Кадр после перестановки без transition: соседи уже на новых местах в DOM, сдвиги сброшены — без прыжка
  const [settling, setSettling] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const instructionsId = useId();
  const strings = useUiStrings();
  const text = { ...strings.sortableList, ...messages };
  const total = items.length;

  const setDrag = (next: DragState | null) => {
    dragRef.current = next;
    setDragState(next);
  };

  const labelAt = (index: number) => {
    const item = items[index];

    return item === undefined ? '' : getLabel(item);
  };

  const snapshot = (): ItemRect[] => {
    const root = rootRef.current;
    const top = root?.getBoundingClientRect().top ?? 0;

    return items.map((item, index) => {
      const box = rows.current.get(getKey(item, index))?.getBoundingClientRect();

      return { top: (box?.top ?? 0) - top, height: box?.height ?? 0 };
    });
  };

  const finish = (state: DragState, commit: boolean) => {
    const moved = commit && state.from !== state.to;

    setDrag(null);

    if (moved) {
      setSettling(true);
      onReorder(state.from, state.to);
    }

    setAnnouncement(
      commit
        ? text.dropped(labelAt(state.from), state.to + 1, total)
        : text.cancelled(labelAt(state.from), state.from + 1, total),
    );
  };

  useEffect(() => {
    if (!settling) return;

    const frame = requestAnimationFrame(() => setSettling(false));

    return () => cancelAnimationFrame(frame);
  }, [settling]);

  // После перестановки с клавиатуры фокус — на той же строке на новом месте
  useLayoutEffect(() => {
    const key = focusKey.current;

    if (key === null || drag) return;

    focusKey.current = null;

    const row = rows.current.get(key);
    const target = handle ? row?.querySelector<HTMLElement>('[data-sortable-handle]') : row;

    if (target && document.activeElement !== target) target.focus({ preventScroll: true });
  });

  /** Положение строки под курсором: сдвиг от точки захвата и место среди соседей */
  const updatePointer = () => {
    const current = session.current;
    const state = dragRef.current;
    const root = rootRef.current;

    if (!current?.started || !state || state.phase !== 'drag' || !root) return;

    const listY = current.clientY - root.getBoundingClientRect().top;
    const offset = listY - current.startListY;
    const rect = state.rects[state.from];
    const center = (rect?.top ?? 0) + (rect?.height ?? 0) / 2 + offset;

    setDrag({ ...state, offset, to: targetIndex(state.rects, state.from, center) });
  };

  const autoScroll = () => {
    const current = session.current;

    if (!current?.started) return;

    const scroller = current.scroller;

    if (scroller) {
      const isDocument = scroller === document.scrollingElement;
      const box = isDocument
        ? { top: 0, bottom: window.innerHeight }
        : scroller.getBoundingClientRect();
      const speed = autoScrollSpeed(current.clientY, box.top, box.bottom);

      if (speed !== 0) {
        scroller.scrollTop += speed;
        updatePointer();
      }
    }

    current.frame = requestAnimationFrame(autoScroll);
  };

  const dropPointer = (commit: boolean) => {
    const state = dragRef.current;

    if (!state) return;

    const rect = state.rects[state.from];
    const to = commit ? state.to : state.from;
    const landing = slotTop(state.rects, state.from, to) - (rect?.top ?? 0);
    const delay = prefersReducedMotion() ? 0 : DROP_MS;

    setDrag({ ...state, to, offset: landing, phase: 'drop' });
    setTimeout(() => {
      const latest = dragRef.current;

      if (latest?.phase === 'drop') finish(latest, commit);
    }, delay);
  };

  const stopSession = () => {
    const current = session.current;

    if (!current) return;

    cancelAnimationFrame(current.frame);
    session.current = null;
    window.removeEventListener('pointermove', current.listeners.move);
    window.removeEventListener('pointerup', current.listeners.up);
    window.removeEventListener('pointercancel', current.listeners.cancel);
    window.removeEventListener('keydown', current.listeners.key, true);
  };

  function onWindowPointerMove(event: PointerEvent) {
    const current = session.current;

    if (!current || event.pointerId !== current.pointerId) return;

    current.clientY = event.clientY;

    if (!current.started) {
      const moved = Math.hypot(event.clientX - current.startX, event.clientY - current.startY);

      if (moved < DRAG_THRESHOLD) return;

      const root = rootRef.current;

      if (!root) return;

      current.started = true;
      current.startListY = current.startY - root.getBoundingClientRect().top;
      current.scroller = scrollParent(root);
      current.frame = requestAnimationFrame(autoScroll);

      const rects = snapshot();

      setDrag({
        key: current.key,
        from: current.index,
        to: current.index,
        mode: 'pointer',
        offset: 0,
        phase: 'drag',
        rects,
      });
      setAnnouncement(text.picked(labelAt(current.index), current.index + 1, total));
    }

    // Без этого палец прокручивал бы страницу, а мышь выделяла текст
    event.preventDefault();
    updatePointer();
  }

  function onWindowPointerUp(event: PointerEvent) {
    const current = session.current;

    if (!current || event.pointerId !== current.pointerId) return;

    const started = current.started;

    stopSession();

    if (!started) return;

    // Отпускание после перетаскивания — не клик по строке или её кнопке
    const swallow = (click: Event) => {
      click.stopPropagation();
      click.preventDefault();
    };

    window.addEventListener('click', swallow, { capture: true, once: true });
    setTimeout(() => window.removeEventListener('click', swallow, true), 0);
    dropPointer(true);
  }

  function onWindowPointerCancel(event: PointerEvent) {
    if (event.pointerId !== session.current?.pointerId) return;

    const started = session.current.started;

    stopSession();

    if (started) dropPointer(false);
  }

  function onWindowKeyDown(event: globalThis.KeyboardEvent) {
    if (event.key !== 'Escape' || !session.current?.started) return;

    // Esc отменяет перетаскивание, а не закрывает диалог или поповер вокруг списка
    event.preventDefault();
    event.stopPropagation();
    stopSession();
    dropPointer(false);
  }

  // Размонтирование посреди перетаскивания — снять слушатели окна; stopSession читает только ref
  useEffect(() => stopSession, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>, index: number, key: Key) => {
    if (disabled || dragRef.current || event.button !== 0 || !event.isPrimary) return;

    const row = rows.current.get(key);

    if (!handle && row && isInteractive(event.target, row)) return;

    const listeners: WindowListeners = {
      move: onWindowPointerMove,
      up: onWindowPointerUp,
      cancel: onWindowPointerCancel,
      key: onWindowKeyDown,
    };

    session.current = {
      listeners,
      index,
      key,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      clientY: event.clientY,
      startListY: 0,
      started: false,
      scroller: null,
      frame: 0,
    };
    window.addEventListener('pointermove', listeners.move, { passive: false });
    window.addEventListener('pointerup', listeners.up);
    window.addEventListener('pointercancel', listeners.cancel);
    window.addEventListener('keydown', listeners.key, true);
  };

  const moveTo = (state: DragState, to: number) => {
    const next = clampIndex(to, total);

    if (next === state.to) return;

    const rect = state.rects[state.from];

    setDrag({
      ...state,
      to: next,
      offset: slotTop(state.rects, state.from, next) - (rect?.top ?? 0),
    });
    setAnnouncement(text.moved(labelAt(state.from), next + 1, total));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>, index: number, key: Key) => {
    if (disabled || event.target !== event.currentTarget) return;

    const state = dragRef.current;
    const toggle = event.key === ' ' || event.key === 'Enter';

    if (!state) {
      if (!toggle) return;

      event.preventDefault();
      setDrag({
        key,
        from: index,
        to: index,
        mode: 'keyboard',
        offset: 0,
        phase: 'drag',
        rects: snapshot(),
      });
      setAnnouncement(text.picked(labelAt(index), index + 1, total));

      return;
    }

    if (state.mode !== 'keyboard') return;

    const step: Record<string, number> = {
      ArrowUp: state.to - 1,
      ArrowDown: state.to + 1,
      Home: 0,
      End: total - 1,
    };

    if (event.key in step) {
      event.preventDefault();
      moveTo(state, step[event.key] ?? state.to);

      return;
    }

    if (toggle || event.key === 'Escape') {
      event.preventDefault();
      // Esc в списке — отмена переноса, а не закрытие слоя вокруг
      event.stopPropagation();
      focusKey.current = state.key;
      finish(state, toggle);
    }
  };

  const onBlur = (event: FocusEvent<HTMLElement>) => {
    const state = dragRef.current;

    // Фокус ушёл (Tab, клик мимо) посреди переноса с клавиатуры — отмена, как Esc
    if (state?.mode === 'keyboard' && event.relatedTarget !== event.currentTarget) {
      finish(state, false);
    }
  };

  const draggableProps = (index: number, key: Key) => ({
    tabIndex: disabled ? -1 : 0,
    'aria-describedby': instructionsId,
    'aria-disabled': disabled || undefined,
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => onPointerDown(event, index, key),
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => onKeyDown(event, index, key),
    onBlur,
  });

  const distance = drag ? stepDistance(drag.rects, drag.from) : 0;
  const draggedRect = drag?.rects[drag.from];

  return (
    <div
      ref={rootRef}
      className={cx(styles.root, className)}
      data-drag-mode={drag?.mode}
      data-drag-phase={drag?.phase}
      data-settling={settling || undefined}
      data-disabled={disabled || undefined}
      {...rest}
    >
      {drag && draggedRect && (
        <div
          className={styles.ghost}
          aria-hidden
          style={{
            height: draggedRect.height,
            transform: `translateY(${slotTop(drag.rects, drag.from, drag.to)}px)`,
          }}
        />
      )}

      <ul className={styles.list} aria-label={label}>
        {items.map((item, index) => {
          const key = getKey(item, index);
          const dragging = drag?.key === key;
          const offset = drag
            ? dragging
              ? drag.offset
              : shiftFor(index, drag.from, drag.to, distance)
            : 0;
          const handleNode = handle ? (
            <button
              type="button"
              className={styles.handle}
              aria-label={text.handle(getLabel(item))}
              disabled={disabled}
              data-sortable-handle=""
              {...draggableProps(index, key)}
            >
              <Icon icon={GripVertical} size="sm" />
            </button>
          ) : (
            <span className={styles.grip} aria-hidden>
              <Icon icon={GripVertical} size="sm" />
            </span>
          );

          return (
            <li
              key={key}
              ref={(node) => {
                if (node) rows.current.set(key, node);
                else rows.current.delete(key);
              }}
              className={cx(styles.item, !handle && styles.whole)}
              data-dragging={dragging || undefined}
              style={
                dragging
                  ? { transform: `translateY(${offset}px) scale(${LIFT_SCALE})` }
                  : offset
                    ? { transform: `translateY(${offset}px)` }
                    : undefined
              }
              {...(handle ? {} : draggableProps(index, key))}
            >
              {renderItem(item, { index, dragging, handle: handleNode })}
            </li>
          );
        })}
      </ul>

      <VisuallyHidden.Root id={instructionsId}>{text.instructions}</VisuallyHidden.Root>

      <VisuallyHidden.Root role="status" aria-live="assertive" aria-atomic="true">
        {announcement}
      </VisuallyHidden.Root>
    </div>
  );
}
