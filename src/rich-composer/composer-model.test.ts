import { describe, expect, it } from 'vitest';

import {
  applyTrigger,
  boundary,
  caretAt,
  deleteContent,
  docLength,
  findTrigger,
  insertSegments,
  insertText,
  isDocEmpty,
  moveSelection,
  normalizeDoc,
  replaceRange,
  sanitizeText,
  sliceDoc,
  wrapSelection,
  type ComposerDoc,
  type ComposerToken,
} from './composer-model';

const anna: ComposerToken = { type: 'mention', kind: 'user', name: 'anna', label: 'Анна' };
const general: ComposerToken = { type: 'channel', name: 'general' };
const smile: ComposerToken = { type: 'emoji', char: '😄', shortcode: 'smile' };

const text = (value: string) => ({ type: 'text' as const, text: value });

// «привет @Анна как дела»: 7 символов, токен, 10 символов
const doc: ComposerDoc = [text('привет '), anna, text(' как дела')];

const rules = [{ char: '@' }, { char: '#' }, { char: ':', minQuery: 2 }];

describe('длина и нормализация', () => {
  it('токен — одна единица', () => {
    expect(docLength(doc)).toBe(17);
  });

  it('соседние тексты сливаются, пустые уходят', () => {
    expect(normalizeDoc([text('a'), text(''), text('b'), anna, text('')])).toEqual([
      text('ab'),
      anna,
    ]);
  });

  it('пустой — без токенов и видимого текста', () => {
    expect(isDocEmpty([])).toBe(true);
    expect(isDocEmpty([text('  \n ')])).toBe(true);
    expect(isDocEmpty([smile])).toBe(false);
  });
});

describe('срезы и замена', () => {
  it('срез режет текст и берёт токен целиком', () => {
    expect(sliceDoc(doc, 5, 9)).toEqual([text('т '), anna, text(' ')]);
  });

  it('замена диапазона через токен', () => {
    expect(replaceRange(doc, 6, 9, [text('!')])).toEqual([text('привет!как дела')]);
  });

  it('за пределами — прижимается к краям', () => {
    expect(replaceRange([text('ab')], -5, 99, [general])).toEqual([general]);
  });
});

describe('вставка', () => {
  it('текст — курсор за вставкой', () => {
    const result = insertText(doc, caretAt(7), 'дорогая ');

    expect(result.doc).toEqual([text('привет дорогая '), anna, text(' как дела')]);
    expect(result.selection).toEqual(caretAt(15));
  });

  it('вставка заменяет выделение', () => {
    const result = insertText(doc, { anchor: 9, focus: 6 }, '-');

    expect(result.doc).toEqual([text('привет-как дела')]);
    expect(result.selection).toEqual(caretAt(7));
  });

  it('токен между двумя токенами', () => {
    const result = insertSegments([anna, general], caretAt(1), [smile]);

    expect(result.doc).toEqual([anna, smile, general]);
    expect(result.selection).toEqual(caretAt(2));
  });

  it('CRLF и нулевые пробелы чистятся', () => {
    const zeroWidth = String.fromCharCode(0x200b);
    const bell = String.fromCharCode(7);

    expect(sanitizeText(['a', 'b', `${zeroWidth}c${bell}`].join('\r\n'))).toBe('a\nb\nc');
  });
});

describe('удаление вокруг токенов', () => {
  it('Backspace сразу за токеном стирает его целиком', () => {
    const result = deleteContent(doc, caretAt(8), -1);

    expect(result.doc).toEqual([text('привет  как дела')]);
    expect(result.selection).toEqual(caretAt(7));
  });

  it('Delete перед токеном стирает его целиком', () => {
    const result = deleteContent(doc, caretAt(7), 1);

    expect(result.doc).toEqual([text('привет  как дела')]);
    expect(result.selection).toEqual(caretAt(7));
  });

  it('Backspace в начале — ничего', () => {
    const result = deleteContent(doc, caretAt(0), -1);

    expect(result.doc).toBe(doc);
  });

  it('графема из нескольких кодовых точек стирается целиком', () => {
    const family = '👩‍👩‍👧';
    const result = deleteContent([text(`a${family}`)], caretAt(1 + family.length), -1);

    expect(result.doc).toEqual([text('a')]);
  });

  it('Ctrl+Backspace: слово, затем токен как слово', () => {
    const afterWord = deleteContent(doc, caretAt(17), -1, 'word');

    expect(afterWord.doc).toEqual([text('привет '), anna, text(' как ')]);

    const afterToken = deleteContent([text('привет '), anna, text(' ')], caretAt(9), -1, 'word');

    expect(afterToken.doc).toEqual([text('привет ')]);
  });

  it('удаление до начала строки', () => {
    const lines: ComposerDoc = [text('раз\nдва '), anna];

    expect(deleteContent(lines, caretAt(9), -1, 'line').doc).toEqual([text('раз\n')]);
    expect(deleteContent([text('раз\n')], caretAt(4), -1, 'line').doc).toEqual([text('раз')]);
  });
});

