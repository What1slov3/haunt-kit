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
  type RefObject,
} from 'react';

import { ChevronDown, X } from 'lucide-react';
import { VisuallyHidden } from 'radix-ui';

import { DropdownMenu } from '../dropdown-menu/dropdown-menu';
import { Icon } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';
import { cx } from '../lib/cx';
import { useHotkey } from '../lib/use-hotkey';
import { autoScrollSpeed } from '../sortable-list/sortable-math';
import { useUiStrings } from '../strings/ui-strings-context';
import { Tooltip } from '../tooltip/tooltip';

import {
  clampDragOffset,
  cycleIndex,
  dropIndex,
  groupRange,
  tabAfterClose,
  tabShift,
  type TabRect,
} from './browser-tabs-model';
import styles from './browser-tabs.module.css';

export interface BrowserTab {
  id: string;
  /** Название канала; у закреплённой — подсказка и aria-label */
  label: string;
  /** Иконка или аватар 16 px; у закреплённой — всё, что видно */
  icon?: ReactNode;
  /** Закреплённая: узкая, только иконка, всегда в начале полосы и без крестика */
  pinned?: boolean;
  /** Непрочитанное: точка; число — счётчик */
  unread?: boolean | number;
  /** Можно закрыть; по умолчанию — все, кроме закреплённых */
  closable?: boolean;
}

export interface BrowserTabsProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** Закреплённые — первыми: перетаскивание не смешивает группы */
  tabs: readonly BrowserTab[];
  /** id открытой вкладки */
  value: string | null;
  onValueChange: (id: string) => void;
  /**
   * Закрыть вкладку (крестик, средняя кнопка мыши, Delete, Ctrl+W). Закрывают открытую — перед этим
   * `onValueChange` получает соседку справа (у последней — слева)
   */
  onClose?: (id: string) => void;
  /** Вкладку from поставили на место to; порядок меняет владелец (`moveItem`) */
  onReorder?: (from: number, to: number) => void;
  /** Подпись полосы для скринридера */
  label?: string;
  /**
   * Где должен быть фокус, чтобы работали Ctrl+Tab, Ctrl+Shift+Tab и Ctrl+W (обычно — окно приложения
   * с контентом вкладок); по умолчанию — сама полоса
   */
  hotkeyScope?: RefObject<HTMLElement | null>;
  /** Кнопки после вкладок: «новая вкладка» */
  actions?: ReactNode;
}

interface DragState {
  from: number;
  to: number;
  offset: number;
  rects: TabRect[];
  range: [number, number];
}

interface PointerSession {
  index: number;
  pointerId: number;
  startX: number;
  clientX: number;
  /** Точка захвата от начала полосы — с ней сдвиг верен и после прокрутки */
  startListX: number;
  started: boolean;
  frame: number;
  move: (event: PointerEvent) => void;
  up: (event: PointerEvent) => void;
}

/** Порог начала перетаскивания: короче — это клик по вкладке */
const DRAG_THRESHOLD = 4;

const isClosable = (tab: BrowserTab) => tab.closable ?? !tab.pinned;

/**
 * Вкладки открытых каналов, как в браузере. Перетаскивание порядка — по образцу SortableList (pointer-
 * события, соседи раздвигаются transform-ами, геометрия общая), только по оси X и внутри группы
 * закреплённых или обычных. Переполнение — прокрутка колесом и меню «все вкладки». Клавиатура: стрелки,
 * Home / End — по вкладкам, Enter — открыть, Delete — закрыть, Ctrl+Shift+стрелки — переставить; Ctrl+Tab
 * и Ctrl+W — когда фокус внутри `hotkeyScope`. В обычной вкладке браузера Ctrl+Tab и Ctrl+W забирает сам
 * браузер — эти сочетания для окна Tauri.
 */
