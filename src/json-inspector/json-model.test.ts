import { describe, expect, it } from 'vitest';

import {
  copyableValue,
  expandToDepth,
  flattenJson,
  jsonPath,
  kindOf,
  previewPrimitive,
  searchJson,
} from './json-model';

const value = {
  id: 42,
  name: 'haunt-bot',
  enabled: true,
  owner: null,
  roles: ['admin', 'bot'],
  'rate limit': { perMinute: 30 },
  empty: {},
};

describe('jsonPath', () => {
  it('точки для имён, скобки для индексов и неудобных ключей', () => {
    expect(jsonPath([])).toBe('$');
    expect(jsonPath(['roles', 0])).toBe('$.roles[0]');
    expect(jsonPath(['rate limit', 'perMinute'])).toBe('$["rate limit"].perMinute');
  });
});

describe('kindOf / preview', () => {
  it('типы и короткий вид', () => {
    expect([null, [], {}, 's', 1, true, undefined].map(kindOf)).toEqual([
      'null',
      'array',
      'object',
      'string',
      'number',
      'boolean',
      'undefined',
    ]);
    expect(previewPrimitive('hi')).toBe('"hi"');
    expect(previewPrimitive('x'.repeat(300)).length).toBeLessThanOrEqual(161);
    expect(copyableValue({ a: 1 })).toBe('{\n  "a": 1\n}');
    expect(copyableValue('text')).toBe('text');
  });
});

describe('flattenJson', () => {
  it('корень не рисуется, свёрнутые ветки закрыты', () => {
    const rows = flattenJson(value, new Set());

    expect(rows.map((row) => row.key)).toEqual([
      'id',
      'name',
      'enabled',
      'owner',
      'roles',
      'rate limit',
      'empty',
    ]);
    expect(rows.find((row) => row.key === 'roles')).toMatchObject({
      expandable: true,
      expanded: false,
      size: 2,
      parentId: null,
    });
    expect(rows.find((row) => row.key === 'empty')!.expandable).toBe(false);
  });

  it('раскрытая ветка показывает детей уровнем ниже', () => {
    const rows = flattenJson(value, new Set(['$.roles']));
    const index = rows.findIndex((row) => row.id === '$.roles');

    expect(rows[index + 1]).toMatchObject({
      id: '$.roles[0]',
      level: 2,
      parentId: '$.roles',
      value: 'admin',
    });
  });

  it('большой массив — кусками', () => {
    const big = { list: Array.from({ length: 250 }, (_, index) => index) };
    const rows = flattenJson(big, new Set(['$.list', '$.list#100']));
    const chunks = rows.filter((row) => row.chunk);

    expect(chunks.map((row) => row.chunk)).toEqual([
      [0, 99],
      [100, 199],
      [200, 249],
    ]);

    const second = rows.findIndex((row) => row.id === '$.list#100');

    expect(rows[second + 1]).toMatchObject({ id: '$.list[100]', posinset: 101, setsize: 250 });
  });

  it('примитив в корне — одна строка', () => {
    expect(flattenJson('text', new Set())).toMatchObject([{ id: '$', kind: 'string' }]);
  });
});

describe('expandToDepth', () => {
  it('раскрывает до глубины, большие массивы — нет', () => {
    expect([...expandToDepth(value, 1)].sort()).toEqual(
      ['$.roles', '$["rate limit"]', '$.empty'].sort(),
    );
    expect(expandToDepth(value, 0).size).toBe(0);
    expect(expandToDepth({ list: Array.from({ length: 300 }) }, 2).has('$.list')).toBe(false);
  });
});

describe('searchJson', () => {
  it('совпадения ключей и ветки, которые надо раскрыть', () => {
    const { matches, expand } = searchJson(value, 'MINUTE');

    expect([...matches]).toEqual(['$["rate limit"].perMinute']);
    expect([...expand]).toEqual(['$["rate limit"]']);
  });

  it('внутри большого массива раскрывается нужный кусок', () => {
    const big = { list: Array.from({ length: 250 }, (_, index) => ({ [`k${index}`]: index })) };
    const { expand } = searchJson(big, 'k205');

    expect([...expand]).toEqual(expect.arrayContaining(['$.list', '$.list#200', '$.list[205]']));
  });

  it('циклы не вешают поиск, пустой запрос — пусто', () => {
    const cyclic: Record<string, unknown> = { a: 1 };

    cyclic.self = cyclic;

    expect(searchJson(cyclic, 'a').matches.has('$.a')).toBe(true);
    expect(searchJson(value, '  ').matches.size).toBe(0);
  });
});
