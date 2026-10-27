import { useState, type ComponentPropsWithRef, type ReactNode } from 'react';

import { ChevronsUpDown } from 'lucide-react';
import { VisuallyHidden } from 'radix-ui';
import type { ThemedToken } from 'shiki/core';

import { CodeLine } from '../code-block/code-line';
import { useHighlight } from '../code-block/use-highlight';
import { Icon } from '../icon/icon';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';

import {
  buildRows,
  diffLines,
  diffStats,
  diffWords,
  pairWordChanges,
  splitRows,
  type DiffFold,
  type DiffLine,
  type DiffRow,
  type DiffSegment,
} from './diff';
import styles from './diff-view.module.css';

export type DiffViewMode = 'unified' | 'split' | 'words';

export interface DiffViewProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  oldText: string;
  newText: string;
  /** unified — строки подряд, split — две колонки, words — текст с правками по словам (история сообщения) */
  mode?: DiffViewMode;
  /** Неизменённых строк вокруг правки; остальное сворачивается */
  context?: number;
  /** Сворачивать длинные неизменённые участки; по умолчанию — да */
  collapse?: boolean;
  /** Номера строк слева */
  lineNumbers?: boolean;
  /** Подсветка синтаксиса (shiki, лениво) — язык как у CodeBlock; без него — подсветка изменённых слов */
  language?: string;
  /** Подписи колонок split и шапки: «Было» / «Стало» */
  oldLabel?: ReactNode;
  newLabel?: ReactNode;
  /** Шапка со счётчиком «+3 −1» */
  stats?: boolean;
  /** Высота, после которой блок прокручивается */
  maxHeight?: number | string;
}

/**
 * Разница двух текстов: построчно (unified и split) с номерами, подсветкой добавленного и удалённого и
 * свёрткой неизменённых участков — или по словам, для истории правки сообщения. Алгоритм — свой Майерс
 * (diff.ts), без зависимостей. Знаки `+` / `−` в колонке — не украшение: без цвета правку видно по ним.
 */
