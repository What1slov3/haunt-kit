import { describe, expect, it } from 'vitest';

import { exitDuration, hasExitAnimation, parseCssTimes } from './presence-timing';

const style = (overrides: Partial<Parameters<typeof exitDuration>[0]> = {}) => ({
  animationName: 'haunt-pop-out',
  animationDuration: '0.09s',
  animationDelay: '0s',
  animationIterationCount: '1',
  ...overrides,
});

describe('parseCssTimes', () => {
  it('секунды и миллисекунды → мс', () => {
    expect(parseCssTimes('0.15s, 90ms')).toEqual([150, 90]);
  });

  it('мусор — ноль', () => {
    expect(parseCssTimes('abc')).toEqual([0]);
  });
});

describe('hasExitAnimation', () => {
  it('none или нулевая длительность — уходить сразу', () => {
    expect(hasExitAnimation('none', '0.2s')).toBe(false);
    expect(hasExitAnimation('haunt-fade-out', '0s')).toBe(false);
    expect(hasExitAnimation('haunt-fade-out', '0.15s')).toBe(true);
  });
});

describe('exitDuration', () => {
  it('задержка + длительность', () => {
    expect(exitDuration(style({ animationDelay: '30ms' }))).toBe(120);
  });

  it('несколько анимаций — самая поздняя, короткие списки повторяются по кругу', () => {
    expect(
      exitDuration(
        style({
          animationName: 'a, b, c',
          animationDuration: '100ms, 300ms',
          animationDelay: '0s',
        }),
      ),
    ).toBe(300);
  });

  it('повторы умножают длительность, бесконечная — запасное значение', () => {
    expect(exitDuration(style({ animationIterationCount: '2' }))).toBe(180);
    expect(exitDuration(style({ animationIterationCount: 'infinite' }), 500)).toBe(500);
  });

  it('none не считается', () => {
    expect(exitDuration(style({ animationName: 'none' }))).toBe(0);
  });
});
