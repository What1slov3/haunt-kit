/*
 * Поиск и клавиатурная навигация пикера — чистые функции без React. Поиск ранжирует как палитра команд:
 * человек набирает начало слова и ждёт нужный эмодзи первым, а не где-то в середине сетки.
 */

import { normalize } from '../command-palette/command-filter';

import type { EmojiCategory, EmojiItem } from './emoji-types';

const SCORE = {
  exact: 100,
  shortcodePrefix: 80,
  namePrefix: 75,
  wordPrefix: 65,
  keywordExact: 60,
  keywordPrefix: 50,
  substring: 30,
} as const;

/** Начала слов: строка целиком и всё после пробела, `_`, `-` */
function wordPrefix(text: string, token: string): boolean {
  return text.split(/[\s_-]+/).some((word) => word.startsWith(token));
}

function scoreToken(item: EmojiItem, token: string): number {
  const shortcode = item.shortcode.toLowerCase();
  const name = normalize(item.name);

  if (shortcode === token || name === token || item.char === token) return SCORE.exact;
  if (shortcode.startsWith(token)) return SCORE.shortcodePrefix;
  if (name.startsWith(token)) return SCORE.namePrefix;
  if (wordPrefix(shortcode, token) || wordPrefix(name, token)) return SCORE.wordPrefix;

  let best = 0;

  for (const keyword of item.keywords) {
    const word = normalize(keyword);

    if (word === token) return SCORE.keywordExact;
    if (word.startsWith(token)) best = SCORE.keywordPrefix;
  }

  if (best) return best;
  if (shortcode.includes(token) || name.includes(token)) return SCORE.substring;

  return 0;
}

/** `:smi` и `smi:` ищут как `smi`: человек начинает с двоеточия по привычке шорткодов */
export function emojiQueryTokens(query: string): string[] {
  return normalize(query)
    .replace(/^:+|:+$/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Эмодзи, у которых каждое слово запроса совпало (шорткод, название, ключевые слова). Порядок — по худшему
 * из совпадений слов, при равенстве — порядок набора. Пустой запрос — пустой список.
 */
export function searchEmoji(
  categories: readonly EmojiCategory[],
  query: string,
  limit = 80,
): EmojiItem[] {
  const tokens = emojiQueryTokens(query);

  if (tokens.length === 0) return [];

  const ranked: Array<{ item: EmojiItem; score: number; order: number }> = [];
  let order = 0;

  for (const category of categories) {
    for (const item of category.emojis) {
      let score = Infinity;

      for (const token of tokens) {
        score = Math.min(score, scoreToken(item, token));

        if (score === 0) break;
      }

      if (score > 0) ranked.push({ item, score, order });

      order++;
    }
  }

  return ranked
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, limit)
    .map((entry) => entry.item);
}

export type GridKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | 'Home' | 'End';

/** Ряды сетки: каждый раздел начинается с нового ряда, последний ряд раздела может быть короче */
export function gridRows(sectionSizes: readonly number[], columns: number) {
  const rows: Array<{ start: number; length: number }> = [];
  let start = 0;

  for (const size of sectionSizes) {
    for (let offset = 0; offset < size; offset += columns) {
      rows.push({ start: start + offset, length: Math.min(columns, size - offset) });
    }

    start += size;
  }

  return rows;
}

/**
 * Следующая ячейка по клавише. Влево / вправо — сквозь ряды и разделы, вверх / вниз — тот же столбец
 * соседнего ряда (в коротком ряду — его последняя ячейка), Home / End — края ряда, с Ctrl — края сетки.
 * `-1` — вверх из первого ряда: фокус уходит в поле поиска.
 */
export function moveInGrid(
  sectionSizes: readonly number[],
  columns: number,
  index: number,
  key: GridKey,
  ctrl = false,
): number {
  const rows = gridRows(sectionSizes, columns);
  const total = sectionSizes.reduce((sum, size) => sum + size, 0);

  if (total === 0) return -1;

  const current = Math.min(Math.max(index, 0), total - 1);
  const row = rows.findIndex((r) => current < r.start + r.length);
  const { start, length } = rows[row]!;
  const column = current - start;

  switch (key) {
    case 'ArrowLeft':
      return Math.max(current - 1, 0);
    case 'ArrowRight':
      return Math.min(current + 1, total - 1);
    case 'Home':
      return ctrl ? 0 : start;
    case 'End':
      return ctrl ? total - 1 : start + length - 1;
    case 'ArrowUp': {
      const target = rows[row - 1];

      return target ? target.start + Math.min(column, target.length - 1) : -1;
    }
    case 'ArrowDown': {
      const target = rows[row + 1];

      return target ? target.start + Math.min(column, target.length - 1) : current;
    }
  }
}

/** Раздел, заголовок которого уже ушёл под верх прокрутки (с запасом `threshold`): его вкладка активна */
export function activeSectionIndex(
  offsets: readonly number[],
  scrollTop: number,
  threshold = 8,
): number {
  let active = 0;

  offsets.forEach((offset, index) => {
    if (offset <= scrollTop + threshold) active = index;
  });

  return active;
}