describe('движение курсора', () => {
  it('токен — один шаг стрелкой', () => {
    expect(moveSelection(doc, caretAt(7), 1)).toEqual(caretAt(8));
    expect(moveSelection(doc, caretAt(8), -1)).toEqual(caretAt(7));
  });

  it('без Shift выделение схлопывается в сторону движения', () => {
    expect(moveSelection(doc, { anchor: 2, focus: 9 }, -1)).toEqual(caretAt(2));
    expect(moveSelection(doc, { anchor: 9, focus: 2 }, 1)).toEqual(caretAt(9));
  });

  it('с Shift двигается фокус, якорь стоит', () => {
    expect(moveSelection(doc, caretAt(7), 1, { extend: true })).toEqual({ anchor: 7, focus: 8 });
  });

  it('граница слова пропускает пробелы', () => {
    expect(boundary(doc, 17, -1, 'word')).toBe(13);
    expect(boundary(doc, 9, -1, 'word')).toBe(7);
  });
});

describe('разметка', () => {
  it('обёртка выделения, выделено внутреннее', () => {
    const result = wrapSelection([text('жирный текст')], { anchor: 0, focus: 6 }, '**');

    expect(result.doc).toEqual([text('**жирный** текст')]);
    expect(result.selection).toEqual({ anchor: 2, focus: 8 });
  });

  it('без выделения курсор встаёт между маркерами', () => {
    const result = wrapSelection([], caretAt(0), '`');

    expect(result.doc).toEqual([text('``')]);
    expect(result.selection).toEqual(caretAt(1));
  });
});

describe('подсказки', () => {
  it('@ в начале и после пробела', () => {
    expect(findTrigger([text('@ан')], 3, rules)).toEqual({
      char: '@',
      query: 'ан',
      start: 0,
      end: 3,
    });
    expect(findTrigger([text('привет #ге')], 10, rules)).toEqual({
      char: '#',
      query: 'ге',
      start: 7,
      end: 10,
    });
  });

  it('посреди слова и через пробел — нет', () => {
    expect(findTrigger([text('mail@host')], 9, rules)).toBeNull();
    expect(findTrigger([text('@anna привет')], 12, rules)).toBeNull();
  });

  it('у двоеточия минимум два символа', () => {
    expect(findTrigger([text('время: 5')], 6, rules)).toBeNull();
    expect(findTrigger([text(':s')], 2, rules)).toBeNull();
    expect(findTrigger([text(':sm')], 3, rules)?.query).toBe('sm');
  });

  it('позиция учитывает токены перед текстом', () => {
    expect(findTrigger([anna, text(' @b')], 4, rules)).toEqual({
      char: '@',
      query: 'b',
      start: 2,
      end: 4,
    });
  });

  it('выбор меняет запрос на токен с пробелом', () => {
    const source: ComposerDoc = [text('привет @ан')];
    const trigger = findTrigger(source, 10, rules)!;
    const result = applyTrigger(source, trigger, anna);

    expect(result.doc).toEqual([text('привет '), anna, text(' ')]);
    expect(result.selection).toEqual(caretAt(9));
  });

  it('пробел за запросом уже есть — второй не добавляется', () => {
    const source: ComposerDoc = [text('@ан привет')];
    const result = applyTrigger(source, { char: '@', query: 'ан', start: 0, end: 3 }, anna);

    expect(result.doc).toEqual([anna, text(' привет')]);
    expect(result.selection).toEqual(caretAt(2));
  });
});
