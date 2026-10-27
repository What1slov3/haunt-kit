import { describe, expect, it } from 'vitest';

import { emojiCategories } from './emoji-data';
import {
  activeSectionIndex,
  emojiQueryTokens,
  gridRows,
  moveInGrid,
  searchEmoji,
} from './emoji-search';
import type { EmojiCategory } from './emoji-types';

const item = (char: string, shortcode: string, name: string, keywords: string[] = []) => ({
  char,
  shortcode,
  name,
  keywords,
});

const sample: EmojiCategory[] = [
  {
    id: 'smileys',
    label: 'Смайлы',
    emojis: [
      item('😄', 'smile', 'смех', ['happy', 'улыбка']),
      item('😂', 'joy', 'слёзы радости', ['lol', 'смех']),
      item('😅', 'sweat_smile', 'нервный смех', ['phew']),
    ],
  },
  { id: 'symbols', label: 'Символы', emojis: [item('🔥', 'fire', 'огонь', ['hot', 'жара'])] },
];

const chars = (query: string) => searchEmoji(sample, query).map((emoji) => emoji.char);

describe('searchEmoji', () => {
  it('пустой запрос — пусто', () => {
    expect(chars('  ')).toEqual([]);
  });

  it('точный шорткод выше совпадения по слову', () => {
    expect(chars('smile')).toEqual(['😄', '😅']);
  });

  it('ищет по русскому названию и ключевым словам, регистр и ё не важны', () => {
    expect(chars('Смех')).toEqual(['😄', '😅', '😂']);
    expect(chars('слезы')).toEqual(['😂']);
    expect(chars('жара')).toEqual(['🔥']);
  });

  it('каждое слово запроса должно совпасть', () => {
    expect(chars('нервный смех')).toEqual(['😅']);
    expect(chars('нервный огонь')).toEqual([]);
  });

  it('двоеточия шорткода не мешают', () => {
    expect(emojiQueryTokens(':fire:')).toEqual(['fire']);
    expect(chars(':fi')).toEqual(['🔥']);
  });

  it('находит по самому символу', () => {
    expect(chars('🔥')).toEqual(['🔥']);
  });

  it('ограничивает число результатов', () => {
    expect(searchEmoji(emojiCategories, 'heart', 3)).toHaveLength(3);
  });
});

describe('набор эмодзи', () => {
  const all = emojiCategories.flatMap((category) => category.emojis);

  it('около 400–700 эмодзи с названием и ключевыми словами', () => {
    expect(all.length).toBeGreaterThanOrEqual(400);
    expect(all.length).toBeLessThanOrEqual(700);
    expect(all.every((emoji) => emoji.char && emoji.name && emoji.keywords.length > 0)).toBe(true);
  });

  it('шорткоды и символы не повторяются', () => {
    expect(new Set(all.map((emoji) => emoji.shortcode)).size).toBe(all.length);
    expect(new Set(all.map((emoji) => emoji.char)).size).toBe(all.length);
  });

  it('шорткоды в формате, который понимает Markdown', () => {
    expect(all.filter((emoji) => !/^[a-z0-9_+-]{1,64}$/.test(emoji.shortcode))).toEqual([]);
  });
});

describe('gridRows', () => {
  it('каждый раздел начинается с нового ряда', () => {
    expect(gridRows([5, 3], 4)).toEqual([
      { start: 0, length: 4 },
      { start: 4, length: 1 },
      { start: 5, length: 3 },
    ]);
  });
});

describe('moveInGrid', () => {
  // Разделы по 5 и 3 при 4 столбцах: ряды [0..3], [4], [5..7]
  const sizes = [5, 3];

  it('влево и вправо идут сквозь ряды и упираются в края', () => {
    expect(moveInGrid(sizes, 4, 3, 'ArrowRight')).toBe(4);
    expect(moveInGrid(sizes, 4, 4, 'ArrowRight')).toBe(5);
    expect(moveInGrid(sizes, 4, 7, 'ArrowRight')).toBe(7);
    expect(moveInGrid(sizes, 4, 0, 'ArrowLeft')).toBe(0);
  });

  it('вниз — тот же столбец, в коротком ряду — его последняя ячейка', () => {
    expect(moveInGrid(sizes, 4, 2, 'ArrowDown')).toBe(4);
    expect(moveInGrid(sizes, 4, 4, 'ArrowDown')).toBe(5);
    expect(moveInGrid(sizes, 4, 7, 'ArrowDown')).toBe(7);
  });

  it('вверх из первого ряда — в поиск (-1)', () => {
    expect(moveInGrid(sizes, 4, 7, 'ArrowUp')).toBe(4);
    expect(moveInGrid(sizes, 4, 4, 'ArrowUp')).toBe(0);
    expect(moveInGrid(sizes, 4, 2, 'ArrowUp')).toBe(-1);
  });

  it('Home / End — края ряда, с Ctrl — края сетки', () => {
    expect(moveInGrid(sizes, 4, 6, 'Home')).toBe(5);
    expect(moveInGrid(sizes, 4, 1, 'End')).toBe(3);
    expect(moveInGrid(sizes, 4, 6, 'Home', true)).toBe(0);
    expect(moveInGrid(sizes, 4, 1, 'End', true)).toBe(7);
  });

  it('пустая сетка — в поиск', () => {
    expect(moveInGrid([], 8, 0, 'ArrowDown')).toBe(-1);
  });
});

describe('activeSectionIndex', () => {
  it('активен последний раздел, чей заголовок ушёл под верх', () => {
    expect(activeSectionIndex([0, 200, 500], 0)).toBe(0);
    expect(activeSectionIndex([0, 200, 500], 195)).toBe(1);
    expect(activeSectionIndex([0, 200, 500], 9999)).toBe(2);
  });
});
