import { describe, expect, it } from 'vitest';

import { composerTextLength, composerToMarkdown, markdownToComposer } from './composer-markdown';
import type { ComposerDoc, ComposerToken } from './composer-model';

const text = (value: string) => ({ type: 'text' as const, text: value });
const anna: ComposerToken = { type: 'mention', kind: 'user', name: 'anna' };
const general: ComposerToken = { type: 'channel', name: 'general' };
const smile: ComposerToken = { type: 'emoji', char: '😄', shortcode: 'smile' };

describe('composerToMarkdown', () => {
  it('упоминание — @ник, канал — #имя, эмодзи — символ', () => {
    expect(
      composerToMarkdown([text('привет '), anna, text(', загляни в '), general, text(' '), smile]),
    ).toBe('привет @anna, загляни в #general 😄');
  });

  it('подпись не уходит в текст — только ник', () => {
    expect(
      composerToMarkdown([{ type: 'mention', kind: 'user', name: 'anna', label: 'Анна В.' }]),
    ).toBe('@anna');
  });

  it('эмодзи шорткодом — по опции', () => {
    expect(composerToMarkdown([smile], { emoji: 'shortcode' })).toBe(':smile:');
    expect(composerToMarkdown([{ type: 'emoji', char: '🫠' }], { emoji: 'shortcode' })).toBe('🫠');
  });

  it('ник не склеивается с буквой вплотную', () => {
    expect(composerToMarkdown([anna, text('s')])).toBe('@anna s');
    expect(composerToMarkdown([text('mail'), anna])).toBe('mail @anna');
    expect(composerToMarkdown([anna, general])).toBe('@anna #general');
  });

  it('точка в конце предложения не отделяется', () => {
    expect(composerToMarkdown([text('спроси '), anna, text('.')])).toBe('спроси @anna.');
  });
});

describe('markdownToComposer', () => {
  it('упоминания и каналы — токены', () => {
    expect(markdownToComposer('привет @anna, загляни в #general')).toEqual([
      text('привет '),
      anna,
      text(', загляни в '),
      general,
    ]);
  });

  it('резолвер даёт подпись и роль, null оставляет текст', () => {
    const doc = markdownToComposer('@mods и @nobody', {
      resolve: (_kind, name) =>
        name === 'mods' ? { kind: 'role', label: 'Модераторы', color: 'tomato' } : null,
    });

    expect(doc).toEqual([
      { type: 'mention', kind: 'role', name: 'mods', label: 'Модераторы', color: 'tomato' },
      text(' и @nobody'),
    ]);
  });

  it('шорткоды по словарю', () => {
    expect(markdownToComposer('ок :smile: :nope:', { emoji: { smile: '😄' } })).toEqual([
      text('ок '),
      smile,
      text(' :nope:'),
    ]);
  });

  it('в коде упоминаний нет', () => {
    expect(markdownToComposer('`@anna` и ```\n#general\n``` @anna')).toEqual([
      text('`@anna` и ```\n#general\n``` '),
      anna,
    ]);
  });

  it('пунктуация в конце ника — не часть ника', () => {
    expect(markdownToComposer('спроси @anna.')).toEqual([text('спроси '), anna, text('.')]);
  });
});

describe('туда и обратно', () => {
  const cases: Array<[string, ComposerDoc]> = [
    ['пусто', []],
    ['текст со строками', [text('раз\nдва\n')]],
    ['токены подряд с пробелами', [anna, text(' '), general, text(' ')]],
    ['разметка остаётся текстом', [text('**жирно** '), anna, text(' _курсив_')]],
  ];

  it.each(cases)('%s', (_name, doc) => {
    expect(markdownToComposer(composerToMarkdown(doc))).toEqual(doc);
  });
});

describe('composerTextLength', () => {
  it('считает кодовые точки отправляемого текста', () => {
    expect(composerTextLength([anna, text(' '), smile])).toBe(7);
  });
});
