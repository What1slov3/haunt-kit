export interface PollVotes {
  id: string;
  votes: number;
}

export interface PollResult {
  id: string;
  votes: number;
  /** Целый процент для полосы и подписи */
  percent: number;
  /** Больше всех голосов (ничья — у всех лидеров) */
  leading: boolean;
}

export interface PollResultsOptions {
  /**
   * Сколько человек проголосовало. Задано при множественном выборе — проценты от людей, а не от голосов,
   * и в сумме дают больше 100: «за вариант — 60 % участников». Без него — доли от суммы голосов
   */
  voters?: number;
}

/**
 * Итоги опроса. Доли от суммы голосов округляются наибольшим остатком: проценты складываются ровно в 100,
 * а не в 99 или 101, как при обычном округлении трёх равных вариантов.
 */
export function pollResults(
  options: readonly PollVotes[],
  { voters }: PollResultsOptions = {},
): PollResult[] {
  const votes = options.map((option) => Math.max(0, option.votes));
  const top = Math.max(0, ...votes);
  const sum = votes.reduce((total, value) => total + value, 0);
  const leading = (value: number) => top > 0 && value === top;

  if (voters !== undefined) {
    return options.map((option, i) => ({
      id: option.id,
      votes: votes[i]!,
      percent: voters > 0 ? Math.round((votes[i]! / voters) * 100) : 0,
      leading: leading(votes[i]!),
    }));
  }

  if (sum === 0) {
    return options.map((option) => ({ id: option.id, votes: 0, percent: 0, leading: false }));
  }

  const raw = votes.map((value) => (value / sum) * 100);
  const percents = raw.map((value) => Math.floor(value));
  let left = 100 - percents.reduce((total, value) => total + value, 0);

  // Остаток — тем, у кого дробная часть больше; при равных — тому, кто выше в списке
  const byRemainder = raw
    .map((value, i) => ({ i, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.i - b.i);

  for (const { i } of byRemainder) {
    if (left <= 0) break;

    percents[i] = percents[i]! + 1;
    left -= 1;
  }

  return options.map((option, i) => ({
    id: option.id,
    votes: votes[i]!,
    percent: percents[i]!,
    leading: leading(votes[i]!),
  }));
}

export interface ChoiceOptions {
  multiple?: boolean;
  /** Не больше стольких вариантов при множественном выборе */
  max?: number;
}

/**
 * Выбор варианта до голосования: один — замена, несколько — переключение. Сверх `max` новый вариант
 * не добавляется: молча снять чужой выбор хуже, чем не дать выбрать ещё один.
 */
export function toggleChoice(
  selected: readonly string[],
  id: string,
  { multiple, max }: ChoiceOptions = {},
): string[] {
  if (!multiple) return [id];
  if (selected.includes(id)) return selected.filter((value) => value !== id);
  if (max !== undefined && selected.length >= max) return [...selected];

  return [...selected, id];
}
