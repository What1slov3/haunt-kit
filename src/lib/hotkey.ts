/*
 * Сочетания клавиш строкой: `'mod+k'`, `'shift+?'`, `'escape'`. `mod` — ⌘ на macOS и Ctrl на остальных:
 * одно описание сочетания на обе платформы, как в Linear и VS Code.
 */

export interface Hotkey {
  mod: boolean;
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
  /** Клавиша в нижнем регистре: `k`, `5`, `?`, `escape`, `arrowup` */
  key: string;
}

/** Достаточно полей события, чтобы проверять сочетание без DOM — так функции тестируются в чистом виде */
export type HotkeyEvent = Pick<
  KeyboardEvent,
  'key' | 'code' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'
>;

const MODIFIERS = new Set(['mod', 'ctrl', 'control', 'meta', 'cmd', 'alt', 'option', 'shift']);

const KEY_ALIASES: Record<string, string> = {
  esc: 'escape',
  return: 'enter',
  space: ' ',
  up: 'arrowup',
  down: 'arrowdown',
  left: 'arrowleft',
  right: 'arrowright',
  del: 'delete',
  plus: '+',
};

export function parseHotkey(combo: string): Hotkey {
  // `+` как клавиша пишется в конце: `mod++` — последняя часть пустая
  const parts = combo.toLowerCase().split('+');
  const rawKey = parts.at(-1) === '' ? '+' : (parts.at(-1) ?? '');
  const modifiers = new Set(parts.slice(0, parts.at(-1) === '' ? -2 : -1));

  for (const modifier of modifiers) {
    if (!MODIFIERS.has(modifier))
      throw new Error(`Неизвестный модификатор «${modifier}» в «${combo}»`);
  }

  return {
    mod: modifiers.has('mod'),
    ctrl: modifiers.has('ctrl') || modifiers.has('control'),
    meta: modifiers.has('meta') || modifiers.has('cmd'),
    alt: modifiers.has('alt') || modifiers.has('option'),
    shift: modifiers.has('shift'),
    key: KEY_ALIASES[rawKey] ?? rawKey,
  };
}

export function isApplePlatform(platform: string): boolean {
  return /mac|iphone|ipad|ipod/i.test(platform);
}

/** Платформа текущего окна; вне браузера (тесты, SSR) — не Apple */
export function currentPlatform(): string {
  if (typeof navigator === 'undefined') return '';

  const data = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;

  return data?.platform || navigator.platform || '';
}

/**
 * Буквы и цифры сравниваются по `code` (физическая клавиша), а не по `key`: в русской раскладке Ctrl+K
 * приходит с `key: 'л'`, и сочетание молча не срабатывало бы у большинства наших пользователей.
 */
function physicalCode(key: string): string | null {
  if (/^[a-z]$/.test(key)) return `Key${key.toUpperCase()}`;
  if (/^[0-9]$/.test(key)) return `Digit${key}`;

  return null;
}

export function matchHotkey(event: HotkeyEvent, hotkey: Hotkey, apple: boolean): boolean {
  const wantCtrl = hotkey.ctrl || (hotkey.mod && !apple);
  const wantMeta = hotkey.meta || (hotkey.mod && apple);

  if (event.ctrlKey !== wantCtrl || event.metaKey !== wantMeta || event.altKey !== hotkey.alt) {
    return false;
  }

  const code = physicalCode(hotkey.key);

  if (code) return event.code === code && event.shiftKey === hotkey.shift;

  const key = event.key.toLowerCase();

  // Символ вроде `?` уже набран с Shift — требовать его отдельно значило бы никогда не совпасть
  if (hotkey.key.length === 1) return key === hotkey.key && (!hotkey.shift || event.shiftKey);

  return key === hotkey.key && event.shiftKey === hotkey.shift;
}

const APPLE_GLYPHS = { ctrl: '⌃', alt: '⌥', shift: '⇧', meta: '⌘' };

const KEY_LABELS: Record<string, string> = {
  escape: 'Esc',
  enter: 'Enter',
  ' ': 'Space',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  backspace: 'Backspace',
  delete: 'Del',
  tab: 'Tab',
  pageup: 'PgUp',
  pagedown: 'PgDn',
  home: 'Home',
  end: 'End',
};

/** Части сочетания для подписи: `['Ctrl', 'Shift', 'K']`; на Apple — значки в порядке macOS (⌃⌥⇧⌘) */
export function hotkeyParts(combo: string, apple: boolean): string[] {
  const hotkey = parseHotkey(combo);
  const ctrl = hotkey.ctrl || (hotkey.mod && !apple);
  const meta = hotkey.meta || (hotkey.mod && apple);
  const key = KEY_LABELS[hotkey.key] ?? hotkey.key.toUpperCase();

  if (apple) {
    return [
      ...(ctrl ? [APPLE_GLYPHS.ctrl] : []),
      ...(hotkey.alt ? [APPLE_GLYPHS.alt] : []),
      ...(hotkey.shift ? [APPLE_GLYPHS.shift] : []),
      ...(meta ? [APPLE_GLYPHS.meta] : []),
      key,
    ];
  }

  return [
    ...(ctrl ? ['Ctrl'] : []),
    ...(meta ? ['Win'] : []),
    ...(hotkey.alt ? ['Alt'] : []),
    ...(hotkey.shift ? ['Shift'] : []),
    key,
  ];
}

/** Подпись сочетания для `Kbd` и `shortcut`: `Ctrl+K` или `⌘K` */
export function formatHotkey(combo: string, apple = isApplePlatform(currentPlatform())): string {
  return hotkeyParts(combo, apple).join(apple ? '' : '+');
}

/**
 * Фокус в месте, где клавиши — это ввод текста. Флажки, радио и кнопки-инпуты текст не принимают, на них
 * сочетания работают.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  // closest — на случай jsdom, где isContentEditable не реализован
  if (
    target.isContentEditable ||
    target.closest('[contenteditable=""], [contenteditable="true"]')
  ) {
    return true;
  }

  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;

  if (target instanceof HTMLInputElement) {
    return !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file'].includes(
      target.type,
    );
  }

  return false;
}
