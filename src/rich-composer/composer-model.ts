/*
 * Модель документа композера — чистые функции без DOM. Документ — массив сегментов: текст и атомарные
 * токены (упоминание, канал, эмодзи). Позиция — смещение в «единицах»: символ текста (UTF-16, как у
 * DOM) — одна единица, токен — одна. Поэтому курсор не может встать внутрь токена по построению: между
 * позициями k и k + 1 токен целиком.
 */

export type ComposerMentionKind = 'user' | 'role';

export interface ComposerTextSegment {
  type: 'text';
  text: string;
}

export interface ComposerMentionSegment {
  type: 'mention';
  kind: ComposerMentionKind;
  /** Ник или имя роли — то, что уходит в текст: `@name` */
  name: string;
  /** Отображаемое имя в поле; без него — `name` */
  label?: string;
  /** Цвет роли (любой CSS-цвет) — как у `Mention color` */
  color?: string;
}

export interface ComposerChannelSegment {
  type: 'channel';
  name: string;
  label?: string;
}

export interface ComposerEmojiSegment {
  type: 'emoji';
  char: string;
  /** Шорткод без двоеточий — для сериализации `:smile:` */
  shortcode?: string;
}

export type ComposerToken = ComposerMentionSegment | ComposerChannelSegment | ComposerEmojiSegment;

export type ComposerSegment = ComposerTextSegment | ComposerToken;

export type ComposerDoc = readonly ComposerSegment[];

/** anchor — где выделение началось, focus — где курсор; совпадают — просто курсор */
export interface ComposerSelection {
  anchor: number;
  focus: number;
}

export type ComposerUnit = 'char' | 'word' | 'line';

export interface ComposerEditResult {
  doc: ComposerDoc;
  selection: ComposerSelection;
}

export const emptyComposerDoc: ComposerDoc = [];

export const caretAt = (position: number): ComposerSelection => ({
  anchor: position,
  focus: position,
});

export function isTextSegment(segment: ComposerSegment): segment is ComposerTextSegment {
  return segment.type === 'text';
}

export function segmentLength(segment: ComposerSegment): number {
  return segment.type === 'text' ? segment.text.length : 1;
}

export function docLength(doc: ComposerDoc): number {
  let length = 0;

  for (const segment of doc) length += segmentLength(segment);

  return length;
}

/** Без токенов и без видимого текста — отправлять нечего, ↑ открывает правку последнего */
export function isDocEmpty(doc: ComposerDoc): boolean {
  return doc.every((segment) => segment.type === 'text' && segment.text.trim() === '');
}

/** Соседние тексты слиты, пустых нет: у одного документа одна запись — сравнение и рендер проще */
export function normalizeDoc(segments: readonly ComposerSegment[]): ComposerSegment[] {
  const result: ComposerSegment[] = [];

  for (const segment of segments) {
    if (segment.type !== 'text') {
      result.push(segment);
      continue;
    }

    if (!segment.text) continue;

    const last = result.at(-1);

    if (last?.type === 'text')
      result[result.length - 1] = { type: 'text', text: last.text + segment.text };
    else result.push(segment);
  }

  return result;
}

export function selectionRange(selection: ComposerSelection): [number, number] {
  return selection.anchor <= selection.focus
    ? [selection.anchor, selection.focus]
    : [selection.focus, selection.anchor];
}

export function isCollapsed(selection: ComposerSelection): boolean {
  return selection.anchor === selection.focus;
}

const clamp = (value: number, max: number) => Math.min(Math.max(0, value), max);

export function clampSelection(doc: ComposerDoc, selection: ComposerSelection): ComposerSelection {
  const length = docLength(doc);

  return { anchor: clamp(selection.anchor, length), focus: clamp(selection.focus, length) };
}

/** Кусок документа [start, end): текст режется, токен входит, только если целиком внутри */
export function sliceDoc(doc: ComposerDoc, start: number, end: number): ComposerSegment[] {
  const result: ComposerSegment[] = [];
  let position = 0;

  for (const segment of doc) {
    const length = segmentLength(segment);
    const from = Math.max(start, position);
    const to = Math.min(end, position + length);

    if (from < to) {
      result.push(
        segment.type === 'text'
          ? { type: 'text', text: segment.text.slice(from - position, to - position) }
          : segment,
      );
    }

    position += length;
  }

  return normalizeDoc(result);
}

/** Основа всех правок: [start, end) заменяется вставкой */
export function replaceRange(
  doc: ComposerDoc,
  start: number,
  end: number,
  insert: readonly ComposerSegment[],
): ComposerSegment[] {
  const length = docLength(doc);

  return normalizeDoc([
    ...sliceDoc(doc, 0, clamp(start, length)),
    ...insert,
    ...sliceDoc(doc, clamp(end, length), length),
  ]);
}

