import { pushRecent } from '../command-palette/command-filter';

import type { EmojiCategory } from './emoji-types';

let pending: Promise<EmojiCategory[]> | null = null;

/**
 * Набор эмодзи — отдельный чанк (~30 kB исходника): грузится при первом открытии пикера или раньше, по
 * наведению на триггер. Промис общий для всех пикеров; после ошибки сбрасывается, чтобы «повторить» сработало.
 * Годится и для словаря шорткодов `Markdown`: `Object.fromEntries(emojis.map((e) => [e.shortcode, e.char]))`.
 */
export function loadEmojiData(): Promise<EmojiCategory[]> {
  pending ??= import('./emoji-data').then(
    (module) => module.emojiCategories,
    (error: unknown) => {
      pending = null;
      throw error;
    },
  );

  return pending;
}

/*
 * «Недавние» живут в памяти модуля — общие для всех пикеров вкладки и переживают закрытие поповера. С ключом
 * хранилища — ещё и в localStorage; он может быть недоступен (приватный режим, запрет) — тогда только память.
 */
let memory: string[] = [];

export function readRecent(storageKey?: string): string[] {
  if (!storageKey) return memory;

  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]');

    if (Array.isArray(parsed)) {
      memory = parsed.filter((value): value is string => typeof value === 'string');
    }
  } catch {
    // Хранилище недоступно или испорчено — остаётся то, что в памяти
  }

  return memory;
}

export function rememberRecent(char: string, limit: number, storageKey?: string): string[] {
  memory = pushRecent(memory, char, limit);

  if (storageKey) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(memory));
    } catch {
      // Не сохранилось — «недавние» проживут до перезагрузки вкладки
    }
  }

  return memory;
}
