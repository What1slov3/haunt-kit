import { describe, expect, it } from 'vitest';

import { commonPrefix, completion, matchSuggestions } from './command-line-model';

const commands = ['/ban', '/banlist', '/kick', '/mute', { value: '/help', description: 'справка' }];

describe('matchSuggestions', () => {
  it('начало строки — выше, не больше limit', () => {
    expect(matchSuggestions(commands, '/ba', 8).map((item) => item.value)).toEqual([
      '/ban',
      '/banlist',
    ]);
    expect(matchSuggestions(commands, '/', 2)).toHaveLength(2);
  });

  it('пустая строка и полное совпадение — без подсказок', () => {
    expect(matchSuggestions(commands, '  ', 8)).toEqual([]);
    expect(matchSuggestions(['/ban'], '/ban', 8)).toEqual([]);
  });

  it('пояснение сохраняется', () => {
    expect(matchSuggestions(commands, '/he', 8)).toEqual([
      { value: '/help', label: '/help', description: 'справка' },
    ]);
  });
});

describe('commonPrefix', () => {
  it('общее начало', () => {
    expect(commonPrefix(['/ban', '/banlist'])).toBe('/ban');
    expect(commonPrefix(['/kick', '/mute'])).toBe('/');
    expect(commonPrefix(['Abc', 'abd'])).toBe('Ab');
    expect(commonPrefix([])).toBe('');
  });
});

describe('completion', () => {
  const items = [{ value: '/ban' }, { value: '/banlist' }];

  it('выбранная стрелками — она', () => {
    expect(completion('/b', items, 1)).toBe('/banlist');
  });

  it('иначе общее начало, если длиннее набранного', () => {
    expect(completion('/b', items, null)).toBe('/ban');
  });

  it('начало уже набрано — первая', () => {
    expect(completion('/ban', items, null)).toBe('/ban');
    expect(completion('ba', [{ value: '/ban' }, { value: '/kick' }], null)).toBe('/ban');
  });

  it('подсказок нет — null', () => {
    expect(completion('/x', [], null)).toBeNull();
  });
});
