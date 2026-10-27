import { describe, expect, it } from 'vitest';

import type { EmojiItem } from '../emoji-picker/emoji-types';

import { enStrings } from './en';
import { mergeUiStrings, stringsForLocale } from './merge-strings';
import { ruStrings } from './ru';

const CYRILLIC = /[а-яё]/i;

const emoji = (char: string, shortcode: string): EmojiItem => ({
  char,
  shortcode,
  name: 'имя',
  keywords: [],
});

/**
 * Все строки словаря. Функции вызываются с примерными аргументами строками: шаблон и Intl.PluralRules
 * принимают их как числа, а `toLocaleLowerCase` есть только у строки
 */
function collect(value: unknown, path: string, out: Array<[string, string]>) {
  if (typeof value === 'string') {
    out.push([path, value]);
  } else if (typeof value === 'function') {
    const args =
      path === 'tagInput.added'
        ? [['a', 'b']]
        : path === 'emojiPicker.emojiName'
          ? [emoji('😍', 'heart_eyes')]
          : ['2', '5', '7'];

    out.push([path, String((value as (...args: unknown[]) => unknown)(...args))]);
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => collect(item, `${path}.${index}`, out));
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value))
      collect(item, path ? `${path}.${key}` : key, out);
  }
}

describe('stringsForLocale', () => {
  it('по языку локали', () => {
    expect(stringsForLocale('ru-RU')).toBe(ruStrings);
    expect(stringsForLocale('en-GB')).toBe(enStrings);
    expect(stringsForLocale('EN')).toBe(enStrings);
  });

  it('язык без словаря — английский', () => {
    expect(stringsForLocale('de')).toBe(enStrings);
  });
});

describe('mergeUiStrings', () => {
  it('без перезаписи — тот же объект', () => {
    expect(mergeUiStrings(enStrings)).toBe(enStrings);
  });

  it('перезаписывает лист, соседей оставляет', () => {
    const merged = mergeUiStrings(enStrings, { dialog: { close: 'Dismiss' } });

    expect(merged.dialog.close).toBe('Dismiss');
    expect(merged.sheet.close).toBe('Close');
    expect(merged.toast).toBe(enStrings.toast);
  });

  it('сливает вложенные объекты', () => {
    const merged = mergeUiStrings(enStrings, {
      inbox: { empty: { unread: { title: 'Inbox zero' } } },
    });

    expect(merged.inbox.empty.unread).toEqual({
      title: 'Inbox zero',
      text: 'No new notifications.',
    });
    expect(merged.inbox.empty.all).toBe(enStrings.inbox.empty.all);
    expect(merged.inbox.title).toBe('Notifications');
  });

  it('функции и массивы заменяются целиком', () => {
    const units = ['b', 'kb', 'mb', 'gb', 'tb'];
    const merged = mergeUiStrings(ruStrings, {
      field: { count: (count) => `${count} зн.` },
      fileDropzone: { byteUnits: units },
    });

    expect(merged.field.count(3)).toBe('3 зн.');
    expect(merged.field.countOf(1, 2)).toBe(ruStrings.field.countOf(1, 2));
    expect(merged.fileDropzone.byteUnits).toBe(units);
  });

  it('undefined в перезаписи не стирает строку', () => {
    const merged = mergeUiStrings(ruStrings, { dialog: { close: undefined } });

    expect(merged.dialog.close).toBe('Закрыть');
  });

  it('не меняет исходный словарь', () => {
    mergeUiStrings(enStrings, { dialog: { close: 'Dismiss' } });

    expect(enStrings.dialog.close).toBe('Close');
  });
});

describe('словари', () => {
  it('в английском нет кириллицы', () => {
    const entries: Array<[string, string]> = [];

    collect(enStrings, '', entries);

    expect(entries.filter(([, text]) => CYRILLIC.test(text))).toEqual([]);
  });

  it('у английского названия эмодзи — из шорткода, у флага — страна', () => {
    expect(enStrings.emojiPicker.emojiName(emoji('😍', 'heart_eyes'))).toBe('heart eyes');
    expect(enStrings.emojiPicker.emojiName(emoji('🇺🇦', 'ua'))).toBe('flag: Ukraine');
  });

  it('у русского названия эмодзи — из набора', () => {
    expect(ruStrings.emojiPicker.emojiName(emoji('😍', 'heart_eyes'))).toBe('имя');
  });
});
