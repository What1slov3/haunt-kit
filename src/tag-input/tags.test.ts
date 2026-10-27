import { describe, expect, it } from 'vitest';

import { addTags, hasTag, splitTags } from './tags';

describe('splitTags', () => {
  it('режет по запятым, точкам с запятой и строкам, срезает пробелы и пустые', () => {
    expect(splitTags(' a, b ;c\n\n d ,, ')).toEqual(['a', 'b', 'c', 'd']);
  });

  it('пустая строка — без тегов', () => {
    expect(splitTags('  ,  ')).toEqual([]);
  });
});

describe('hasTag', () => {
  it('сравнивает без учёта регистра', () => {
    expect(hasTag(['Админ'], 'АДМИН')).toBe(true);
    expect(hasTag(['Админ'], 'модер')).toBe(false);
  });
});

describe('addTags', () => {
  it('добавляет новые теги в конец', () => {
    expect(addTags(['a'], ['b', 'c'])).toEqual({
      tags: ['a', 'b', 'c'],
      added: ['b', 'c'],
      rejected: [],
    });
  });

  it('дубли — и с имеющимися, и внутри одной вставки — отклоняет без текста ошибки', () => {
    const result = addTags(['a'], ['A', 'b', 'B']);

    expect(result.tags).toEqual(['a', 'b']);
    expect(result.rejected).toEqual([
      { tag: 'A', reason: 'duplicate' },
      { tag: 'B', reason: 'duplicate' },
    ]);
  });

  it('за лимитом отклоняет с ошибкой', () => {
    const result = addTags(['a'], ['b', 'c'], { max: 2 });

    expect(result.tags).toEqual(['a', 'b']);
    expect(result.rejected).toEqual([{ tag: 'c', reason: 'max', message: 'Не больше 2' }]);
  });

  it('валидатор получает тег и текущий список, его текст — ошибка', () => {
    const validate = (tag: string, tags: readonly string[]) =>
      tag.startsWith('@') ? null : `«${tag}» — не ник (${tags.length})`;

    const result = addTags([], ['@anna', 'boris'], { validate });

    expect(result.tags).toEqual(['@anna']);
    expect(result.rejected).toEqual([
      { tag: 'boris', reason: 'invalid', message: '«boris» — не ник (1)' },
    ]);
  });

  it('пустые кандидаты пропускает молча', () => {
    expect(addTags([], ['  ', ''])).toEqual({ tags: [], added: [], rejected: [] });
  });
});