export function BrowserTabs({
  tabs,
  value,
  onValueChange,
  onClose,
  onReorder,
  label,
  hotkeyScope,
  actions,
  className,
  ...rest
}: BrowserTabsProps) {
  const strings = useUiStrings().browserTabs;
  const baseId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef(new Map<string, HTMLDivElement>());
  const session = useRef<PointerSession | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const focusId = useRef<string | null>(null);
  const [drag, setDragState] = useState<DragState | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [overflow, setOverflow] = useState({ any: false, start: false, end: false });
  const [announcement, setAnnouncement] = useState('');
  const instructionsId = `${baseId}-instructions`;
  const activeIndex = tabs.findIndex((tab) => tab.id === value);
  // Roving tabindex: в Tab-порядке одна вкладка — с фокусом, иначе открытая, иначе первая
  const tabStop = tabs.some((tab) => tab.id === focusedId)
    ? focusedId
    : (tabs[activeIndex]?.id ?? tabs[0]?.id);

  const setDrag = (next: DragState | null) => {
    dragRef.current = next;
    setDragState(next);
  };

  const close = (id: string) => {
    const tab = tabs.find((item) => item.id === id);

    if (!tab || !isClosable(tab) || !onClose) return;

    const next = tabAfterClose(tabs, id, value);

    if (next !== value && next !== null) onValueChange(next);

    onClose(id);
  };

  const focusTab = (id: string | undefined) => {
    if (!id) return;

    tabRefs.current.get(id)?.querySelector<HTMLElement>('[role="tab"]')?.focus();
  };

  // После закрытия и перестановки с клавиатуры фокус — на нужной вкладке уже нового рендера
  useLayoutEffect(() => {
    const id = focusId.current;

    if (id === null) return;

    focusId.current = null;
    focusTab(id);
  });

  // Открытая вкладка всегда видна: выбрали из меню или Ctrl+Tab ушёл за край полосы
  useEffect(() => {
    if (value === null) return;

    tabRefs.current.get(value)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [value]);

  // Переполнение и затухание краёв: меню «все вкладки» нужно, только когда что-то не влезло
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const list = listRef.current;

    if (!scroller || !list) return;

    const measure = () => {
      const max = scroller.scrollWidth - scroller.clientWidth;
      const next = {
        any: max > 1,
        start: scroller.scrollLeft > 1,
        end: scroller.scrollLeft < max - 1,
      };

      setOverflow((prev) =>
        prev.any === next.any && prev.start === next.start && prev.end === next.end ? prev : next,
      );
    };

    // Колесо мыши листает полосу вбок: вертикальной прокрутки у неё нет. Не пассивный — иначе
    // страница под полосой прокрутилась бы вместе с ней
    const wheel = (event: WheelEvent) => {
      const max = scroller.scrollWidth - scroller.clientWidth;

      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || max <= 0) return;

      event.preventDefault();
      scroller.scrollLeft += event.deltaY;
    };

    measure();
    scroller.addEventListener('scroll', measure, { passive: true });
    scroller.addEventListener('wheel', wheel, { passive: false });

    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);

    observer?.observe(scroller);
    observer?.observe(list);

    return () => {
      scroller.removeEventListener('scroll', measure);
      scroller.removeEventListener('wheel', wheel);
      observer?.disconnect();
    };
  }, []);

  const inScope = () => {
    const scope = hotkeyScope?.current ?? rootRef.current;

    return Boolean(scope && document.activeElement && scope.contains(document.activeElement));
  };

  // preventDefault сами и только в своей зоне: вне её Ctrl+W должен остаться браузеру
  useHotkey(
    ['ctrl+tab', 'ctrl+shift+tab'],
    (event) => {
      if (!inScope() || tabs.length === 0) return;

      event.preventDefault();

      const next = tabs[cycleIndex(tabs.length, Math.max(0, activeIndex), event.shiftKey ? -1 : 1)];

      if (!next) return;

      onValueChange(next.id);

      // Фокус был на вкладке — едет за открытой, иначе остаётся в контенте
      if (rootRef.current?.contains(document.activeElement)) focusId.current = next.id;
    },
    { allowInInput: true, preventDefault: false },
  );

  useHotkey(
    'mod+w',
    (event) => {
      if (!inScope() || value === null) return;

      event.preventDefault();

      if (rootRef.current?.contains(document.activeElement)) {
        focusId.current = tabAfterClose(tabs, value, value);
      }

      close(value);
    },
    { allowInInput: true, preventDefault: false, enabled: Boolean(onClose) },
  );

  const reorderBy = (index: number, delta: number) => {
    const [min, max] = groupRange(tabs, index);
    const to = Math.min(Math.max(index + delta, min), max);
    const tab = tabs[index];

    if (!onReorder || !tab || to === index) return;

    focusId.current = tab.id;
    onReorder(index, to);
    setAnnouncement(strings.moved(tab.label, to + 1, tabs.length));
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const tab = tabs[index];

    if (!tab) return;

    const reorder = event.ctrlKey && event.shiftKey;

    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();

      const delta = event.key === 'ArrowRight' ? 1 : -1;

      if (reorder) reorderBy(index, delta);
      else focusTab(tabs[cycleIndex(tabs.length, index, delta)]?.id);

      return;
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      focusTab((event.key === 'Home' ? tabs[0] : tabs.at(-1))?.id);

      return;
    }

    if (event.key === 'Delete' && isClosable(tab) && onClose) {
      event.preventDefault();
      // Фокус — туда, где окажется взгляд: на соседку закрытой
      focusId.current = tabAfterClose(tabs, tab.id, tab.id);
      close(tab.id);
    }
  };

  /* --- Перетаскивание ------------------------------------------------------------------ */

  const snapshot = (): TabRect[] => {
    const left = listRef.current?.getBoundingClientRect().left ?? 0;

    return tabs.map((tab) => {
      const box = tabRefs.current.get(tab.id)?.getBoundingClientRect();

      return { left: (box?.left ?? 0) - left, width: box?.width ?? 0 };
    });
  };

  const updatePointer = () => {
    const current = session.current;
    const state = dragRef.current;
    const list = listRef.current;

    if (!current?.started || !state || !list) return;

    const listX = current.clientX - list.getBoundingClientRect().left;
    const offset = clampDragOffset(
      state.rects,
      state.from,
      listX - current.startListX,
      state.range,
    );
    const rect = state.rects[state.from];
    const center = (rect?.left ?? 0) + (rect?.width ?? 0) / 2 + offset;

    setDrag({ ...state, offset, to: dropIndex(state.rects, state.from, center, state.range) });
  };

  const autoScroll = () => {
    const current = session.current;
    const scroller = scrollerRef.current;

    if (!current?.started || !scroller) return;

    const box = scroller.getBoundingClientRect();
    const speed = autoScrollSpeed(current.clientX, box.left, box.right, 32, 12);

    if (speed !== 0) {
      scroller.scrollLeft += speed;
      updatePointer();
    }

    current.frame = requestAnimationFrame(autoScroll);
  };

  const stopSession = () => {
    const current = session.current;

    if (!current) return;

    cancelAnimationFrame(current.frame);
    session.current = null;
    window.removeEventListener('pointermove', current.move);
    window.removeEventListener('pointerup', current.up);
    window.removeEventListener('pointercancel', current.up);
  };

  // Размонтирование посреди перетаскивания — снять слушатели окна
  useEffect(() => stopSession, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>, index: number) => {
    if (!onReorder || event.button !== 0 || !event.isPrimary || dragRef.current) return;

    const move = (moveEvent: PointerEvent) => {
      const current = session.current;

      if (!current || moveEvent.pointerId !== current.pointerId) return;

      current.clientX = moveEvent.clientX;

      if (!current.started) {
        if (Math.abs(moveEvent.clientX - current.startX) < DRAG_THRESHOLD) return;

        const list = listRef.current;

        if (!list) return;

        current.started = true;
        current.startListX = current.startX - list.getBoundingClientRect().left;
        current.frame = requestAnimationFrame(autoScroll);
        setDrag({
          from: current.index,
          to: current.index,
          offset: 0,
          rects: snapshot(),
          range: groupRange(tabs, current.index),
        });
      }

      moveEvent.preventDefault();
      updatePointer();
    };

    const up = (upEvent: PointerEvent) => {
      const current = session.current;

      if (!current || upEvent.pointerId !== current.pointerId) return;

      const started = current.started;
      const state = dragRef.current;

      stopSession();

      if (!started || !state) return;

      // Отпускание после перетаскивания — не клик по вкладке
      const swallow = (click: Event) => {
        click.stopPropagation();
        click.preventDefault();
      };

      window.addEventListener('click', swallow, { capture: true, once: true });
      setTimeout(() => window.removeEventListener('click', swallow, true), 0);
      setDrag(null);

      if (upEvent.type === 'pointerup' && state.from !== state.to) {
        onReorder(state.from, state.to);

        const tab = tabs[state.from];

        if (tab) setAnnouncement(strings.moved(tab.label, state.to + 1, tabs.length));
      }
    };

    session.current = {
      index,
      pointerId: event.pointerId,
      startX: event.clientX,
      clientX: event.clientX,
      startListX: 0,
      started: false,
      frame: 0,
      move,
      up,
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const tabStyle = (index: number): CSSProperties | undefined => {
    if (!drag) return undefined;

    const x = index === drag.from ? drag.offset : tabShift(drag.rects, index, drag.from, drag.to);

    return { transform: `translateX(${x}px)` };
  };

  const unreadLabel = (tab: BrowserTab) => {
    if (typeof tab.unread === 'number' && tab.unread > 0) return strings.unread(tab.unread);

    return tab.unread === true ? strings.unreadDot : undefined;
  };

  return (
    <div
      ref={rootRef}
      className={cx(styles.root, className)}
      data-dragging={drag ? '' : undefined}
      {...rest}
    >
      <div
        ref={scrollerRef}
        className={styles.scroller}
        data-overflow-start={overflow.start || undefined}
        data-overflow-end={overflow.end || undefined}
      >
        <div
          ref={listRef}
          role="tablist"
          aria-label={label ?? strings.label}
          aria-orientation="horizontal"
          className={styles.list}
        >
          {tabs.map((tab, index) => {
            const active = tab.id === value;
            const closable = isClosable(tab) && Boolean(onClose);
            const count = typeof tab.unread === 'number' && tab.unread > 0 ? tab.unread : null;
            const hasUnread = count !== null || tab.unread === true;
            const extra = [tab.pinned && strings.pinned, unreadLabel(tab)].filter(Boolean);
            const button = (
              <button
                type="button"
                role="tab"
                id={`${baseId}-${tab.id}`}
                aria-selected={active}
                aria-label={extra.length ? `${tab.label}, ${extra.join(', ')}` : undefined}
                aria-describedby={instructionsId}
                tabIndex={tab.id === tabStop ? 0 : -1}
                className={styles.tabButton}
                onClick={() => onValueChange(tab.id)}
                onFocus={() => setFocusedId(tab.id)}
                onKeyDown={(event) => onTabKeyDown(event, index)}
                onPointerDown={(event) => onPointerDown(event, index)}
                // Средняя кнопка: без этого Windows включает автопрокрутку, а Linux вставляет выделение
                onMouseDown={(event) => {
                  if (event.button === 1) event.preventDefault();
                }}
                onAuxClick={(event) => {
                  if (event.button === 1 && closable) close(tab.id);
                }}
              >
                {tab.icon && <span className={styles.icon}>{tab.icon}</span>}

                {!tab.pinned && <span className={styles.label}>{tab.label}</span>}

                {hasUnread && (
                  <span className={count !== null ? styles.count : styles.dot} aria-hidden>
                    {count !== null && (count > 99 ? '99+' : count)}
                  </span>
                )}
              </button>
            );

            return (
              <div
                key={tab.id}
                ref={(node) => {
                  if (node) tabRefs.current.set(tab.id, node);
                  else tabRefs.current.delete(tab.id);
                }}
                className={styles.tab}
                data-active={active || undefined}
                data-pinned={tab.pinned || undefined}
                data-closable={closable || undefined}
                data-dragging={drag?.from === index || undefined}
                style={tabStyle(index)}
              >
                {tab.pinned ? (
                  <Tooltip content={tab.label} side="bottom">
                    {button}
                  </Tooltip>
                ) : (
                  button
                )}

                {/* Крестик — только для мыши: с клавиатуры закрывают Delete и Ctrl+W на самой вкладке */}
                {closable && (
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-hidden
                    title={strings.close(tab.label)}
                    className={styles.close}
                    onClick={() => close(tab.id)}
                  >
                    <Icon icon={X} size="xs" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {overflow.any && (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <IconButton label={strings.allTabs} size="sm" className={styles.menu}>
              <Icon icon={ChevronDown} size="sm" />
            </IconButton>
          </DropdownMenu.Trigger>

          <DropdownMenu.Content align="end" className={styles.menuContent}>
            <DropdownMenu.RadioGroup value={value ?? ''} onValueChange={onValueChange}>
              {tabs.map((tab) => (
                <DropdownMenu.RadioItem key={tab.id} value={tab.id}>
                  {tab.label}
                </DropdownMenu.RadioItem>
              ))}
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      )}

      {actions && <div className={styles.actions}>{actions}</div>}

      <VisuallyHidden.Root id={instructionsId}>{strings.instructions}</VisuallyHidden.Root>

      <VisuallyHidden.Root role="status">{announcement}</VisuallyHidden.Root>
    </div>
  );
}
