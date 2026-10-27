import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { highlightSegments } from '../combobox/combobox-filter';
import { cx } from '../lib/cx';
import { usePortalContainer } from '../theme/portal-container';

import styles from './suggestion-list.module.css';

export interface SuggestionItem {
  key: string;
  label: string;
  description?: string;
  icon?: ReactNode;
}

export interface SuggestionListProps {
  id: string;
  /** Подпись списка: и заголовок, и aria-label */
  title: string;
  items: readonly SuggestionItem[];
  activeIndex: number;
  optionId: (index: number) => string;
  /** Что подсветить в подписях */
  query?: string;
  loading?: boolean;
  loadingText: string;
  emptyText: string;
  /** К чему крепится список: символ подсказки в поле или вся рамка поиска */
  anchor: DOMRect;
  /** Куда открываться, если хватает места: композер внизу экрана — вверх, поиск — вниз */
  placement: 'top' | 'bottom';
  /** Ширина: число — px, `anchor` — по ширине якоря */
  width?: number | 'anchor';
  onActiveChange: (index: number) => void;
  onChoose: (index: number) => void;
}

const GAP = 4;
const EDGE = 8;
const MAX_HEIGHT = 280;

/** Позиция у края экрана: сверху не влезает — снизу, и наоборот; по горизонтали прижата к экрану */
function position(anchor: DOMRect, placement: 'top' | 'bottom', width: number): CSSProperties {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const roomAbove = anchor.top - GAP - EDGE;
  const roomBelow = viewportHeight - anchor.bottom - GAP - EDGE;
  const up =
    placement === 'top'
      ? roomAbove >= Math.min(MAX_HEIGHT, roomBelow)
      : roomBelow < Math.min(MAX_HEIGHT, roomAbove);
  const left = Math.max(EDGE, Math.min(anchor.left, viewportWidth - width - EDGE));

  return up
    ? {
        left,
        bottom: viewportHeight - anchor.top + GAP,
        width,
        maxHeight: Math.min(MAX_HEIGHT, roomAbove),
      }
    : { left, top: anchor.bottom + GAP, width, maxHeight: Math.min(MAX_HEIGHT, roomBelow) };
}

/**
 * Список подсказок поля (композер, поиск): портал со стеклом у якоря. Фокус остаётся в поле — активный
 * пункт ведёт `aria-activedescendant` поля, поэтому пункты не фокусируются, а `mousedown` по ним не
 * уводит фокус. Не экспортируется: это общая часть двух полей, а не примитив.
 */
export function SuggestionList({
  id,
  title,
  items,
  activeIndex,
  optionId,
  query = '',
  loading,
  loadingText,
  emptyText,
  anchor,
  placement,
  width = 280,
  onActiveChange,
  onChoose,
}: SuggestionListProps) {
  const container = usePortalContainer();
  const listRef = useRef<HTMLUListElement>(null);
  const resolvedWidth = width === 'anchor' ? Math.max(anchor.width, 240) : width;
  const style = position(anchor, placement, resolvedWidth);

  useEffect(() => {
    if (activeIndex < 0) return;

    listRef.current?.querySelector(`[id="${CSS.escape(optionId(activeIndex))}"]`)?.scrollIntoView({
      block: 'nearest',
    });
  }, [activeIndex, optionId]);

  const empty = items.length === 0;

  return createPortal(
    <div className={styles.content} style={style} data-suggestions="">
      <div className={styles.title} aria-hidden>
        {title}
      </div>

      <ul ref={listRef} id={id} role="listbox" aria-label={title} className={styles.list}>
        {items.map((item, index) => (
          <li
            key={item.key}
            id={optionId(index)}
            role="option"
            aria-selected={index === activeIndex}
            className={styles.option}
            data-active={index === activeIndex || undefined}
            onMouseDown={(event) => event.preventDefault()}
            onPointerMove={() => {
              if (index !== activeIndex) onActiveChange(index);
            }}
            onClick={() => onChoose(index)}
          >
            {item.icon && <span className={styles.icon}>{item.icon}</span>}

            <span className={styles.label}>
              {highlightSegments(item.label, query).map((segment, segmentIndex) =>
                segment.match ? (
                  // Куски подписи не переставляются: индекс — стабильный ключ
                  <mark key={segmentIndex} className={styles.match}>
                    {segment.text}
                  </mark>
                ) : (
                  segment.text
                ),
              )}
            </span>

            {item.description && <span className={styles.description}>{item.description}</span>}
          </li>
        ))}
      </ul>

      {empty && (
        <div className={cx(styles.state, loading && styles.loading)} aria-hidden>
          {loading ? loadingText : emptyText}
        </div>
      )}
    </div>,
    container ?? document.body,
  );
}
