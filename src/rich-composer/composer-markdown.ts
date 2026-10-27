import { splitText } from '../markdown/markdown-plugins';

import {
  normalizeDoc,
  type ComposerDoc,
  type ComposerMentionKind,
  type ComposerSegment,
} from './composer-model';

/*
 * Документ композера ⇄ текст сообщения в синтаксисе `Markdown`: `@ник`, `#канал`, эмодзи символом
 * (или `:шорткод:`). Разметку (`**`, `_`, код) композер не разбирает — она остаётся текстом, рендер
 * сообщения разберёт её сам. Разбор — тем же `splitText`, что у рендера, чтобы черновик и сообщение
 * понимали упоминание одинаково.
 */

export interface ComposerSerializeOptions {
  /** `char` — сам символ (по умолчанию: читается везде), `shortcode` — `:smile:`, если шорткод есть */
  emoji?: 'char' | 'shortcode';
}

/** Ник «прилипает» к соседней букве: `@anna` + `s` прочиталось бы как `@annas`, `mail` + `@anna` — как адрес */
const NAME_CHAR_AFTER = /^[.-]*[\p{L}\p{N}_]/u;
const NAME_CHAR_BEFORE = /[\p{L}\p{N}_]$/u;

function tokenText(
  segment: Exclude<ComposerSegment, { type: 'text' }>,
  options: ComposerSerializeOptions,
) {
  if (segment.type === 'emoji') {
    return options.emoji === 'shortcode' && segment.shortcode
      ? `:${segment.shortcode}:`
      : segment.char;
  }

  return (segment.type === 'channel' ? '#' : '@') + segment.name;
}

/**
 * Текст сообщения из документа. Упоминание отделяется пробелом от буквы вплотную — иначе разбор
 * склеил бы его с соседним словом и потерял.
 */
export function composerToMarkdown(
  doc: ComposerDoc,
  options: ComposerSerializeOptions = {},
): string {
  let result = '';
  let previousWasName = false;

  for (const segment of doc) {
    if (segment.type === 'text') {
      result +=
        previousWasName && NAME_CHAR_AFTER.test(segment.text) ? ` ${segment.text}` : segment.text;
      previousWasName = false;
      continue;
    }

    const text = tokenText(segment, options);
    const isName = segment.type !== 'emoji';
    const glued = isName && (NAME_CHAR_BEFORE.test(result) || previousWasName);

    result += glued ? ` ${text}` : text;
    previousWasName = isName;
  }

  return result;
}

export interface ComposerParseResolved {
  /** Ник оказался ролью */
  kind?: ComposerMentionKind;
  label?: string;
  color?: string;
}

export interface ComposerParseOptions {
  /**
   * Что за упоминание: отображаемое имя, роль, цвет. `null` — не токен, остаётся текстом. Без
   * резолвера каждое `@ник` и `#канал` — токен с подписью по имени
   */
  resolve?: (kind: 'user' | 'channel', name: string) => ComposerParseResolved | null | undefined;
  /** Словарь шорткодов `{ smile: '😄' }`: `:smile:` станет токеном эмодзи */
  emoji?: Readonly<Record<string, string>>;
}

/** Код (``` и `) — как есть: `@ник` внутри него в сообщении тоже не упоминание */
const CODE = /(```[\s\S]*?```|`[^`\n]*`)/;

/** Черновик из текста сообщения: правка своего сообщения, восстановление черновика */
export function markdownToComposer(
  text: string,
  options: ComposerParseOptions = {},
): ComposerSegment[] {
  const segments: ComposerSegment[] = [];

  text.split(CODE).forEach((part, index) => {
    // split с группой: нечётные куски — код
    if (index % 2 === 1) {
      segments.push({ type: 'text', text: part });

      return;
    }

    for (const piece of splitText(part, { mentions: true, emoji: options.emoji })) {
      if (piece.type === 'text') {
        segments.push({ type: 'text', text: piece.value });
        continue;
      }

      if (piece.type === 'emoji') {
        segments.push({ type: 'emoji', char: piece.value, shortcode: piece.shortcode });
        continue;
      }

      const prefix = piece.kind === 'channel' ? '#' : '@';
      const resolved = options.resolve ? options.resolve(piece.kind, piece.name) : {};

      if (!resolved) {
        segments.push({ type: 'text', text: prefix + piece.name });
        continue;
      }

      segments.push(
        piece.kind === 'channel'
          ? {
              type: 'channel',
              name: piece.name,
              ...(resolved.label ? { label: resolved.label } : {}),
            }
          : {
              type: 'mention',
              kind: resolved.kind ?? 'user',
              name: piece.name,
              ...(resolved.label ? { label: resolved.label } : {}),
              ...(resolved.color ? { color: resolved.color } : {}),
            },
      );
    }
  });

  return normalizeDoc(segments);
}

/** Длина для счётчика лимита — в символах (кодовых точках) того текста, что уйдёт на сервер */
export function composerTextLength(doc: ComposerDoc, options?: ComposerSerializeOptions): number {
  return Array.from(composerToMarkdown(doc, options)).length;
}