export function DiffView({
  oldText,
  newText,
  mode = 'unified',
  context = 3,
  collapse = true,
  lineNumbers = true,
  language,
  oldLabel,
  newLabel,
  stats = true,
  maxHeight,
  className,
  ...rest
}: DiffViewProps) {
  const strings = useUiStrings();
  const [openFolds, setOpenFolds] = useState<ReadonlySet<number>>(() => new Set());
  const highlight = mode !== 'words' && language !== undefined;
  const oldTokens = useHighlight(oldText, language, highlight);
  const newTokens = useHighlight(newText, language, highlight);

  if (mode === 'words') {
    const segments = diffWords(oldText, newText);
    const changed = segments.some((segment) => segment.type !== 'equal');

    return (
      <div className={cx(styles.root, styles.wordsRoot, className)} {...rest}>
        <p className={styles.words}>{changed ? <Segments segments={segments} /> : newText}</p>
      </div>
    );
  }

  const ops = diffLines(oldText, newText);
  const { added, removed } = diffStats(ops);
  const rows = buildRows(ops, context, collapse).flatMap((row): DiffRow[] =>
    row.kind === 'fold' && openFolds.has(row.id) ? row.lines : [row],
  );
  const words = highlight ? null : pairWordChanges(rows);

  // Удалённая строка — токены старого текста, остальные — нового: грамматике нужен контекст всего файла
  const tokensFor = (line: DiffLine): ThemedToken[] | undefined =>
    line.type === 'delete' ? oldTokens?.[line.oldNumber! - 1] : newTokens?.[line.newNumber! - 1];

  const content = (line: DiffLine) => {
    const segments = words?.get(line);

    return segments ? (
      <Segments segments={segments} />
    ) : (
      <CodeLine text={line.text} tokens={tokensFor(line)} />
    );
  };

  const openFold = (fold: DiffFold) => setOpenFolds((current) => new Set(current).add(fold.id));

  const foldRow = (fold: DiffFold, columns: number) => (
    <tr key={`fold-${fold.id}`} className={styles.foldRow}>
      <td colSpan={columns}>
        <button type="button" className={styles.fold} onClick={() => openFold(fold)}>
          <Icon icon={ChevronsUpDown} size="xs" />

          {strings.diffView.unchanged(fold.lines.length)}
        </button>
      </td>
    </tr>
  );

  const typeOf = (line: DiffLine | null) => line?.type ?? 'empty';

  const sign = (line: DiffLine | null) => (
    <td className={styles.sign} data-type={typeOf(line)} aria-hidden>
      {line?.type === 'insert' ? '+' : line?.type === 'delete' ? '−' : ''}
    </td>
  );

  const code = (line: DiffLine | null) => (
    <td className={styles.code} data-type={typeOf(line)}>
      {line && line.type !== 'equal' && (
        <VisuallyHidden.Root>
          {line.type === 'insert' ? strings.diffView.added : strings.diffView.removed}
        </VisuallyHidden.Root>
      )}

      {line ? content(line) : null}
    </td>
  );

  const number = (value: number | null | undefined, line: DiffLine | null) =>
    lineNumbers ? (
      <td className={styles.number} data-type={typeOf(line)} aria-hidden>
        {value ?? ''}
      </td>
    ) : null;

  return (
    <div className={cx(styles.root, className)} {...rest}>
      {(stats || mode === 'split') && (
        <div className={styles.header}>
          {mode === 'split' ? (
            <>
              <span className={styles.side}>{oldLabel ?? strings.diffView.oldLabel}</span>
              <span className={styles.side}>{newLabel ?? strings.diffView.newLabel}</span>
            </>
          ) : (
            <span className={styles.side}>
              {oldLabel ?? strings.diffView.oldLabel} → {newLabel ?? strings.diffView.newLabel}
            </span>
          )}

          {stats && (
            <span className={styles.stats}>
              <span className={styles.statAdded}>+{added}</span>
              <span className={styles.statRemoved}>−{removed}</span>
              <VisuallyHidden.Root>{strings.diffView.summary(added, removed)}</VisuallyHidden.Root>
            </span>
          )}
        </div>
      )}

      <div className={styles.scroll} style={{ maxHeight }} tabIndex={0}>
        {ops.every((op) => op.type === 'equal') ? (
          <div className={styles.same}>{strings.diffView.noChanges}</div>
        ) : (
          <table className={cx(styles.table, mode === 'split' && styles.split)}>
            <tbody>
              {mode === 'split'
                ? splitRows(rows).map((row, index) =>
                    row.kind === 'fold' ? (
                      foldRow(row, lineNumbers ? 6 : 4)
                    ) : (
                      // Строки не переставляются внутри рендера: позиция — стабильный ключ
                      <tr key={index}>
                        {number(row.left?.oldNumber, row.left)}
                        {sign(row.left)}
                        {code(row.left)}
                        {number(row.right?.newNumber, row.right)}
                        {sign(row.right)}
                        {code(row.right)}
                      </tr>
                    ),
                  )
                : rows.map((row, index) =>
                    row.kind === 'fold' ? (
                      foldRow(row, lineNumbers ? 4 : 2)
                    ) : (
                      <tr key={index}>
                        {number(row.oldNumber, row)}
                        {number(row.newNumber, row)}
                        {sign(row)}
                        {code(row)}
                      </tr>
                    ),
                  )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Segments({ segments }: { segments: readonly DiffSegment[] }) {
  const strings = useUiStrings();

  // Куски не переставляются внутри рендера: позиция — стабильный ключ
  return (
    <>
      {segments.map((segment, index) =>
        segment.type === 'equal' ? (
          <span key={index}>{segment.text}</span>
        ) : segment.type === 'insert' ? (
          <ins key={index} className={styles.ins}>
            <VisuallyHidden.Root>{strings.diffView.addedWords}</VisuallyHidden.Root>
            {segment.text}
          </ins>
        ) : (
          <del key={index} className={styles.del}>
            <VisuallyHidden.Root>{strings.diffView.removedWords}</VisuallyHidden.Root>
            {segment.text}
          </del>
        ),
      )}
    </>
  );
}
