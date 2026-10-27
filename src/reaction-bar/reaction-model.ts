export interface ReactionItem {
  /** Символ эмодзи или id своего эмодзи пространства — ключ реакции */
  emoji: string;
  count: number;
  /** Я тоже поставил эту реакцию */
  mine?: boolean;
  /** Картинка своего эмодзи пространства — вместо символа */
  imageSrc?: string;
  /** Название для скринридера и подсказки: «огонь»; без него — сам символ */
  name?: string;
  /** Кто поставил — первые несколько имён для подсказки; остальные — «и ещё N» по `count` */
  users?: readonly string[];
}

/** Частые реакции быстрым рядом, пока приложение не передало свои */
export const DEFAULT_QUICK_REACTIONS: readonly string[] = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

/**
 * Список после нажатия на реакцию — для оптимистичного обновления до ответа сервера: своя ставится или
 * снимается, счётчик меняется на один, реакция без голосов уходит, новая встаёт в конец.
 */
export function toggleReaction(
  reactions: readonly ReactionItem[],
  emoji: string,
  mine: boolean,
): ReactionItem[] {
  const index = reactions.findIndex((reaction) => reaction.emoji === emoji);
  const current = reactions[index];

  if (!current) return mine ? [...reactions, { emoji, count: 1, mine: true }] : [...reactions];
  if (Boolean(current.mine) === mine) return [...reactions];

  const count = Math.max(0, current.count + (mine ? 1 : -1));

  if (count === 0) return reactions.filter((_, i) => i !== index);

  return reactions.map((reaction, i) => (i === index ? { ...reaction, count, mine } : reaction));
}