/*
 * Вставляемый текст: переводы строк к `\n`, управляющие символы и нулевой ширины — прочь. Нулевой
 * пробел у нас — распорка у токенов в DOM (composer-dom.ts); пришедший извне спутал бы позиции.
 */
const ZERO_WIDTH = new Set([0x200b, 0xfeff]);

/** Перевод строки и табуляция остаются, остальное управляющее (код < 32, DEL) и нулевой ширины — нет */
function keepChar(char: string): boolean {
  const code = char.codePointAt(0) ?? 0;

  if (char === '\n' || char === '\t') return true;

  return code >= 32 && code !== 127 && !ZERO_WIDTH.has(code);
}

export function sanitizeText(text: string): string {
  return Array.from(text.replace(/\r\n?/g, '\n')).filter(keepChar).join('');
}

export function insertSegments(
  doc: ComposerDoc,
  selection: ComposerSelection,
  segments: readonly ComposerSegment[],
): ComposerEditResult {
  const [start, end] = selectionRange(selection);
  const inserted = normalizeDoc(segments);
  const next = replaceRange(doc, start, end, inserted);

  return { doc: next, selection: caretAt(start + docLength(inserted)) };
}

export function insertText(
  doc: ComposerDoc,
  selection: ComposerSelection,
  text: string,
): ComposerEditResult {
  return insertSegments(doc, selection, [{ type: 'text', text: sanitizeText(text) }]);
}

interface Located {
  segment: ComposerSegment;
  /** Позиция начала сегмента */
  start: number;
}

/** Сегмент, который занимает единицу [position, position + 1); за концом — null */
function unitAt(doc: ComposerDoc, position: number): Located | null {
  let start = 0;

  for (const segment of doc) {
    const length = segmentLength(segment);

    if (position >= start && position < start + length) return { segment, start };

    start += length;
  }

  return null;
}

let segmenter: Intl.Segmenter | null | undefined;

function graphemes(text: string): number[] {
  segmenter ??= typeof Intl.Segmenter === 'function' ? new Intl.Segmenter() : null;

  if (!segmenter) {
    // Без Segmenter — хотя бы не рвать суррогатные пары (эмодзи вне BMP)
    const bounds = [0];
    let index = 0;

    for (const char of text) {
      index += char.length;
      bounds.push(index);
    }

    return bounds;
  }

  return [...Array.from(segmenter.segment(text), (part) => part.index), text.length];
}

/** Граница графемы в тексте рядом с offset: «👩‍👩‍👧» и «е́» стираются и обходятся целиком */
function graphemeBoundary(text: string, offset: number, direction: -1 | 1): number {
  const bounds = graphemes(text);

  if (direction < 0) return [...bounds].reverse().find((bound) => bound < offset) ?? 0;

  return bounds.find((bound) => bound > offset) ?? text.length;
}

const isSpace = (char: string | undefined) => char !== undefined && /\s/u.test(char);

/** Символ в позиции (для текста) или null — токен или край */
function charAt(doc: ComposerDoc, position: number): string | null | undefined {
  const located = unitAt(doc, position);

  if (!located) return undefined;
  if (located.segment.type !== 'text') return null;

  return located.segment.text[position - located.start];
}

/**
 * Соседняя граница от позиции: на символ (графему), на слово (пробелы, затем слово или токен целиком),
 * на строку (до `\n`; стоя у самого `\n` — за него).
 */
export function boundary(
  doc: ComposerDoc,
  position: number,
  direction: -1 | 1,
  unit: ComposerUnit = 'char',
): number {
  const length = docLength(doc);
  const step = (at: number) => (direction < 0 ? at - 1 : at);
  let cursor = clamp(position, length);

  if (direction < 0 ? cursor === 0 : cursor === length) return cursor;

  if (unit === 'char') {
    const located = unitAt(doc, step(cursor));

    if (!located || located.segment.type !== 'text') return cursor + direction;

    return (
      located.start + graphemeBoundary(located.segment.text, cursor - located.start, direction)
    );
  }

  if (unit === 'line') {
    if (charAt(doc, step(cursor)) === '\n') return cursor + direction;

    while (direction < 0 ? cursor > 0 : cursor < length) {
      if (charAt(doc, step(cursor)) === '\n') break;

      cursor += direction;
    }

    return cursor;
  }

  while (
    (direction < 0 ? cursor > 0 : cursor < length) &&
    isSpace(charAt(doc, step(cursor)) ?? undefined)
  ) {
    cursor += direction;
  }

  // Токен — одно «слово»
  if (charAt(doc, step(cursor)) === null) return cursor + direction;

  while (direction < 0 ? cursor > 0 : cursor < length) {
    const char = charAt(doc, step(cursor));

    if (char === null || char === undefined || isSpace(char)) break;

    cursor += direction;
  }

  return cursor;
}

