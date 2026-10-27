import type { ComposerDoc, ComposerSelection } from './composer-model';

/*
 * Своя история правок: браузерная отмена в contenteditable знает только о DOM-мутациях, а их делаем мы
 * сами (beforeinput отменён), поэтому Ctrl+Z браузера здесь пуст. Набор подряд сливается в один шаг —
 * отмена убирает слово, а не букву; пробел и перевод строки закрывают шаг, пауза дольше секунды тоже.
 */

export interface ComposerHistoryEntry {
  doc: ComposerDoc;
  selection: ComposerSelection;
}

/** insert — набор, delete — стирание: подряд сливаются; other — вставка, токен, разметка — всегда шаг */
export type ComposerEditKind = 'insert' | 'delete' | 'other';

export interface ComposerHistory {
  past: readonly ComposerHistoryEntry[];
  future: readonly ComposerHistoryEntry[];
  lastKind: ComposerEditKind | null;
  lastTime: number;
  /** Последний набор кончился пробелом — следующий символ начинает новый шаг */
  closed: boolean;
}

export const MERGE_WINDOW_MS = 1000;
export const HISTORY_LIMIT = 100;

export const emptyHistory: ComposerHistory = {
  past: [],
  future: [],
  lastKind: null,
  lastTime: 0,
  closed: true,
};

export interface ComposerEdit {
  kind: ComposerEditKind;
  /** Вставленный текст — по нему видно, закрывает ли он шаг */
  text?: string;
}

/** Запомнить состояние до правки; слитая правка не добавляет шаг — точкой отмены остаётся начало серии */
export function recordEdit(
  history: ComposerHistory,
  before: ComposerHistoryEntry,
  edit: ComposerEdit,
  now: number,
): ComposerHistory {
  const merge =
    edit.kind !== 'other' &&
    edit.kind === history.lastKind &&
    !history.closed &&
    now - history.lastTime < MERGE_WINDOW_MS;
  const past = merge ? history.past : [...history.past, before].slice(-HISTORY_LIMIT);

  return {
    past,
    future: [],
    lastKind: edit.kind,
    lastTime: now,
    closed: edit.kind === 'other' || (edit.kind === 'insert' && /\s$/u.test(edit.text ?? '')),
  };
}

export function undoHistory(
  history: ComposerHistory,
  current: ComposerHistoryEntry,
): { history: ComposerHistory; entry: ComposerHistoryEntry } | null {
  const entry = history.past.at(-1);

  if (!entry) return null;

  return {
    entry,
    history: {
      past: history.past.slice(0, -1),
      future: [...history.future, current],
      lastKind: null,
      lastTime: 0,
      closed: true,
    },
  };
}

export function redoHistory(
  history: ComposerHistory,
  current: ComposerHistoryEntry,
): { history: ComposerHistory; entry: ComposerHistoryEntry } | null {
  const entry = history.future.at(-1);

  if (!entry) return null;

  return {
    entry,
    history: {
      past: [...history.past, current],
      future: history.future.slice(0, -1),
      lastKind: null,
      lastTime: 0,
      closed: true,
    },
  };
}
