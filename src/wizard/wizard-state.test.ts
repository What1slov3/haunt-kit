import { afterEach, describe, expect, it } from 'vitest';

import { canJumpTo, clampStep, readSavedStep, saveStep, validationError } from './wizard-state';

afterEach(() => localStorage.clear());

describe('validationError', () => {
  it('true и ничего — можно дальше, false — общий текст, строка — своя ошибка', () => {
    expect(validationError(true)).toBeNull();
    expect(validationError(undefined)).toBeNull();
    expect(validationError(null)).toBeNull();
    expect(validationError(false)).toBe('');
    expect(validationError('Имя занято')).toBe('Имя занято');
  });
});

describe('clampStep', () => {
  it('в пределах мастера', () => {
    expect(clampStep(5, 3)).toBe(2);
    expect(clampStep(-1, 3)).toBe(0);
    expect(clampStep(1.6, 3)).toBe(2);
    expect(clampStep(Number.NaN, 3)).toBe(0);
    expect(clampStep(2, 0)).toBe(0);
  });
});

describe('сохранение шага', () => {
  it('без ключа — запасной шаг', () => {
    expect(readSavedStep(undefined, 4, 1)).toBe(1);
  });

  it('сохранённый шаг возвращается и прижимается к числу шагов', () => {
    saveStep('wizard', 3);

    expect(readSavedStep('wizard', 5, 0)).toBe(3);
    expect(readSavedStep('wizard', 2, 0)).toBe(1);
  });

  it('мусор в хранилище — с начала; null — удалить', () => {
    localStorage.setItem('wizard', 'abc');

    expect(readSavedStep('wizard', 3, 0)).toBe(0);

    saveStep('wizard', 2);
    saveStep('wizard', null);

    expect(localStorage.getItem('wizard')).toBeNull();
  });
});

describe('canJumpTo', () => {
  it('кликом — только назад', () => {
    expect(canJumpTo(0, 2)).toBe(true);
    expect(canJumpTo(2, 2)).toBe(false);
    expect(canJumpTo(3, 2)).toBe(false);
  });
});
