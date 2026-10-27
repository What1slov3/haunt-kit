import {
  useImperativeHandle,
  useRef,
  type ComponentPropsWithRef,
  type Key,
  type ReactNode,
  type Ref,
} from 'react';

import { cx } from '../lib/cx';

import { useVirtualWindow } from './use-virtual-window';
import styles from './virtual-list.module.css';
import type { ScrollAlign } from './virtual-list-math';

export type VirtualListAlign = ScrollAlign;

export interface VirtualListHandle {
  /** Прокрутить к строке: start / center / end или auto — ближайшим краем, если не видна */
  scrollToIndex: (index: number, align?: VirtualListAlign) => void;
  /** Вниз до конца; со `stickToBottom` список снова следует за новыми строками */
  scrollToEnd: () => void;
  /** Область прокрутки — для своих проверок и фокуса */
  getElement: () => HTMLDivElement | null;
}

export interface VirtualListProps<T> extends Omit<
  ComponentPropsWithRef<'div'>,
  'children' | 'ref'
> {
  items: readonly T[];
  /** Устойчивый ключ — id, не индекс: по нему кэшируются высоты и держится позиция при подгрузке */
  getKey: (item: T, index: number) => Key;
  /** Строка списка. Отступы между строками — внутри неё: распорки окна считают только высоты строк */
  renderItem: (item: T, index: number) => ReactNode;
  /** Оценка высоты строки до измерения, px; по умолчанию 32 (`--row-default`) */
  estimateSize?: number | ((item: T, index: number) => number);
  /** Строк сверх видимых с каждой стороны; по умолчанию 6 */
  overscan?: number;
  /** Высота области прокрутки; без неё высоту задаёт родитель (флекс, класс) */
  height?: number | string;
  /** Чат: короткий список прижат к низу, открывается внизу, держится низа */
  reverse?: boolean;
  /** Держаться низа, пока пользователь внизу; по умолчанию — как `reverse` */
  stickToBottom?: boolean;
  /** Окно подошло к началу — подгрузить старое (чат) */
  onReachStart?: () => void;
  /** Окно подошло к концу — подгрузить следующую страницу */
  onReachEnd?: () => void;
  /** Порог «у края» для подгрузки, px; по умолчанию 200 */
  reachThreshold?: number;
  /** Над строками внутри прокрутки: «загружаем историю…», начало канала */
  header?: ReactNode;
  /** Под строками внутри прокрутки */
  footer?: ReactNode;
  /** Что показать без строк */
  empty?: ReactNode;
  /** Подпись списка для скринридера */
  label?: string;
  ref?: Ref<VirtualListHandle>;
}

/**
 * Виртуализированный список: в DOM только строки в окне и запас вокруг, высота строк любая (оценка,
 * затем измерение). Своя область прокрутки с тонкой полосой, а не `ScrollArea`: окну нужен прямой доступ к
 * scrollTop и событию прокрутки, а `ScrollArea` прячет вьюпорт и кладёт содержимое в `display: table`.
 */
export function VirtualList<T>({
  items,
  getKey,
  renderItem,
  estimateSize = 32,
  overscan,
  height,
  reverse = false,
  stickToBottom = reverse,
  onReachStart,
  onReachEnd,
  reachThreshold,
  header,
  footer,
  empty,
  label,
  className,
  style,
  ref,
  ...rest
}: VirtualListProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const windowed = useVirtualWindow({
    count: items.length,
    getKey: (index) => getKey(items[index] as T, index),
    estimateSize: (index) =>
      typeof estimateSize === 'number' ? estimateSize : estimateSize(items[index] as T, index),
    scrollRef,
    overscan,
    stickToBottom,
    startAtEnd: reverse || stickToBottom,
    onReachStart,
    onReachEnd,
    reachThreshold,
  });

  useImperativeHandle(
    ref,
    () => ({
      scrollToIndex: windowed.scrollToIndex,
      scrollToEnd: windowed.scrollToEnd,
      getElement: () => scrollRef.current,
    }),
    [windowed.scrollToIndex, windowed.scrollToEnd],
  );

  return (
    <div
      ref={scrollRef}
      // Фокусируемая область прокрутки: список листается с клавиатуры, и сюда уходит фокус строки,
      // которая прокрутилась за окно
      tabIndex={0}
      className={cx(styles.root, reverse && styles.reverse, className)}
      style={{ height, ...style }}
      {...rest}
    >
      {header}

      {items.length === 0 ? (
        empty
      ) : (
        <div
          role="list"
          aria-label={label}
          className={styles.list}
          style={{ paddingTop: windowed.before, paddingBottom: windowed.after }}
        >
          {windowed.items.map((row) => (
            <div
              key={row.key}
              ref={windowed.measureElement}
              role="listitem"
              // В DOM лишь часть строк: размер и позицию скринридер берёт отсюда, а не из соседей
              aria-setsize={items.length}
              aria-posinset={row.index + 1}
              data-virtual-index={row.index}
              className={styles.item}
            >
              {renderItem(items[row.index] as T, row.index)}
            </div>
          ))}
        </div>
      )}

      {footer}
    </div>
  );
}
