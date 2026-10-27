import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';

import { ChevronRight } from 'lucide-react';
import { VisuallyHidden } from 'radix-ui';

import { Icon } from '../icon/icon';
import { cx } from '../lib/cx';
import { autoScrollSpeed } from '../sortable-list/sortable-math';
import { Spinner } from '../spinner/spinner';
import { useUiStrings } from '../strings/ui-strings-context';
import { useVirtualWindow } from '../virtual-list/use-virtual-window';

import {
  canMove,
  dropZone,
  flattenVisible,
  isBranch,
  keyboardMove,
  locate,
  moveNode,
  rangeIds,
  treeKeyAction,
  typeaheadIndex,
  type DropPosition,
  type FlatNode,
  type KeyboardMove,
  type TreeMove,
  type TreeNodeData,
} from './tree-model';
import styles from './tree.module.css';

export interface TreeItem extends TreeNodeData {
  children?: readonly TreeItem[];
  /** Иконка перед подписью */
  icon?: ReactNode;
  /** Справа в строке: счётчик, бейдж */
  meta?: ReactNode;
}

export type TreeSelectionMode = 'none' | 'single' | 'multiple';

export interface TreeRowState {
  level: number;
  expanded: boolean;
  selected: boolean;
  loading: boolean;
}

export interface TreeProps extends Omit<ComponentPropsWithRef<'div'>, 'children' | 'onSelect'> {
  items: readonly TreeItem[];
  /** Подпись дерева для скринридера */
  label: string;
  /** Раскрытые ветки (управляемо) */
  expanded?: readonly string[];
  defaultExpanded?: readonly string[];
  onExpandedChange?: (ids: string[]) => void;
  /** none — только навигация, single — один узел, multiple — Ctrl / Shift и Пробел */
  selectionMode?: TreeSelectionMode;
  selected?: readonly string[];
  defaultSelected?: readonly string[];
  onSelectedChange?: (ids: string[]) => void;
  /** Enter или двойной клик по узлу — открыть канал, файл */
  onActivate?: (id: string) => void;
  /** Загрузить детей ветки с `hasChildren` — владелец кладёт их в `items`, пока промис не выполнен */
  onLoadChildren?: (id: string) => Promise<void>;
  /**
   * Узел перетащили или сдвинули Alt + стрелками. Второй аргумент — дерево после перемещения: можно сразу
   * положить его в состояние. Без колбэка перетаскивания нет
   */
  onMove?: (move: TreeMove, next: TreeItem[]) => void;
  /** Своя подпись строки вместо `label` (бейджи, выделение) */
  renderLabel?: (item: TreeItem, state: TreeRowState) => ReactNode;
  /** Высота области прокрутки; нужна для виртуализации */
  height?: number | string;
  /** Рисовать только видимые строки; по умолчанию — когда строк больше 200 и задана высота */
  virtualize?: boolean;
}

const ROW_HEIGHT = 28;
const AUTO_VIRTUAL = 200;
const DRAG_THRESHOLD = 4;
const TYPEAHEAD_MS = 500;

interface DragState {
  id: string;
  targetId: string | null;
  position: DropPosition | null;
}

interface PointerSession {
  id: string;
  pointerId: number;
  x: number;
  y: number;
  dragging: boolean;
}

const moveKeys: Record<string, KeyboardMove> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowRight: 'in',
  ArrowLeft: 'out',
};

/**
 * Общее дерево по шаблону WAI-ARIA tree: раскрытие, выделение одного или нескольких, ленивые ветки,
 * поиск набором букв, перетаскивание (порядок и вложенность — категории каналов) и его замена с
 * клавиатуры — Alt + стрелки. Фокус остаётся на самом дереве (`aria-activedescendant`): строки могут
 * уходить из DOM при виртуализации, и фокус не теряется вместе с ними.
 */
