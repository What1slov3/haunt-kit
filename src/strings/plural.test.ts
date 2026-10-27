import { describe, expect, it } from 'vitest';

import { enStrings } from './en';
import { plural } from './plural';
import { ruStrings } from './ru';

describe('plural', () => {
  const members = { one: 'участник', few: 'участника', many: 'участников', other: 'участника' };

  it('русские формы: один, несколько, много, дробь', () => {
    expect(plural('ru', 1, members)).toBe('участник');
    expect(plural('ru', 2, members)).toBe('участника');
    expect(plural('ru', 5, members)).toBe('участников');
    expect(plural('ru', 11, members)).toBe('участников');
    expect(plural('ru', 21, members)).toBe('участник');
    expect(plural('ru', 1.5, members)).toBe('участника');
  });

  it('английские формы', () => {
    const items = { one: 'item', other: 'items' };

    expect(plural('en', 1, items)).toBe('item');
    expect(plural('en', 2, items)).toBe('items');
    expect(plural('en', 0, items)).toBe('items');
  });

  it('нет формы языка — other', () => {
    expect(plural('ru', 5, { one: 'файл', other: 'файлов' })).toBe('файлов');
  });
});

describe('строки с числом', () => {
  it('счётчик поля по-русски', () => {
    expect(ruStrings.field.count(1)).toBe('1 символ');
    expect(ruStrings.field.count(3)).toBe('3 символа');
    expect(ruStrings.field.count(12)).toBe('12 символов');
    expect(ruStrings.field.countOf(1, 21)).toBe('1 из 21 символа');
    expect(ruStrings.field.countOf(12, 190)).toBe('12 из 190 символов');
  });

  it('счётчик поля по-английски', () => {
    expect(enStrings.field.count(1)).toBe('1 character');
    expect(enStrings.field.count(12)).toBe('12 characters');
    expect(enStrings.field.countOf(12, 190)).toBe('12 of 190 characters');
    expect(enStrings.field.countOf(0, 1)).toBe('0 of 1 character');
  });

  it('лимит файлов — родительный падеж после «не больше»', () => {
    expect(ruStrings.fileDropzone.maxFiles(1)).toBe('не больше 1 файла');
    expect(ruStrings.fileDropzone.maxFiles(5)).toBe('не больше 5 файлов');
    expect(ruStrings.fileDropzone.maxFiles(21)).toBe('не больше 21 файла');
    expect(enStrings.fileDropzone.maxFiles(1)).toBe('up to 1 file');
    expect(enStrings.fileDropzone.maxFiles(3)).toBe('up to 3 files');
  });

  it('непрочитанные', () => {
    expect(ruStrings.navItem.unread(1)).toBe('1 непрочитанное');
    expect(ruStrings.navItem.unread(5)).toBe('5 непрочитанных');
    expect(enStrings.navItem.unread(5)).toBe('5 unread');
  });

  it('скрытые разделы крошек', () => {
    expect(enStrings.breadcrumbs.hidden(1)).toBe('1 hidden section');
    expect(enStrings.breadcrumbs.hidden(3)).toBe('3 hidden sections');
  });
});
