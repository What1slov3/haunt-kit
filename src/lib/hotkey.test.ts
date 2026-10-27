import { describe, expect, it } from 'vitest';

import {
  formatHotkey,
  hotkeyParts,
  isApplePlatform,
  isEditableTarget,
  matchHotkey,
  parseHotkey,
  type HotkeyEvent,
} from './hotkey';

function key(init: Partial<HotkeyEvent> & Pick<HotkeyEvent, 'key'>): HotkeyEvent {
  return { code: '', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...init };
}

describe('parseHotkey', () => {
  it('разбирает модификаторы и клавишу', () => {
    expect(parseHotkey('mod+Shift+K')).toEqual({
      mod: true,
      ctrl: false,
      meta: false,
      alt: false,
      shift: true,
      key: 'k',
    });
  });

  it('понимает псевдонимы клавиш и модификаторов', () => {
    expect(parseHotkey('esc').key).toBe('escape');
    expect(parseHotkey('cmd+option+up')).toMatchObject({ meta: true, alt: true, key: 'arrowup' });
  });

  it('плюс как клавиша — в конце сочетания', () => {
    expect(parseHotkey('mod++')).toMatchObject({ mod: true, key: '+' });
  });

  it('падает на опечатке в модификаторе', () => {
    expect(() => parseHotkey('mdo+k')).toThrow(/mdo/);
  });
});

describe('matchHotkey', () => {
  const modK = parseHotkey('mod+k');

  it('mod — Ctrl вне Apple и ⌘ на Apple', () => {
    expect(matchHotkey(key({ key: 'k', code: 'KeyK', ctrlKey: true }), modK, false)).toBe(true);
    expect(matchHotkey(key({ key: 'k', code: 'KeyK', metaKey: true }), modK, false)).toBe(false);
    expect(matchHotkey(key({ key: 'k', code: 'KeyK', metaKey: true }), modK, true)).toBe(true);
    expect(matchHotkey(key({ key: 'k', code: 'KeyK', ctrlKey: true }), modK, true)).toBe(false);
  });

  it('буквы — по физической клавише, в русской раскладке тоже', () => {
    expect(matchHotkey(key({ key: 'л', code: 'KeyK', ctrlKey: true }), modK, false)).toBe(true);
  });

  it('лишний модификатор не совпадает', () => {
    const event = key({ key: 'K', code: 'KeyK', ctrlKey: true, shiftKey: true });

    expect(matchHotkey(event, modK, false)).toBe(false);
    expect(matchHotkey(event, parseHotkey('mod+shift+k'), false)).toBe(true);
  });

  it('символ, набранный с Shift, не требует shift в сочетании', () => {
    const question = key({ key: '?', code: 'Slash', shiftKey: true });

    expect(matchHotkey(question, parseHotkey('?'), false)).toBe(true);
    expect(matchHotkey(question, parseHotkey('shift+?'), false)).toBe(true);
  });

  it('именованные клавиши сравниваются по key с точным Shift', () => {
    const escape = parseHotkey('escape');

    expect(matchHotkey(key({ key: 'Escape', code: 'Escape' }), escape, false)).toBe(true);
    expect(matchHotkey(key({ key: 'Escape', shiftKey: true }), escape, false)).toBe(false);
  });
});

describe('formatHotkey', () => {
  it('Ctrl+Shift+K вне Apple', () => {
    expect(formatHotkey('mod+shift+k', false)).toBe('Ctrl+Shift+K');
  });

  it('значки в порядке macOS на Apple', () => {
    expect(formatHotkey('mod+shift+k', true)).toBe('⇧⌘K');
    expect(hotkeyParts('ctrl+alt+mod+p', true)).toEqual(['⌃', '⌥', '⌘', 'P']);
  });

  it('подписи именованных клавиш', () => {
    expect(formatHotkey('esc', false)).toBe('Esc');
    expect(formatHotkey('mod+enter', false)).toBe('Ctrl+Enter');
    expect(formatHotkey('up', true)).toBe('↑');
  });
});

describe('isApplePlatform', () => {
  it('узнаёт macOS и iOS', () => {
    expect(isApplePlatform('MacIntel')).toBe(true);
    expect(isApplePlatform('macOS')).toBe(true);
    expect(isApplePlatform('iPhone')).toBe(true);
    expect(isApplePlatform('Win32')).toBe(false);
    expect(isApplePlatform('Linux x86_64')).toBe(false);
  });
});

describe('isEditableTarget', () => {
  it('текстовые поля и contenteditable — да, флажки и кнопки — нет', () => {
    const text = document.createElement('input');
    const checkbox = document.createElement('input');
    const editable = document.createElement('div');
    const child = document.createElement('span');

    checkbox.type = 'checkbox';
    editable.setAttribute('contenteditable', 'true');
    editable.append(child);

    expect(isEditableTarget(text)).toBe(true);
    expect(isEditableTarget(document.createElement('textarea'))).toBe(true);
    expect(isEditableTarget(child)).toBe(true);
    expect(isEditableTarget(checkbox)).toBe(false);
    expect(isEditableTarget(document.createElement('button'))).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});