/** Backspace / Delete: выделение — стирается оно, иначе единица до или после курсора */
export function deleteContent(
  doc: ComposerDoc,
  selection: ComposerSelection,
  direction: -1 | 1,
  unit: ComposerUnit = 'char',
): ComposerEditResult {
  if (!isCollapsed(selection)) {
    const [start, end] = selectionRange(selection);

    return { doc: replaceRange(doc, start, end, []), selection: caretAt(start) };
  }

  const other = boundary(doc, selection.focus, direction, unit);
  const [start, end] =
    other < selection.focus ? [other, selection.focus] : [selection.focus, other];

  if (start === end) return { doc, selection };

  return { doc: replaceRange(doc, start, end, []), selection: caretAt(start) };
}

/**
 * Стрелки влево / вправо: по графемам, токен — один шаг. Без Shift выделение схлопывается к краю в
 * сторону движения, как в любом поле ввода.
 */
export function moveSelection(
  doc: ComposerDoc,
  selection: ComposerSelection,
  direction: -1 | 1,
  { extend = false, unit = 'char' }: { extend?: boolean; unit?: ComposerUnit } = {},
): ComposerSelection {
  if (!extend && !isCollapsed(selection)) {
    const [start, end] = selectionRange(selection);

    return caretAt(direction < 0 ? start : end);
  }

  const focus = boundary(doc, selection.focus, direction, unit);

  return extend ? { anchor: selection.anchor, focus } : caretAt(focus);
}

/** Обернуть выделение маркерами разметки (`**`, `_`); без выделения курсор встаёт между ними */
export function wrapSelection(
  doc: ComposerDoc,
  selection: ComposerSelection,
  before: string,
  after: string = before,
): ComposerEditResult {
  const [start, end] = selectionRange(selection);
  const inner = sliceDoc(doc, start, end);
  const next = replaceRange(doc, start, end, [
    { type: 'text', text: before },
    ...inner,
    { type: 'text', text: after },
  ]);
  const innerStart = start + before.length;

  return {
    doc: next,
    selection: { anchor: innerStart, focus: innerStart + (end - start) },
  };
}

export interface ComposerTriggerRule {
  /** Знак, с которого начинается подсказка: `@`, `#`, `:` */
  char: string;
  /** Сколько символов после знака нужно, чтобы открыть список: у `:` — 2, иначе «время: 5» открывало бы эмодзи */
  minQuery?: number;
}

export interface ComposerTrigger {
  char: string;
  query: string;
  /** Позиция знака */
  start: number;
  /** Позиция курсора — конец запроса */
  end: number;
}

/*
 * Знак подсказки — в начале текста или после пробела и открывающей скобки: в `mail@host` и `C#` её нет.
 * Запрос — те же символы, что у ника в разборе сообщения (markdown-plugins.ts), плюс `+` для `:+1:`.
 */
const TRIGGER_BEFORE = /(?:^|[\s([{«"'])$/u;
const QUERY = /^[\p{L}\p{N}_.+-]*$/u;
const MAX_QUERY = 32;

/** Открытая подсказка у курсора: знак и набранное после него в том же текстовом сегменте */
export function findTrigger(
  doc: ComposerDoc,
  caret: number,
  rules: readonly ComposerTriggerRule[],
): ComposerTrigger | null {
  let start = 0;

  for (const segment of doc) {
    const length = segmentLength(segment);

    if (segment.type === 'text' && caret > start && caret <= start + length) {
      const before = segment.text.slice(0, caret - start);

      for (
        let index = before.length - 1;
        index >= Math.max(0, before.length - MAX_QUERY - 1);
        index--
      ) {
        const rule = rules.find((candidate) => candidate.char === before[index]);
        const query = before.slice(index + 1);

        if (!QUERY.test(query)) return null;
        if (!rule) continue;
        if (!TRIGGER_BEFORE.test(before.slice(0, index))) return null;
        if (query.length < (rule.minQuery ?? 0)) return null;

        return { char: rule.char, query, start: start + index, end: caret };
      }

      return null;
    }

    start += length;
  }

  return null;
}

/**
 * Выбор подсказки: знак с запросом меняется на токен и пробел за ним. Пробел уже стоит — новый не
 * добавляется, курсор встаёт за него: в обоих случаях можно сразу печатать дальше.
 */
export function applyTrigger(
  doc: ComposerDoc,
  trigger: ComposerTrigger,
  token: ComposerToken,
): ComposerEditResult {
  const space: ComposerSegment[] =
    charAt(doc, trigger.end) === ' ' ? [] : [{ type: 'text', text: ' ' }];
  const next = replaceRange(doc, trigger.start, trigger.end, [token, ...space]);

  return { doc: next, selection: caretAt(trigger.start + 2) };
}

export function sameDoc(a: ComposerDoc, b: ComposerDoc): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;

  return a.every((segment, index) => {
    const other = b[index];

    if (!other || other.type !== segment.type) return false;
    if (segment.type === 'text') return segment.text === (other as ComposerTextSegment).text;

    return JSON.stringify(segment) === JSON.stringify(other);
  });
}
