/*
 * История команд строки ввода — как в терминале: ↑ — предыдущая, ↓ — следующая, ниже последней —
 * черновик, который человек набирал до того, как полез в историю. Состояние — значение, функции чистые.
 */

export interface CommandHistory {
  /** От старых к новым */
  entries: readonly string[];
  /** Какая запись сейчас в поле; null — черновик */
  index: number | null;
  /** Что было в поле до первого ↑ */
  draft: string;
}

export interface HistoryStep {
  history: CommandHistory;
  /** Что поставить в поле */
  value: string;
}

export function createHistory(entries: readonly string[] = []): CommandHistory {
  return { entries, index: null, draft: '' };
}

/** ↑: запись старше. В начале пути запоминает черновик; на самой старой — null, поле не меняется */
export function historyPrevious(history: CommandHistory, current: string): HistoryStep | null {
  const { entries, index } = history;

  if (entries.length === 0 || index === 0) return null;

  const next = index === null ? entries.length - 1 : index - 1;
  const draft = index === null ? current : history.draft;

  return { history: { entries, index: next, draft }, value: entries[next] ?? '' };
}

/** ↓: запись новее, после самой новой — черновик; уже на черновике — null */
export function historyNext(history: CommandHistory): HistoryStep | null {
  const { entries, index, draft } = history;

  if (index === null) return null;

  if (index >= entries.length - 1) {
    return { history: { entries, index: null, draft: '' }, value: draft };
  }

  return { history: { entries, index: index + 1, draft }, value: entries[index + 1] ?? '' };
}

/**
 * Отправленная команда — в конец истории. Повтор последней не дублируется (как `ignoredups` в bash),
 * старые уходят за `limit`. Черновик сброшен: следующий ↑ начинается с новой команды.
 */
export function pushCommand(
  history: CommandHistory,
  command: string,
  limit: number,
): CommandHistory {
  if (limit <= 0) return createHistory();

  const entries =
    history.entries.at(-1) === command ? history.entries : [...history.entries, command];

  return createHistory(entries.length > limit ? entries.slice(entries.length - limit) : entries);
}
