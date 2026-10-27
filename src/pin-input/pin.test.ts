import { describe, expect, it } from 'vitest';

import { insertPin, removePin, sanitizePin } from './pin';

describe('sanitizePin', () => {
  it('numeric оставляет только цифры', () => {
    expect(sanitizePin('12-3 4a5', 'numeric')).toBe('12345');
  });

  it('alphanumeric оставляет латиницу и цифры в верхнем регистре', () => {
    expect(sanitizePin('ab-1 ц2Z', 'alphanumeric')).toBe('AB12Z');
  });
});

describe('insertPin', () => {
  it('символ встаёт в ячейку, фокус — на следующую', () => {
    expect(insertPin('12', 2, '3', 6, 'numeric')).toEqual({ value: '123', focus: 3 });
  });

  it('ввод в заполненную ячейку заменяет символ', () => {
    expect(insertPin('123', 1, '9', 6, 'numeric')).toEqual({ value: '193', focus: 2 });
  });

  it('ввод дальше заполненных начинается с первой пустой', () => {
    expect(insertPin('12', 5, '3', 6, 'numeric')).toEqual({ value: '123', focus: 3 });
  });

  it('последний символ оставляет фокус на последней ячейке', () => {
    expect(insertPin('12345', 5, '6', 6, 'numeric')).toEqual({ value: '123456', focus: 5 });
  });

  it('вставка всего кода заполняет его с начала, где бы ни стоял фокус', () => {
    expect(insertPin('9', 3, '123-456', 6, 'numeric')).toEqual({ value: '123456', focus: 5 });
  });

  it('длинная вставка обрезается по длине кода', () => {
    expect(insertPin('', 0, '12345678', 6, 'numeric').value).toBe('123456');
  });

  it('короткая вставка ложится с текущей ячейки', () => {
    expect(insertPin('1', 1, '23', 6, 'numeric')).toEqual({ value: '123', focus: 3 });
  });

  it('недопустимый символ ничего не меняет', () => {
    expect(insertPin('12', 2, 'a', 6, 'numeric')).toEqual({ value: '12', focus: 2 });
  });
});

describe('removePin', () => {
  it('заполненная ячейка очищается, фокус остаётся', () => {
    expect(removePin('123', 2)).toEqual({ value: '12', focus: 2 });
  });

  it('с пустой ячейки фокус уходит назад и очищает предыдущую', () => {
    expect(removePin('12', 2)).toEqual({ value: '1', focus: 1 });
  });

  it('в середине — символ уходит, хвост сдвигается', () => {
    expect(removePin('1234', 1)).toEqual({ value: '134', focus: 1 });
  });

  it('пустой код не меняется', () => {
    expect(removePin('', 0)).toEqual({ value: '', focus: 0 });
  });
});
