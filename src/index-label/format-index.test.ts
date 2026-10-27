import { describe, expect, it } from 'vitest';

import { formatIndex } from './format-index';

describe('formatIndex', () => {
  it('ведущие нули по pad', () => {
    expect(formatIndex(1)).toBe('01');
    expect(formatIndex(7, { pad: 3 })).toBe('007');
    expect(formatIndex(123)).toBe('123');
  });

  it('номер из общего числа', () => {
    expect(formatIndex(1, { total: 7 })).toBe('01 / 07');
  });

  it('префикс серии', () => {
    expect(formatIndex(4, { prefix: 'SEC' })).toBe('SEC-04');
    expect(formatIndex(7, { prefix: 'A', total: 12 })).toBe('A-07 / 12');
  });

  it('готовая строка — как есть, дробь отбрасывается', () => {
    expect(formatIndex('B2')).toBe('B2');
    expect(formatIndex(3.7)).toBe('03');
  });
});
