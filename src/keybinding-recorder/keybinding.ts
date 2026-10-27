import { parseHotkey, type HotkeyEvent } from '../lib/hotkey';

/*
 * Запись сочетания из события в строку формата `useHotkey`: `mod+shift+k`. `mod` — Ctrl на Windows и
 * Linux, ⌘ на Apple: записанное на одной платформе работает на другой. Буквы и цифры — по
 * `event.code` (физическая клавиша), как сравнивает `matchHotkey`: в русской раскладке Ctrl+K приходит с
 * `key: 'л'`, а записаться должно `mod+k`.
 */

const MODIFIER_KEYS = new Set([
  'Control',
  'Shift',
  'Alt',
  'AltGraph',
  'Meta',
  'OS',
  'Super',
  'Hyper',
  'Fn',
  'CapsLock',
]);

/** Имена клавиш, которые `parseHotkey` понимает, — в нижнем регистре, пробел и плюс словами */
const NAMED_KEYS: Record<string, string> = {
  ' ': 'space',
  '+': 'plus',
  Escape: 'escape',
  Enter: 'enter',
  Tab: 'tab',
  Backspace: 'backspace',
  Delete: 'delete',
  Insert: 'insert',
  Home: 'home',
  End: 'end',
  PageUp: 'pageup',
  PageDown: 'pagedown',
  ArrowUp: 'arrowup',
  ArrowDown: 'arrowdown',
  ArrowLeft: 'arrowleft',
  ArrowRight: 'arrowright',
};

export interface ComboModifiers {
  mod: boolean;
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
}

/** Модификаторы события: «главный» (Ctrl / ⌘) записывается как `mod` */
export function modifiersFromEvent(event: HotkeyEvent, apple: boolean): ComboModifiers {
  return {
    mod: apple ? event.metaKey : event.ctrlKey,
    ctrl: apple && event.ctrlKey,
    meta: !apple && event.metaKey,
    alt: event.altKey,
    shift: event.shiftKey,
  };
}

/** Клавиша события без модификаторов; нажат только модификатор — null */
export function keyFromEvent(event: HotkeyEvent): string | null {
  if (MODIFIER_KEYS.has(event.key)) return null;

  const named =
    NAMED_KEYS[event.key] ?? (/^F\d{1,2}$/.test(event.key) ? event.key.toLowerCase() : null);

  // Мёртвая клавиша (акцент в европейских раскладках) символа не даёт — только буква по физической клавише
  if (event.key === 'Dead' || event.key === 'Unidentified') return physical(event.code);

  return physical(event.code) ?? named ?? singleChar(event.key);
}

/** Буквы и цифры — по физической клавише; модификатор сам по себе — не клавиша */
function physical(code: string): string | null {
  const letter = /^Key([A-Z])$/.exec(code);

  if (letter) return letter[1]!.toLowerCase();

  const digit = /^Digit(\d)$/.exec(code);

  return digit ? digit[1]! : null;
}

function singleChar(key: string): string | null {
  return Array.from(key).length === 1 ? key.toLowerCase() : null;
}

function joinCombo(modifiers: ComboModifiers, key: string): string {
  return [
    modifiers.mod && 'mod',
    modifiers.ctrl && 'ctrl',
    modifiers.meta && 'meta',
    modifiers.alt && 'alt',
    modifiers.shift && 'shift',
    key,
  ]
    .filter(Boolean)
    .join('+');
}

/** Сочетание из нажатия; одни модификаторы — null (запись ещё идёт) */
export function comboFromEvent(event: HotkeyEvent, apple: boolean): string | null {
  const key = keyFromEvent(event);

  if (!key || MODIFIER_KEYS.has(event.key)) return null;

  return joinCombo(modifiersFromEvent(event, apple), key);
}

const toKeyName = (key: string) => NAMED_KEYS[key] ?? key;

/** Одна запись на сочетание: порядок модификаторов и имена клавиш как у `comboFromEvent` */
export function normalizeCombo(combo: string): string {
  const hotkey = parseHotkey(combo);

  return joinCombo(hotkey, toKeyName(hotkey.key));
}

/** Сочетания совпадают на этой платформе: `mod+k` и `ctrl+k` на Windows — одно и то же */
export function sameCombo(a: string, b: string, apple: boolean): boolean {
  const resolve = (combo: string) => {
    const hotkey = parseHotkey(combo);

    return [
      hotkey.ctrl || (hotkey.mod && !apple),
      hotkey.meta || (hotkey.mod && apple),
      hotkey.alt,
      hotkey.shift,
      toKeyName(hotkey.key),
    ].join('|');
  };

  return resolve(a) === resolve(b);
}

/**
 * Без модификатора печатное (буква, цифра, знак, пробел) — это ввод текста, а не сочетание: оно
 * срабатывало бы посреди набора. Shift не в счёт — Shift+A это просто «A». F-клавиши и стрелки можно.
 */
export function needsModifier(combo: string): boolean {
  const hotkey = parseHotkey(combo);

  if (hotkey.mod || hotkey.ctrl || hotkey.meta || hotkey.alt) return false;

  return hotkey.key === ' ' || Array.from(hotkey.key).length === 1;
}

export interface KeybindingEntry {
  combo: string;
  /** Что за действие — для текста «уже занято» */
  label: string;
}

/** Занято ли сочетание другим действием; помогает собрать проверку `conflict` из списка настроек */
export function findConflict(
  combo: string,
  entries: readonly KeybindingEntry[],
  apple: boolean,
): KeybindingEntry | null {
  return entries.find((entry) => sameCombo(entry.combo, combo, apple)) ?? null;
}

const APPLE_GLYPHS = ['⌃', '⌥', '⇧', '⌘'] as const;

/** Подпись зажатых модификаторов во время записи: «Ctrl+Shift+…», на Apple — «⇧⌘…» */
export function modifiersLabel(modifiers: ComboModifiers, apple: boolean): string {
  if (apple) {
    const [ctrl, alt, shift, cmd] = APPLE_GLYPHS;

    return [
      modifiers.ctrl && ctrl,
      modifiers.alt && alt,
      modifiers.shift && shift,
      modifiers.mod && cmd,
    ]
      .filter(Boolean)
      .join('');
  }

  return [
    modifiers.mod && 'Ctrl',
    modifiers.meta && 'Win',
    modifiers.alt && 'Alt',
    modifiers.shift && 'Shift',
  ]
    .filter(Boolean)
    .join('+');
}

/** Модификаторы платформы через запятую — для подсказки «добавьте модификатор» */
export function platformModifiers(apple: boolean): string {
  return apple ? '⌘, ⌥, ⌃' : 'Ctrl, Alt';
}
