import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import { VisuallyHidden } from 'radix-ui';

import { Caret } from '../caret/caret';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';

import { pagerKey, pagerPercent, pagerStep, type PagerAction } from './pager-model';
import styles from './pager.module.css';

export interface PagerProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** Строки вывода: текст или разметка строки */
  lines: readonly ReactNode[];
  /** Строк на странице */
  pageSize?: number;
  /** Подпись области для скринридера */
  label?: string;
  /** Высота области: новые страницы прокручиваются в начало; без неё вывод растёт вниз */
  height?: CSSProperties['maxHeight'];
  /** Свернули до первой страницы (`q`, Esc) */
  onCollapse?: () => void;
}

/**
 * Постраничный вывод, как `more`: первая страница, внизу `-- ещё (42%) --`. Область в фокусе: Пробел —
 * следующая страница, Enter / ↓ — строка, `b` — назад, `G` — всё, `q` / Esc — свернуть до первой. Строка
 * «ещё» — кнопка для мыши. Как в терминале, фокус виден не рамкой, а строкой состояния в цвете акцента и
 * блочным курсором после неё. Вывод моно и при `data-tui="off"`: это содержимое; знаки `--` гаснут.
 */
export function Pager({
  lines,
  pageSize = 10,
  label,
  height,
  onCollapse,
  className,
  ...rest
}: PagerProps) {
  const strings = useUiStrings().pager;
  const hintId = useId();
  const viewRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [shownState, setShown] = useState(() => Math.min(pageSize, lines.length));
  // Строк стало меньше (новый вывод) — показано не больше, чем есть
  const shown = Math.min(shownState, lines.length);
  const previous = useRef(shown);
  const done = shown >= lines.length;
  const percent = pagerPercent(shown, lines.length);

  // Новая страница в ограниченной области — её первая строка наверх, как прокрутка экрана в more
  useEffect(() => {
    const view = viewRef.current;
    const from = previous.current;

    previous.current = shown;

    if (!view || height === undefined || shown <= from) return;

    const line = lineRefs.current[from];

    if (line) view.scrollTop = line.offsetTop;
  }, [shown, height]);

  const run = (action: PagerAction) => {
    const next = pagerStep(shown, lines.length, pageSize, action);

    if (action === 'collapse') {
      viewRef.current?.scrollTo?.({ top: 0 });
      onCollapse?.();
    }

    setShown(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const action = pagerKey(event.key);

    if (!action) return;

    event.preventDefault();
    run(action);
  };

  return (
    <div className={cx(styles.root, className)} {...rest}>
      <div
        ref={viewRef}
        role="region"
        aria-label={label ?? strings.label}
        aria-describedby={hintId}
        tabIndex={0}
        className={styles.view}
        style={{ maxHeight: height }}
        onKeyDown={onKeyDown}
      >
        {lines.slice(0, shown).map((line, index) => (
          <div
            key={index}
            ref={(node) => {
              lineRefs.current[index] = node;
            }}
            className={styles.line}
          >
            {line}
          </div>
        ))}
      </div>

      <div className={styles.status}>
        {done ? (
          <span className={styles.end}>{strings.end}</span>
        ) : (
          <button type="button" className={styles.more} onClick={() => run('page')}>
            {strings.more(percent)}
          </button>
        )}

        <Caret className={styles.cursor} />
      </div>

      <VisuallyHidden.Root id={hintId}>{strings.hint}</VisuallyHidden.Root>
    </div>
  );
}
