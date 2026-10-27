import { describe, expect, it } from 'vitest';

import { matchHotkey, parseHotkey, type HotkeyEvent } from '../lib/hotkey';

import {
  comboFromEvent,
  findConflict,
  keyFromEvent,
  modifiersLabel,
  needsModifier,
  normalizeCombo,
  sameCombo,
} from './keybinding';

const press = (init: Partial<HotkeyEvent>): HotkeyEvent => ({
  key: '',
  code: '',
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...init,
});

describe('comboFromEvent', () => {
  it('Ctrl на Windows и ⌘ на Apple — `mod`', () => {
    expect(
      comboFromEvent(press({ key: 'k', code: 'KeyK', ctrlKey: true, shiftKey: true }), false),
    ).toBe('mod+shift+k');
    expect(comboFromEvent(press({ key: 'k', code: 'KeyK', metaKey: true }), true)).toBe('mod+k');
    expect(comboFromEvent(press({ key: 'k', code: 'KeyK', ctrlKey: true }), true)).toBe('ctrl+k');
  });

  it('буква — по физической клавише: русская раскладка пишет `mod+k`', () => {
    expect(comboFromEvent(press({ key: 'л', code: 'KeyK', ctrlKey: true }), false)).toBe('mod+k');
  });

  it('одни модификаторы — запись ещё идёт', () => {
    expect(
      comboFromEvent(press({ key: 'Control', code: 'ControlLeft', ctrlKey: true }), false),
    ).toBeNull();
    expect(
      comboFromEvent(press({ key: 'Shift', code: 'ShiftLeft', shiftKey: true }), false),
    ).toBeNull();
  });

  it('именованные клавиши — в словах `parseHotkey`', () => {
    expect(comboFromEvent(press({ key: ' ', code: 'Space', ctrlKey: true }), false)).toBe(
      'mod+space',
    );
    expect(comboFromEvent(press({ key: 'ArrowUp', code: 'ArrowUp', altKey: true }), false)).toBe(
      'alt+arrowup',
    );
    expect(comboFromEvent(press({ key: 'F2', code: 'F2' }), false)).toBe('f2');
    expect(
      comboFromEvent(press({ key: '+', code: 'Equal', shiftKey: true, ctrlKey: true }), false),
    ).toBe('mod+shift+plus');
  });

  it('мёртвая клавиша без буквы — не сочетание', () => {
    expect(keyFromEvent(press({ key: 'Dead', code: 'Quote' }))).toBeNull();
    expect(keyFromEvent(press({ key: 'Dead', code: 'KeyE' }))).toBe('e');
  });

  it('записанное срабатывает в useHotkey', () => {
    const event = press({ key: '?', code: 'Slash', shiftKey: true, ctrlKey: true });
    const combo = comboFromEvent(event, false)!;

    expect(combo).toBe('mod+shift+?');
    expect(matchHotkey(event, parseHotkey(combo), false)).toBe(true);
  });
});

describe('сравнение и нормализация', () => {
  it('порядок модификаторов и псевдонимы', () => {
    expect(normalizeCombo('Shift+Mod+K')).toBe('mod+shift+k');
    expect(normalizeCombo('ctrl+esc')).toBe('ctrl+escape');
    expect(normalizeCombo('mod+space')).toBe('mod+space');
  });

  it('`mod` и платформенная клавиша — одно и то же', () => {
    expect(sameCombo('mod+k', 'ctrl+k', false)).toBe(true);
    expect(sameCombo('mod+k', 'ctrl+k', true)).toBe(false);
    expect(sameCombo('mod+k', 'meta+k', true)).toBe(true);
  });

  it('конфликт со списком', () => {
    const entries = [
      { combo: 'mod+k', label: 'Палитра команд' },
      { combo: 'alt+arrowup', label: 'Предыдущий канал' },
    ];

    expect(findConflict('ctrl+k', entries, false)?.label).toBe('Палитра команд');
    expect(findConflict('mod+j', entries, false)).toBeNull();
  });
});

describe('needsModifier', () => {
  it('печатное без модификатора — нельзя; F-клавиши и стрелки — можно', () => {
    expect(needsModifier('k')).toBe(true);
    expect(needsModifier('shift+k')).toBe(true);
    expect(needsModifier('space')).toBe(true);
    expect(needsModifier('f2')).toBe(false);
    expect(needsModifier('arrowup')).toBe(false);
    expect(needsModifier('alt+k')).toBe(false);
  });
});

describe('modifiersLabel', () => {
  const mods = { mod: true, ctrl: false, meta: false, alt: false, shift: true };

  it('подпись зажатых модификаторов по платформе', () => {
    expect(modifiersLabel(mods, false)).toBe('Ctrl+Shift');
    expect(modifiersLabel(mods, true)).toBe('⇧⌘');
  });
});
