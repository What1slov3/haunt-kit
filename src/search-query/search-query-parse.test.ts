import { describe, expect, it } from 'vitest';

import {
  absorbFilters,
  formatFilter,
  formatSearchQuery,
  matchKeys,
  parseSearchQuery,
  replaceToken,
  searchContext,
  tokenizeQuery,
  type SearchKey,
} from './search-query-parse';

const keys: SearchKey[] = [
  { key: 'from', label: 'от участника', valuePrefix: '@' },
  { key: 'in', label: 'в канале', valuePrefix: '#' },
  { key: 'has', label: 'есть вложение', values: [{ value: 'file' }, { value: 'link' }] },
  { key: 'before', label: 'до даты', validate: (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) },
];

describe('tokenizeQuery', () => {
  it('слова с позициями, кавычки держат пробел', () => {
    expect(tokenizeQuery(' in:"voice lounge"  ok')).toEqual([
      { raw: 'in:"voice lounge"', start: 1, end: 18, open: false },
      { raw: 'ok', start: 20, end: 22, open: false },
    ]);
  });

  it('незакрытая кавычка — слово до конца и открыто', () => {
    expect(tokenizeQuery('in:"voice lo')).toEqual([
      { raw: 'in:"voice lo', start: 0, end: 12, open: true },
    ]);
  });
});

describe('parseSearchQuery', () => {
  it('фильтры и свободный текст', () => {
    expect(
      parseSearchQuery('from:@anna привет in:#general has:file before:2026-10-01', keys),
    ).toEqual({
      filters: [
        { key: 'from', value: '@anna' },
        { key: 'in', value: '#general' },
        { key: 'has', value: 'file' },
        { key: 'before', value: '2026-10-01' },
      ],
      text: 'привет',
    });
  });

  it('неизвестный ключ, пустое и негодное значение — текст', () => {
    expect(parseSearchQuery('foo:bar from: before:вчера http://x', keys)).toEqual({
      filters: [],
      text: 'foo:bar from: before:вчера http://x',
    });
  });

  it('ключ без учёта регистра, значение в кавычках с экранированием', () => {
    expect(parseSearchQuery('IN:"voice \\"lounge\\""', keys).filters).toEqual([
      { key: 'in', value: 'voice "lounge"' },
    ]);
  });
});

describe('сборка', () => {
  it('значение с пробелом и кавычкой — в кавычках', () => {
    expect(formatFilter({ key: 'in', value: 'voice "lounge"' })).toBe('in:"voice \\"lounge\\""');
  });

  it('туда и обратно', () => {
    const value = {
      filters: [
        { key: 'from', value: '@anna' },
        { key: 'in', value: 'voice lounge' },
      ],
      text: 'релиз',
    };

    expect(parseSearchQuery(formatSearchQuery(value), keys)).toEqual(value);
  });

  it('фильтры впереди, текст в конце, лишние пробелы прочь', () => {
    expect(formatSearchQuery({ filters: [{ key: 'has', value: 'link' }], text: '  кот ' })).toBe(
      'has:link кот',
    );
    expect(formatSearchQuery({ filters: [], text: '' })).toBe('');
  });
});

describe('absorbFilters', () => {
  it('фильтр с пробелом за ним уходит в чипы, набираемый — остаётся', () => {
    expect(absorbFilters('from:@anna in:#gen', keys)).toEqual({
      filters: [{ key: 'from', value: '@anna' }],
      rest: 'in:#gen',
    });
  });

  it('текст вокруг сохраняется', () => {
    expect(absorbFilters('привет has:file мир', keys)).toEqual({
      filters: [{ key: 'has', value: 'file' }],
      rest: 'привет мир',
    });
  });

  it('all — забрать и последнее слово (Enter)', () => {
    expect(absorbFilters('кот in:#general', keys, { all: true })).toEqual({
      filters: [{ key: 'in', value: '#general' }],
      rest: 'кот ',
    });
  });

  it('открытая кавычка — не готово', () => {
    expect(absorbFilters('in:"voice lounge ', keys).filters).toEqual([]);
  });
});

describe('searchContext', () => {
  it('пустое слово — все ключи', () => {
    expect(searchContext('', 0, keys)).toMatchObject({ kind: 'key', query: '' });
  });

  it('начало ключа', () => {
    expect(searchContext('кот fr', 6, keys)).toMatchObject({ kind: 'key', query: 'fr' });
  });

  it('значение известного ключа без знака-префикса', () => {
    expect(searchContext('from:@ан', 8, keys)).toMatchObject({
      kind: 'value',
      query: 'ан',
      key: { key: 'from' },
    });
  });

  it('неизвестный ключ — ничего', () => {
    expect(searchContext('foo:x', 5, keys)).toBeNull();
  });

  it('matchKeys ищет и по подписи', () => {
    expect(matchKeys(keys, 'канал').map((item) => item.key)).toEqual(['in']);
  });

  it('replaceToken ставит курсор за вставкой', () => {
    const context = searchContext('кот fr', 6, keys)!;

    expect(replaceToken('кот fr', context.token, 'from:')).toEqual({
      draft: 'кот from:',
      caret: 9,
    });
  });
});
