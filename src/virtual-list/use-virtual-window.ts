import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Key,
  type RefObject,
} from 'react';

import {
  buildOffsets,
  captureAnchor,
  distanceToEnd,
  offsetAt,
  restoreAnchor,
  scrollTopForIndex,
  shouldReach,
  visibleRange,
  type EdgeState,
  type ScrollAlign,
  type ScrollAnchor,
} from './virtual-list-math';

/*
 * Движок окна для VirtualList и виртуальных режимов DataTable, Combobox, LogView. Разметку не рисует:
 * отдаёт, какие строки показать и какой высоты распорки до и после них, — так одна логика служит и
 * <div role="list">, и <tbody>, и <ul role="listbox">.
 *
 * Распорки, а не абсолютное позиционирование строк: строки остаются в потоке (таблица держит колонки,
 * listbox — свою разметку), а высоту строки задаёт её содержимое. Цена — неточная оценка высоты сдвигает
 * то, что ниже; это гасит поправка прокрутки при измерении (measureCorrection) и якорь при смене данных.
 */

export interface VirtualItem {
  index: number;
  key: Key;
  /** Верх строки от начала списка */
  start: number;
  size: number;
}

export interface VirtualWindowOptions {
  count: number;
  getKey: (index: number) => Key;
  /** Оценка высоты до измерения; измеренная хранится в кэше по ключу */
  estimateSize: (index: number) => number;
  /**
   * Область прокрутки; может появиться позже (список в поповере). Должна быть позиционирована
   * (position: relative) — отступ списка в ней меряется по offsetTop
   */
  scrollRef: RefObject<HTMLElement | null>;
  /** Строк сверх видимых с каждой стороны */
  overscan?: number;
  /** false — рисовать всё: короткий список не платит за измерения */
  enabled?: boolean;
  /** Держаться низа, пока пользователь внизу (чат, журнал) */
  stickToBottom?: boolean;
  /** Открыться внизу; по умолчанию — как stickToBottom */
  startAtEnd?: boolean;
  onReachStart?: () => void;
  onReachEnd?: () => void;
  /** Порог «у края» для подгрузки, px */
  reachThreshold?: number;
}

export interface VirtualWindow {
  items: VirtualItem[];
  /** Высота распорки перед первой нарисованной строкой */
  before: number;
  /** Высота распорки после последней нарисованной строки */
  after: number;
  total: number;
  /** Ref-колбэк строки; у элемента должен быть `data-virtual-index` */
  measureElement: (element: HTMLElement | null) => void | (() => void);
  scrollToIndex: (index: number, align?: ScrollAlign) => void;
  scrollToEnd: () => void;
}

/** Порог «внизу» для прилипания: дробный scrollTop при масштабе экрана не доходит до низа ровно */
const BOTTOM_THRESHOLD = 8;
/** Повторов прокрутки к строке, пока оценки высот заменяются измерениями */
const MAX_SCROLL_ATTEMPTS = 5;

interface PendingScroll {
  index: number;
  align: ScrollAlign;
  attempts: number;
  /** Цель достигнута; запрос доживает до измерений строк */
  settled?: boolean;
}

/**
 * Верх элемента от начала содержимого области прокрутки. По offsetTop, а не getBoundingClientRect: тот
 * учитывает transform предков — поповер появляется с scale, и отступ списка «дышал» бы вместе с
 * анимацией, а окно пересчитывалось бы по кругу. Цепочка offsetParent доходит до области прокрутки,
 * если она позиционирована (position: relative); иначе — по прямоугольникам.
 */
function contentTop(element: HTMLElement, scroller: HTMLElement): number {
  let top = 0;
  let node: Element | null = element;

  while (node instanceof HTMLElement && node !== scroller) {
    top += node.offsetTop;
    node = node.offsetParent;
  }

  if (node === scroller) return top;

  return (
    element.getBoundingClientRect().top -
    scroller.getBoundingClientRect().top -
    scroller.clientTop +
    scroller.scrollTop
  );
}

