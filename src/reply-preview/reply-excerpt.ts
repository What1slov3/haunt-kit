/** Знак, которым закрыт спойлер в цитате: текст под ним не должен утечь в превью ответа */
const SPOILER_MASK = '█';

/**
 * Первая строка сообщения для цитаты ответа: без разметки блоков (цитата, заголовок, список, ограда кода) и
 * строк, без ссылок-обёрток и знаков выделения; спойлер `||…||` закрыт знаками. Пустая строка — текста нет
 * (только вложения).
 */
export function replyExcerpt(text: string): string {
  const lines = text.split(/\r?\n/);
  let inFence = false;

  for (const raw of lines) {
    const line = raw.trim();

    if (/^(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }

    // Код внутри ограды — тоже текст сообщения: его первая строка лучше, чем ничего
    const cleaned = inFence ? line : cleanLine(line);

    if (cleaned) return cleaned;
  }

  return '';
}

function cleanLine(line: string): string {
  return (
    line
      // Разметка блока в начале строки: «> », «## », «- », «* », «1. »
      .replace(/^(?:>\s*)+/, '')
      .replace(/^#{1,6}\s+/, '')
      .replace(/^(?:[-*+]|\d+[.)])\s+/, '')
      .replace(/\|\|(.+?)\|\|/g, (_, hidden: string) =>
        SPOILER_MASK.repeat(Math.min(Math.max(hidden.length, 3), 12)),
      )
      // Ссылка и картинка — их подпись
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/(\*\*|__|~~|\*|_|`)(.+?)\1/g, '$2')
      .replace(/\s+/g, ' ')
      .trim()
  );
}
