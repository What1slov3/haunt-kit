import { describe, expect, it } from 'vitest';

import {
  filterOptions,
  highlightSegments,
  matchRanges,
  matchScore,
  normalize,
  queryTokens,
} from './combobox-filter';

const members = [
  { label: 'Ёлка Петрова' },
  { label: 'Владислав Вагнер', keywords: ['vagner'] },
  { label: 'Вагнер-бот' },
  { label: 'Анна Ковалёва' },
  { label: 'Модератор', keywords: ['mod', 'admin'] },
];

describe('normalize', () => {
  it('приводит к нижнему регистру и заменяет ё на е', () => {
    expect(normalize('ЁЛКА Ёж')).toBe('елка еж');
  });

  it('сохраняет длину строки', () => {
    const text = 'İstanbul 👻 Ёж';

    expect(normalize(text)).toHaveLength(text.length);
  });
});

describe('queryTokens', () => {
  it('режет запрос на слова и отбрасывает пустые', () => {
    expect(queryTokens('  Влад   ВАГН ')).toEqual(['влад', 'вагн']);
  });

  it('пустой запрос — без слов', () => {
    expect(queryTokens('   ')).toEqual([]);
  });
});

describe('matchScore', () => {
  it('подпись начинается с запроса — лучший балл', () => {
    expect(matchScore({ label: 'Вагнер-бот' }, 'ваг')).toBe(0);
  });

  it('слово запроса в начале слова подписи', () => {
    expect(matchScore({ label: 'Владислав Вагнер' }, 'ваг')).toBe(1);
  });

  it('вхождение в середину слова', () => {
    expect(matchScore({ label: 'Владислав Вагнер' }, 'гне')).toBe(2);
  });

  it('совпадение только по keywords — хуже любого совпадения в подписи', () => {
    expect(matchScore({ label: 'Модератор', keywords: ['admin'] }, 'adm')).toBe(3);
  });

  it('все слова запроса должны найтись', () => {
    expect(matchScore({ label: 'Владислав Вагнер' }, 'влад ковал')).toBeNull();
  });

  it('ё и е равны', () => {
    expect(matchScore({ label: 'Анна Ковалёва' }, 'ковалев')).toBe(1);
  });

  it('спецсимволы запроса не ломают поиск', () => {
    expect(matchScore({ label: 'a.b (c)' }, '(c')).toBe(1);
  });
});

describe('filterOptions', () => {
  it('без запроса возвращает весь список в исходном порядке', () => {
    expect(filterOptions(members, '')).toEqual(members);
  });

  it('сортирует по баллу, а внутри балла — по исходному порядку', () => {
    expect(filterOptions(members, 'ваг').map((member) => member.label)).toEqual([
      'Вагнер-бот',
      'Владислав Вагнер',
    ]);
  });

  it('находит по keywords', () => {
    expect(filterOptions(members, 'admin').map((member) => member.label)).toEqual(['Модератор']);
  });

  it('ничего не нашлось — пустой список', () => {
    expect(filterOptions(members, 'zzz')).toEqual([]);
  });
});

describe('matchRanges', () => {
  it('находит все вхождения всех слов и сливает пересечения', () => {
    expect(matchRanges('Вагнер Вагнер', 'ваг агн')).toEqual([
      [0, 4],
      [7, 11],
    ]);
  });

  it('без совпадений — пусто', () => {
    expect(matchRanges('Анна', 'боб')).toEqual([]);
  });
});

describe('highlightSegments', () => {
  it('режет текст на куски с совпадением, сохраняя исходный регистр', () => {
    expect(highlightSegments('Ёлка Петрова', 'елк')).toEqual([
      { text: 'Ёлк', match: true },
      { text: 'а Петрова', match: false },
    ]);
  });

  it('без запроса — один кусок без совпадения', () => {
    expect(highlightSegments('Анна', '')).toEqual([{ text: 'Анна', match: false }]);
  });
});
