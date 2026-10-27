import { describe, expect, it } from 'vitest';

import { pagerKey, pagerPercent, pagerStep } from './pager-model';

describe('pagerStep', () => {
  it('страница и строка — не дальше конца', () => {
    expect(pagerStep(10, 42, 10, 'page')).toBe(20);
    expect(pagerStep(40, 42, 10, 'page')).toBe(42);
    expect(pagerStep(10, 42, 10, 'line')).toBe(11);
    expect(pagerStep(42, 42, 10, 'line')).toBe(42);
  });

  it('назад — не меньше первой страницы', () => {
    expect(pagerStep(30, 42, 10, 'back')).toBe(20);
    expect(pagerStep(14, 42, 10, 'back')).toBe(10);
  });

  it('всё и свернуть', () => {
    expect(pagerStep(10, 42, 10, 'all')).toBe(42);
    expect(pagerStep(42, 42, 10, 'collapse')).toBe(10);
  });

  it('строк меньше страницы — свёрнуто до всех', () => {
    expect(pagerStep(3, 3, 10, 'collapse')).toBe(3);
  });
});

describe('pagerPercent', () => {
  it('целым вниз, 100 — только в конце', () => {
    expect(pagerPercent(10, 42)).toBe(23);
    expect(pagerPercent(41, 42)).toBe(97);
    expect(pagerPercent(999, 1000)).toBe(99);
    expect(pagerPercent(42, 42)).toBe(100);
    expect(pagerPercent(0, 0)).toBe(100);
  });
});

describe('pagerKey', () => {
  it('клавиши как в more / less', () => {
    expect(pagerKey(' ')).toBe('page');
    expect(pagerKey('Enter')).toBe('line');
    expect(pagerKey('b')).toBe('back');
    expect(pagerKey('q')).toBe('collapse');
    expect(pagerKey('x')).toBeNull();
  });
});