export function Tree({
  items,
  label,
  expanded: expandedProp,
  defaultExpanded,
  onExpandedChange,
  selectionMode = 'single',
  selected: selectedProp,
  defaultSelected,
  onSelectedChange,
  onActivate,
  onLoadChildren,
  onMove,
  renderLabel,
  height,
  virtualize,
  className,
  style,
  ...rest
}: TreeProps) {
  const strings = useUiStrings();
  const baseId = useId();
  const hintId = `${baseId}-hint`;
  const scrollRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<HTMLDivElement>(null);
  const [expandedState, setExpandedState] = useState<readonly string[]>(defaultExpanded ?? []);
  const [selectedState, setSelectedState] = useState<readonly string[]>(defaultSelected ?? []);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [loading, setLoading] = useState<ReadonlySet<string>>(() => new Set());
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const [drag, setDrag] = useState<DragState | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [scrollTo, setScrollTo] = useState<number | null>(null);
  const session = useRef<PointerSession | null>(null);
  const suppressClick = useRef(false);
  const typeahead = useRef({ query: '', at: 0 });
  const scrollSpeed = useRef(0);

  const expandedIds = expandedProp ?? expandedState;
  const selectedIds = selectedProp ?? selectedState;
  const expandedSet = new Set(expandedIds);
  const selectedSet = new Set(selectedIds);
  const flat = flattenVisible(items, expandedSet);
  const activeIndex = Math.max(
    0,
    flat.findIndex((node) => node.id === activeId),
  );
  const active = flat[activeIndex];
  const virtual = (virtualize ?? flat.length > AUTO_VIRTUAL) && height !== undefined;

  const windowed = useVirtualWindow({
    count: flat.length,
    getKey: (index) => flat[index]!.id,
    estimateSize: () => ROW_HEIGHT,
    scrollRef,
    enabled: virtual,
  });

  useEffect(() => {
    if (scrollTo === null) return;

    if (virtual) windowed.scrollToIndex(scrollTo, 'auto');
    else
      treeRef.current
        ?.querySelector(`[data-index="${scrollTo}"]`)
        ?.scrollIntoView({ block: 'nearest' });

    setScrollTo(null);
  }, [scrollTo, virtual, windowed]);

  const setExpanded = (next: string[]) => {
    if (expandedProp === undefined) setExpandedState(next);

    onExpandedChange?.(next);
  };

  const setSelected = (next: string[]) => {
    if (selectedProp === undefined) setSelectedState(next);

    onSelectedChange?.(next);
  };

  const load = (node: FlatNode<TreeItem>) => {
    if (!onLoadChildren || node.item.children !== undefined || loading.has(node.id)) return;

    setLoading((current) => new Set(current).add(node.id));
    setFailed((current) => {
      const next = new Set(current);

      next.delete(node.id);

      return next;
    });

    onLoadChildren(node.id)
      .catch(() => setFailed((current) => new Set(current).add(node.id)))
      .finally(() =>
        setLoading((current) => {
          const next = new Set(current);

          next.delete(node.id);

          return next;
        }),
      );
  };

  const expand = (ids: string[]) => {
    const nodes = flat.filter((node) => ids.includes(node.id));

    setExpanded([...new Set([...expandedIds, ...ids])]);
    nodes.forEach((node) => {
      if (node.item.hasChildren) load(node);
    });
  };

  const collapse = (id: string) => setExpanded(expandedIds.filter((item) => item !== id));

  const toggle = (node: FlatNode<TreeItem>) => {
    if (!node.expandable) return;

    if (node.expanded) collapse(node.id);
    else expand([node.id]);
  };

  const focusIndex = (index: number) => {
    const node = flat[index];

    if (!node) return;

    setActiveId(node.id);
    setScrollTo(index);
  };

  const select = (index: number, { toggle: toggleOne = false, range = false } = {}) => {
    const node = flat[index];

    if (!node || node.item.disabled || selectionMode === 'none') return;

    if (selectionMode === 'single') {
      setSelected([node.id]);
      setAnchorId(node.id);

      return;
    }

    if (range) {
      const anchor = Math.max(
        0,
        flat.findIndex((item) => item.id === (anchorId ?? node.id)),
      );

      const enabled = new Set(flat.filter((item) => !item.item.disabled).map((item) => item.id));

      setSelected(rangeIds(flat, anchor, index).filter((id) => enabled.has(id)));

      return;
    }

    setAnchorId(node.id);
    setSelected(
      toggleOne
        ? selectedSet.has(node.id)
          ? selectedIds.filter((id) => id !== node.id)
          : [...selectedIds, node.id]
        : [node.id],
    );
  };

  const applyMove = (move: TreeMove) => {
    const next = onMove ? moveNode(items, move) : null;

    if (!next || !onMove) return;

    onMove(move, next);

    const target = locate(items, move.targetId)?.siblings.find((item) => item.id === move.targetId);
    const dragged = locate(items, move.id)?.siblings.find((item) => item.id === move.id);

    if (target && dragged)
      setAnnouncement(strings.tree.moved(dragged.label, target.label, move.position));

    // Положили внутрь свёрнутой ветки — раскрываем её, иначе узел пропадает из вида
    if (move.position === 'inside') setExpanded([...new Set([...expandedIds, move.targetId])]);
  };

  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!active) return;

    if (drag && event.key === 'Escape') {
      cancelDrag();
      event.preventDefault();

      return;
    }

    if (event.altKey && onMove && moveKeys[event.key]) {
      event.preventDefault();

      const move = keyboardMove(items, active.id, moveKeys[event.key]!);

      if (move) applyMove(move);

      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      select(activeIndex);
      onActivate?.(active.id);

      return;
    }

    if (event.key === ' ') {
      event.preventDefault();
      select(activeIndex, { toggle: selectionMode === 'multiple' });

      return;
    }

    if (selectionMode === 'multiple' && (event.ctrlKey || event.metaKey) && event.code === 'KeyA') {
      event.preventDefault();
      setSelected(flat.filter((node) => !node.item.disabled).map((node) => node.id));

      return;
    }

    const action = treeKeyAction(flat, activeIndex, event.key);

    if (action) {
      event.preventDefault();

      if (action.type === 'focus') {
        focusIndex(action.index);

        if (event.shiftKey && selectionMode === 'multiple') select(action.index, { range: true });
      } else if (action.type === 'expand') {
        expand([action.id]);
      } else if (action.type === 'collapse') {
        collapse(action.id);
      } else {
        expand(action.ids);
      }

      return;
    }

    // Поиск набором букв: одна печатная клавиша без модификаторов
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = Date.now();
      const query =
        now - typeahead.current.at < TYPEAHEAD_MS ? typeahead.current.query + event.key : event.key;

      typeahead.current = { query, at: now };

      const found = typeaheadIndex(flat, activeIndex, query);

      if (found >= 0) {
        event.preventDefault();
        focusIndex(found);
      }
    }
  };

  const rowClick = (event: MouseEvent<HTMLDivElement>, index: number) => {
    if (suppressClick.current) {
      suppressClick.current = false;

      return;
    }

    treeRef.current?.focus({ preventScroll: true });
    setActiveId(flat[index]!.id);
    select(index, {
      toggle: event.ctrlKey || event.metaKey,
      range: event.shiftKey && selectionMode === 'multiple',
    });
  };

  // --- Перетаскивание мышью и пальцем -----------------------------------------------------------

  function cancelDrag() {
    const current = session.current;

    if (current?.dragging) {
      treeRef.current?.releasePointerCapture?.(current.pointerId);
      setAnnouncement(strings.tree.moveCancelled);
    }

    session.current = null;
    scrollSpeed.current = 0;
    setDrag(null);
  }

  const pointerDown = (event: PointerEvent<HTMLDivElement>, node: FlatNode<TreeItem>) => {
    if (!onMove || event.button !== 0 || node.item.disabled) return;

    session.current = {
      id: node.id,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      dragging: false,
    };
  };

  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = session.current;

    if (!current || current.pointerId !== event.pointerId) return;

    if (!current.dragging) {
      if (Math.hypot(event.clientX - current.x, event.clientY - current.y) < DRAG_THRESHOLD) return;

      current.dragging = true;
      // Захват — только когда тащат: иначе клик достался бы дереву, а не строке
      treeRef.current?.setPointerCapture?.(event.pointerId);
    }

    const scroller = scrollRef.current;

    if (scroller) {
      const rect = scroller.getBoundingClientRect();

      scrollSpeed.current = autoScrollSpeed(event.clientY, rect.top, rect.bottom);
      if (scrollSpeed.current !== 0) requestAnimationFrame(autoScroll);
    }

    const row = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-tree-row]');
    const targetId = row?.dataset.treeId ?? null;
    const target = targetId ? flat.find((node) => node.id === targetId) : undefined;

    if (!row || !target) {
      setDrag({ id: current.id, targetId: null, position: null });

      return;
    }

    const rect = row.getBoundingClientRect();
    const position = dropZone(event.clientY - rect.top, rect.height, isBranch(target.item));
    const move = { id: current.id, targetId: target.id, position };

    setDrag(
      canMove(items, move)
        ? { id: current.id, targetId: target.id, position }
        : { id: current.id, targetId: null, position: null },
    );
  };

  const autoScroll = () => {
    const scroller = scrollRef.current;

    if (!scroller || !session.current?.dragging || scrollSpeed.current === 0) return;

    scroller.scrollTop += scrollSpeed.current;
    requestAnimationFrame(autoScroll);
  };

  const pointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const current = session.current;

    if (!current || current.pointerId !== event.pointerId) return;

    if (current.dragging) {
      suppressClick.current = true;
      treeRef.current?.releasePointerCapture?.(event.pointerId);

      if (drag?.targetId && drag.position) {
        applyMove({ id: current.id, targetId: drag.targetId, position: drag.position });
      }
    }

    session.current = null;
    scrollSpeed.current = 0;
    setDrag(null);
  };

  const renderRow = (node: FlatNode<TreeItem>, index: number) => {
    const selected = selectedSet.has(node.id);
    const isLoading = loading.has(node.id);
    const state: TreeRowState = {
      level: node.level,
      expanded: node.expanded,
      selected,
      loading: isLoading,
    };

    return (
      <div
        key={node.id}
        id={`${baseId}-${index}`}
        ref={virtual ? windowed.measureElement : undefined}
        role="treeitem"
        aria-level={node.level}
        aria-posinset={node.posinset}
        aria-setsize={node.setsize}
        aria-expanded={node.expandable ? node.expanded : undefined}
        aria-selected={selectionMode === 'none' ? undefined : selected}
        aria-disabled={node.item.disabled || undefined}
        aria-busy={isLoading || undefined}
        aria-label={node.item.label}
        data-tree-row=""
        data-tree-id={node.id}
        data-index={index}
        data-virtual-index={index}
        data-active={node.id === active?.id || undefined}
        data-selected={selected || undefined}
        data-dragging={drag && drag.id === node.id && session.current?.dragging ? true : undefined}
        data-drop={drag?.targetId === node.id ? drag.position : undefined}
        className={styles.row}
        style={{ '--level': node.level - 1 } as CSSProperties}
        onClick={(event) => rowClick(event, index)}
        onDoubleClick={() => onActivate?.(node.id)}
        onPointerDown={(event) => pointerDown(event, node)}
      >
        <span
          className={styles.chevron}
          data-open={node.expanded || undefined}
          onClick={(event) => {
            event.stopPropagation();
            treeRef.current?.focus({ preventScroll: true });
            setActiveId(node.id);
            toggle(node);
          }}
          aria-hidden
        >
          {isLoading ? (
            <Spinner size="sm" />
          ) : (
            node.expandable && <Icon icon={ChevronRight} size="sm" />
          )}
        </span>

        {node.item.icon && <span className={styles.icon}>{node.item.icon}</span>}

        <span className={styles.label}>
          {renderLabel ? renderLabel(node.item, state) : node.item.label}
        </span>

        {failed.has(node.id) && <span className={styles.failed}>{strings.tree.loadFailed}</span>}

        {node.item.meta && <span className={styles.meta}>{node.item.meta}</span>}
      </div>
    );
  };

  const rows = virtual
    ? windowed.items.map((row) => renderRow(flat[row.index]!, row.index))
    : flat.map(renderRow);

  return (
    <div
      ref={scrollRef}
      className={cx(styles.root, className)}
      style={{ height, ...style }}
      {...rest}
    >
      <div
        ref={treeRef}
        role="tree"
        aria-label={label}
        aria-multiselectable={selectionMode === 'multiple' || undefined}
        aria-activedescendant={active ? `${baseId}-${activeIndex}` : undefined}
        aria-describedby={onMove ? hintId : undefined}
        tabIndex={0}
        className={styles.tree}
        data-dragging={drag ? true : undefined}
        style={virtual ? { paddingTop: windowed.before, paddingBottom: windowed.after } : undefined}
        onKeyDown={keyDown}
        onFocus={() => {
          if (!activeId && flat[0]) setActiveId(flat[0].id);
        }}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={cancelDrag}
      >
        {rows}
      </div>

      <VisuallyHidden.Root>
        {onMove && <span id={hintId}>{strings.tree.moveHint}</span>}

        <span aria-live="polite">{announcement}</span>
      </VisuallyHidden.Root>
    </div>
  );
}
