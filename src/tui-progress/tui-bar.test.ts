import { describe, expect, it } from 'vitest';

import { emptyCells, formatPercent, progressCells } from './tui-bar';

describe('progressCells — blocks', () => {
  it('пусто и полно', () => {
    expect(progressCells(0, 5, 'blocks')).toBe('░░░░░');
    expect(progressCells(1, 5, 'blocks')).toBe('█████');
  });

  it('переходная клетка — восьмые доли по дробной части', () => {
    expect(progressCells(0.5, 10, 'blocks')).toBe('█████░░░░░');
    expect(progressCells(0.51, 10, 'blocks')).toBe('█████░░░░░');
    expect(progressCells(0.54, 10, 'blocks')).toBe('█████▍░░░░');
    expect(progressCells(0.58, 10, 'blocks')).toBe('█████▊░░░░');
    expect(progressCells(0.599, 10, 'blocks')).toBe('█████▉░░░░');
  });

  it('ширина всегда ровно width', () => {
    for (const ratio of [0, 0.01, 0.33, 0.5, 0.99, 1]) {
      expect([...progressCells(ratio, 12, 'blocks')]).toHaveLength(12);
    }
  });

  it('доля прижимается к 0…1, NaN — пусто', () => {
    expect(progressCells(2, 4, 'blocks')).toBe('████');
    expect(progressCells(-1, 4, 'blocks')).toBe('░░░░');
    expect(progressCells(Number.NaN, 4, 'blocks')).toBe('░░░░');
  });
});

describe('progressCells — ascii', () => {
  it('решётки и дефисы, округление до клетки', () => {
    expect(progressCells(0.5, 8, 'ascii')).toBe('####----');
    expect(progressCells(0.3, 8, 'ascii')).toBe('##------');
  });

  it('пустая дорожка', () => {
    expect(emptyCells(4, 'ascii')).toBe('----');
    expect(emptyCells(4, 'blocks')).toBe('░░░░');
  });
});

describe('formatPercent', () => {
  it('одной ширины', () => {
    expect(formatPercent(0.05)).toBe('  5%');
    expect(formatPercent(0.42)).toBe(' 42%');
    expect(formatPercent(1)).toBe('100%');
  });

  it('за пределами — прижимается', () => {
    expect(formatPercent(3)).toBe('100%');
  });
});
