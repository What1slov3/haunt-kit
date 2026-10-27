import {
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import { ChevronRight, Search } from 'lucide-react';
import { VisuallyHidden } from 'radix-ui';

import { CopyButton } from '../copy-button/copy-button';
import { copyText } from '../copy-button/copy-text';
import { Icon } from '../icon/icon';
import { Input } from '../input/input';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';
import { treeKeyAction } from '../tree/tree-model';

import styles from './json-inspector.module.css';
import {
  copyableValue,
  DEFAULT_CHUNK,
  expandToDepth,
  flattenJson,
  jsonPath,
  previewPrimitive,
  searchJson,
  type JsonRow,
} from './json-model';

export interface JsonInspectorProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** Любое значение: ответ бота, событие, настройки */
  value: unknown;
  /** Сколько уровней раскрыто сразу; 0 — всё свёрнуто */
  defaultExpandDepth?: number;
  /** Поле поиска по ключам */
  search?: boolean;
  /** Массив длиннее — кусками по столько элементов */
  chunkSize?: number;
  /** Кнопки «копировать путь» и «копировать значение» у строки */
  copyable?: boolean;
  /** Подпись дерева для скринридера; по умолчанию «Значение» */
  label?: string;
  /** Высота, после которой дерево прокручивается */
  maxHeight?: number | string;
}

/**
 * Инспектор значения в духе консоли: моно, типы цветом через общие `--code-*` (как подсветка CodeBlock),
 * раскрытие с клавиатуры по WAI-ARIA tree (та же модель, что у Tree), большие массивы — кусками
 * `[0…99]`. Ctrl+C копирует значение строки, Ctrl+Shift+C — её путь `$.a[0]`.
 */
export function JsonInspector({
  value,
  defaultExpandDepth = 1,
  search = false,
  chunkSize = DEFAULT_CHUNK,
  copyable = true,
  label,
  maxHeight,
  className,
  ...rest
}: JsonInspectorProps) {
  const strings = useUiStrings();
  const baseId = useId();
  const treeRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() =>
    expandToDepth(value, defaultExpandDepth, { chunkSize }),
  );
  const [query, setQuery] = useState('');
  // Ветки, которые свернули поверх раскрытого поиском; новый запрос начинает с чистого листа
  const [closed, setClosed] = useState<ReadonlySet<string>>(() => new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const found = searchJson(value, query, { chunkSize });
  const visible = query.trim()
    ? new Set([...expanded, ...[...found.expand].filter((id) => !closed.has(id))])
    : expanded;
  const rows = flattenJson(value, visible, { chunkSize });
  const activeIndex = Math.max(
    0,
    rows.findIndex((row) => row.id === activeId),
  );
  const active = rows[activeIndex];

  const update = (set: ReadonlySet<string>, ids: string[], add: boolean) => {
    const next = new Set(set);

    for (const id of ids) {
      if (add) next.add(id);
      else next.delete(id);
    }

    return next;
  };

  const setOpen = (ids: string[], open: boolean) => {
    setExpanded((current) => update(current, ids, open));
    setClosed((current) => update(current, ids, !open));
  };

  const collapse = (id: string) => setOpen([id], false);

  const copy = async (text: string, message: string) => {
    if (await copyText(text)) setAnnouncement(message);
  };

  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!active) return;

    if ((event.ctrlKey || event.metaKey) && event.code === 'KeyC') {
      event.preventDefault();

      if (event.shiftKey) void copy(jsonPath(active.path), strings.jsonInspector.pathCopied);
      else void copy(copyableValue(active.value), strings.jsonInspector.valueCopied);

      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      if (!active.expandable) return;

      event.preventDefault();
      if (active.expanded) collapse(active.id);
      else setOpen([active.id], true);

      return;
    }

    const action = treeKeyAction(rows, activeIndex, event.key);

    if (!action) return;

    event.preventDefault();

    if (action.type === 'focus') {
      setActiveId(rows[action.index]!.id);
      treeRef.current
        ?.querySelector(`[data-index="${action.index}"]`)
        ?.scrollIntoView({ block: 'nearest' });
    } else if (action.type === 'expand') {
      setOpen([action.id], true);
    } else if (action.type === 'collapse') {
      collapse(action.id);
    } else {
      setOpen(action.ids, true);
    }
  };

  return (
    <div className={cx(styles.root, className)} {...rest}>
      {search && (
        <div className={styles.search}>
          <Input
            size="sm"
            fullWidth
            mono
            value={query}
            placeholder={strings.jsonInspector.search}
            aria-label={strings.jsonInspector.search}
            startSlot={<Icon icon={Search} size="sm" />}
            onChange={(event) => {
              setQuery(event.target.value);
              setClosed(new Set());
            }}
          />

          {query.trim() && (
            <span className={styles.count} aria-live="polite">
              {found.matches.size
                ? strings.jsonInspector.matches(found.matches.size)
                : strings.jsonInspector.noMatches}
            </span>
          )}
        </div>
      )}

      <div
        ref={treeRef}
        role="tree"
        aria-label={label ?? strings.jsonInspector.label}
        aria-activedescendant={active ? `${baseId}-${activeIndex}` : undefined}
        tabIndex={0}
        className={styles.tree}
        style={{ maxHeight }}
        onKeyDown={keyDown}
        onFocus={() => {
          if (!activeId && rows[0]) setActiveId(rows[0].id);
        }}
      >
        {rows.map((row, index) => (
          <div
            key={row.id}
            id={`${baseId}-${index}`}
            role="treeitem"
            aria-level={row.level}
            aria-posinset={row.posinset}
            aria-setsize={row.setsize}
            aria-expanded={row.expandable ? row.expanded : undefined}
            aria-selected={row.id === active?.id}
            data-index={index}
            data-active={row.id === active?.id || undefined}
            className={styles.row}
            style={{ '--depth': row.level - 1 } as CSSProperties}
            onClick={() => {
              treeRef.current?.focus({ preventScroll: true });
              setActiveId(row.id);

              if (!row.expandable) return;
              if (row.expanded) collapse(row.id);
              else setOpen([row.id], true);
            }}
          >
            <span className={styles.chevron} data-open={row.expanded || undefined} aria-hidden>
              {row.expandable && <Icon icon={ChevronRight} size="xs" />}
            </span>

            <RowContent row={row} matched={found.matches.has(row.id)} query={query} />

            {copyable && row.chunk === null && (
              <span className={styles.actions}>
                <CopyButton
                  size="xs"
                  tabIndex={-1}
                  value={() => jsonPath(row.path)}
                  label={strings.jsonInspector.copyPath}
                  onClick={(event) => event.stopPropagation()}
                />
                <CopyButton
                  size="xs"
                  tabIndex={-1}
                  value={() => copyableValue(row.value)}
                  label={strings.jsonInspector.copyValue}
                  onClick={(event) => event.stopPropagation()}
                />
              </span>
            )}
          </div>
        ))}
      </div>

      <VisuallyHidden.Root>
        <span aria-live="polite">{announcement}</span>
      </VisuallyHidden.Root>
    </div>
  );
}

