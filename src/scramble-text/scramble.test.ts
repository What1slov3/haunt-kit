import { afterEach, describe, expect, it, vi } from 'vitest';

import { runScramble, scrambleFrame } from './scramble';

// Всегда первый символ набора: кадр детерминирован
const first = () => 0;

describe('scrambleFrame', () => {
  it('в начале — весь текст шумом, пробелы на месте', () => {
    expect(scrambleFrame('ab cd', 0, first, 'X')).toBe('XX XX');
  });

  it('по ходу — открывается слева направо', () => {
    expect(scrambleFrame('abcd', 0.5, first, 'X')).toBe('abXX');
  });

  it('в конце — итог', () => {
    expect(scrambleFrame('Haunt', 1, first, 'X')).toBe('Haunt');
  });

  it('длина кадра в символах — как у текста (кириллица, эмодзи)', () => {
    const text = 'Привет 👻';

    expect([...scrambleFrame(text, 0.3)]).toHaveLength([...text].length);
  });

  it('пустой набор — без шума', () => {
    expect(scrambleFrame('abc', 0, first, '')).toBe('abc');
  });
});

describe('runScramble', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-effects');
    vi.unstubAllGlobals();
  });

  function stubMotion(reduce: boolean) {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce, media: query }));
  }

  it('эффекты выключены — сразу итог, без кадров', () => {
    stubMotion(false);
    document.documentElement.setAttribute('data-effects', 'off');

    const onFrame = vi.fn();

    runScramble(document.body, { text: 'abc', duration: 500, charset: 'X' }, onFrame);

    expect(onFrame).toHaveBeenCalledExactlyOnceWith(null);
  });

  it('reduced-motion — сразу итог', () => {
    stubMotion(true);

    const onFrame = vi.fn();

    runScramble(document.body, { text: 'abc', duration: 500, charset: 'X' }, onFrame);

    expect(onFrame).toHaveBeenCalledExactlyOnceWith(null);
  });

  it('движение разрешено — первый кадр шумом сразу', () => {
    stubMotion(false);

    const onFrame = vi.fn();
    const cancel = runScramble(
      document.body,
      { text: 'abc', duration: 500, charset: 'X' },
      onFrame,
    );

    expect(onFrame).toHaveBeenCalledWith('XXX');
    cancel();
  });
});