function borderBoxHeight(entry: ResizeObserverEntry): number {
  const box = entry.borderBoxSize?.[0];

  return box ? box.blockSize : entry.target.getBoundingClientRect().height;
}

export function useVirtualWindow({
  count,
  getKey,
  estimateSize,
  scrollRef,
  overscan = 6,
  enabled = true,
  stickToBottom = false,
  startAtEnd = stickToBottom,
  onReachStart,
  onReachEnd,
  reachThreshold = 200,
}: VirtualWindowOptions): VirtualWindow {
  const [sizes] = useState(() => new Map<Key, number>());
  const [, setVersion] = useState(0);
  const [scroller, setScroller] = useState<HTMLElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewHeight, setViewHeight] = useState(0);
  // Где список начинается внутри области прокрутки: шапка таблицы, отступ, заголовок над строками
  const [margin, setMargin] = useState(0);

  const offsets = buildOffsets(count, (index) => sizes.get(getKey(index)) ?? estimateSize(index));
  const total = offsetAt(offsets, count);
  const range = enabled
    ? visibleRange(offsets, scrollTop - margin, viewHeight, overscan)
    : { start: 0, end: count };

  const items: VirtualItem[] = [];

  for (let index = range.start; index < range.end; index += 1) {
    const start = offsetAt(offsets, index);

    items.push({ index, key: getKey(index), start, size: offsetAt(offsets, index + 1) - start });
  }

  // Последнее отрисованное — для колбэков ResizeObserver и прокрутки, живущих вне рендера
  const latest = useRef({
    offsets,
    range,
    margin,
    count,
    getKey,
    estimateSize,
    enabled,
    stickToBottom,
    onReachStart,
    onReachEnd,
    reachThreshold,
  });
  const elements = useRef(new Set<HTMLElement>());
  const observerRef = useRef<ResizeObserver | null>(null);
  const stuck = useRef(false);
  const anchor = useRef<ScrollAnchor | null>(null);
  const pending = useRef<PendingScroll | null>(null);
  const initialized = useRef(false);
  const previousData = useRef<{ count: number; first?: Key; last?: Key } | null>(null);
  const reach = useRef<{ start: EdgeState; end: EdgeState }>({
    start: { near: false, count: -1 },
    end: { near: false, count: -1 },
  });

  // Без зависимостей нарочно: снимок нужен после каждого коммита; setScroller — только при смене элемента
  // eslint-disable-next-line react-hooks/exhaustive-deps -- см. выше
  useLayoutEffect(() => {
    latest.current = {
      offsets,
      range,
      margin,
      count,
      getKey,
      estimateSize,
      enabled,
      stickToBottom,
      onReachStart,
      onReachEnd,
      reachThreshold,
    };

    // Область прокрутки могла появиться после первого рендера (поповер открылся)
    if (scrollRef.current !== scroller) setScroller(scrollRef.current);
  });

  const checkEdges = useCallback((element: HTMLElement) => {
    const state = latest.current;

    if (element.clientHeight === 0) return;

    const start = {
      near: element.scrollTop - state.margin <= state.reachThreshold,
      count: state.count,
    };
    const end = { near: distanceToEnd(element) <= state.reachThreshold, count: state.count };
    const previous = reach.current;

    reach.current = { start, end };

    if (shouldReach(previous.start, start)) state.onReachStart?.();
    if (shouldReach(previous.end, end)) state.onReachEnd?.();
  }, []);

  const rememberAnchor = useCallback((element: HTMLElement) => {
    const state = latest.current;

    anchor.current = captureAnchor(state.offsets, element.scrollTop - state.margin, state.getKey);
  }, []);

  /** Прокрутка к отложенной строке: оценки заменяются измерениями, поэтому — до совпадения */
  const applyPending = useCallback((element: HTMLElement) => {
    const request = pending.current;

    if (!request) return;

    const state = latest.current;
    const target = scrollTopForIndex(
      state.offsets,
      request.index,
      request.align,
      element.clientHeight,
      element.scrollTop - state.margin,
    );

    if (request.attempts >= MAX_SCROLL_ATTEMPTS) {
      pending.current = null;

      return;
    }

    if (target === null || Math.abs(target + state.margin - element.scrollTop) < 1) {
      // Дошли — но строки в окне ещё измеряются и могут сдвинуть цель. Запрос живёт ещё два кадра:
      // их измерения (ResizeObserver) доводят прокрутку. Дольше нельзя — перебил бы прокрутку человека
      if (!request.settled) {
        request.settled = true;
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (pending.current === request) pending.current = null;
          }),
        );
      }

      return;
    }

    request.attempts += 1;
    element.scrollTop = target + state.margin;
  }, []);

  const getObserver = useCallback(() => {
    if (observerRef.current || typeof ResizeObserver === 'undefined') return observerRef.current;

    observerRef.current = new ResizeObserver((entries) => {
      const state = latest.current;
      const element = scrollRef.current;
      const viewTop = element ? element.scrollTop - state.margin : 0;
      let changed = false;
      let correction = 0;

      for (const entry of entries) {
        if (entry.target === element) {
          setViewHeight(element.clientHeight);
          continue;
        }

        const index = Number((entry.target as HTMLElement).dataset.virtualIndex);

        if (!Number.isInteger(index) || index < 0 || index >= state.count) continue;

        const key = state.getKey(index);
        const size = borderBoxHeight(entry);
        const previous = sizes.get(key) ?? state.estimateSize(index);

        sizes.set(key, size);

        // Порог — сотые доли: дробные высоты (44.23 при оценке 44) копятся по строкам в пиксели
        if (Math.abs(size - previous) < 0.01) continue;

        changed = true;

        // Строка выше окна изменилась — сдвигаем прокрутку, чтобы читаемое не прыгнуло
        if (offsetAt(state.offsets, index) < viewTop) correction += size - previous;
      }

      if (!changed) return;

      // Смещения — сразу, не дожидаясь рендера: событие прокрутки от поправки может прийти раньше,
      // и якорь по старым смещениям при следующей смене данных сдвинул бы окно на эту поправку
      state.offsets = buildOffsets(
        state.count,
        (index) => sizes.get(state.getKey(index)) ?? state.estimateSize(index),
      );

      if (element && stuck.current) {
        element.scrollTop = element.scrollHeight;
      } else if (element && correction !== 0) {
        element.scrollTop += correction;
      }

      if (element) applyPending(element);

      setVersion((version) => version + 1);
    });

    return observerRef.current;
  }, [scrollRef, sizes, applyPending]);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  const measureElement = useCallback(
    (element: HTMLElement | null) => {
      if (!element || !enabled) return;

      const observer = getObserver();
      const nodes = elements.current;

      nodes.add(element);
      observer?.observe(element);

      return () => {
        nodes.delete(element);
        observer?.unobserve(element);

        // Строка с фокусом уходит из окна — фокус на область прокрутки, а не на <body>: иначе
        // клавиатура теряет место в списке
        const area = scrollRef.current;

        if (area && area.tabIndex >= 0 && element.contains(document.activeElement)) {
          area.focus({ preventScroll: true });
        }
      };
    },
    // enabled в зависимостях: при смене режима React заново вызовет ref у уже стоящих строк
    [enabled, getObserver, scrollRef],
  );

  useEffect(() => {
    if (!scroller || !enabled) return;

    let lastTop = scroller.scrollTop;

    const onScroll = () => {
      const top = scroller.scrollTop;

      setScrollTop(top);

      // Отлипает только прокрутка вверх. Событие приходит кадром позже: строки у низа к этому
      // времени уже выросли, и «далеко от низа» по одному расстоянию отлепило бы список зря
      if (distanceToEnd(scroller) <= BOTTOM_THRESHOLD) {
        stuck.current = latest.current.stickToBottom;
      } else if (top < lastTop - 1) {
        stuck.current = false;
      }

      lastTop = top;
      rememberAnchor(scroller);
      checkEdges(scroller);
    };

    scroller.addEventListener('scroll', onScroll, { passive: true });
    getObserver()?.observe(scroller);
    setViewHeight(scroller.clientHeight);

    return () => {
      scroller.removeEventListener('scroll', onScroll);
      observerRef.current?.unobserve(scroller);
    };
  }, [scroller, enabled, getObserver, rememberAnchor, checkEdges]);

  // Каждый коммит: отступ списка, смена данных, отложенная прокрутка, синхронизация с DOM. Без
  // зависимостей нарочно; цикла нет — состояние ставится, только когда DOM разошёлся с ним
  // eslint-disable-next-line react-hooks/exhaustive-deps -- см. выше
  useLayoutEffect(() => {
    if (!scroller || !enabled) return;

    let nextMargin = margin;
    const first = [...elements.current].find(
      (element) => Number(element.dataset.virtualIndex) === range.start,
    );

    if (first) {
      const measured = contentTop(first, scroller) - offsetAt(offsets, range.start);

      if (Math.abs(measured - margin) > 0.5) nextMargin = measured;
    }

    latest.current.margin = nextMargin;

    const data = {
      count,
      first: count > 0 ? getKey(0) : undefined,
      last: count > 0 ? getKey(count - 1) : undefined,
    };
    const previous = previousData.current;
    const dataChanged =
      previous !== null &&
      (previous.count !== data.count ||
        previous.first !== data.first ||
        previous.last !== data.last);

    previousData.current = data;

    if (!initialized.current && count > 0) {
      initialized.current = true;

      if (startAtEnd) {
        scroller.scrollTop = scroller.scrollHeight;
        stuck.current = stickToBottom;
      }
    } else if (dataChanged) {
      if (stuck.current) {
        scroller.scrollTop = scroller.scrollHeight;
      } else if (anchor.current) {
        const keyIndex = new Map<Key, number>();
        const target = restoreAnchor(anchor.current, offsets, (key) => {
          if (keyIndex.size === 0) {
            for (let index = 0; index < count; index += 1) keyIndex.set(getKey(index), index);
          }

          return keyIndex.get(key) ?? -1;
        });

        if (target !== null && Math.abs(target + nextMargin - scroller.scrollTop) > 0.5) {
          scroller.scrollTop = target + nextMargin;
        }
      }
    }

    applyPending(scroller);

    // Список короче окна или его докрутили до низа — снова прилип. Отлипает только прокрутка
    // пользователя: строка, выросшая в этом коммите, иначе отлепила бы список до ResizeObserver
    if (stickToBottom && !stuck.current) {
      stuck.current = distanceToEnd(scroller) <= BOTTOM_THRESHOLD;
    }

    setMargin(nextMargin);
    setScrollTop(scroller.scrollTop);
    setViewHeight(scroller.clientHeight);
    rememberAnchor(scroller);
    checkEdges(scroller);
  });

  const scrollToIndex = useCallback(
    (index: number, align: ScrollAlign = 'auto') => {
      const element = scrollRef.current;

      pending.current = { index, align, attempts: 0 };

      if (!element) return;

      stuck.current = false;
      applyPending(element);
      setScrollTop(element.scrollTop);
    },
    [scrollRef, applyPending],
  );

  const scrollToEnd = useCallback(() => {
    const element = scrollRef.current;

    if (!element) return;

    pending.current = null;
    element.scrollTop = element.scrollHeight;
    stuck.current = latest.current.stickToBottom;
    setScrollTop(element.scrollTop);
  }, [scrollRef]);

  return {
    items,
    before: offsetAt(offsets, range.start),
    after: total - offsetAt(offsets, range.end),
    total,
    measureElement,
    scrollToIndex,
    scrollToEnd,
  };
}