function Highlighted({ text, query }: { text: string; query: string }) {
  const needle = query.trim().toLocaleLowerCase();
  const at = needle ? text.toLocaleLowerCase().indexOf(needle) : -1;

  if (at < 0) return <>{text}</>;

  return (
    <>
      {text.slice(0, at)}
      <mark className={styles.mark}>{text.slice(at, at + needle.length)}</mark>
      {text.slice(at + needle.length)}
    </>
  );
}

function RowContent({ row, matched, query }: { row: JsonRow; matched: boolean; query: string }) {
  const strings = useUiStrings();

  if (row.chunk) {
    return (
      <span className={styles.chunk}>
        [{row.chunk[0]}…{row.chunk[1]}]
      </span>
    );
  }

  const key: ReactNode =
    row.key === null ? null : typeof row.key === 'number' ? (
      <span className={styles.index}>{row.key}</span>
    ) : (
      <span className={styles.key}>
        {matched ? <Highlighted text={row.key} query={query} /> : row.key}
      </span>
    );

  const summary =
    row.kind === 'array'
      ? strings.jsonInspector.items(row.size)
      : row.kind === 'object'
        ? strings.jsonInspector.keys(row.size)
        : null;

  return (
    <>
      {key}

      {key !== null && <span className={styles.colon}>:</span>}

      {summary !== null ? (
        <span className={styles.summary}>
          <span className={styles.bracket}>{row.kind === 'array' ? '[' : '{'}</span>
          <span className={styles.size}>{summary}</span>
          <span className={styles.bracket}>{row.kind === 'array' ? ']' : '}'}</span>
        </span>
      ) : (
        <span className={styles.value} data-kind={row.kind}>
          {previewPrimitive(row.value)}
        </span>
      )}
    </>
  );
}
