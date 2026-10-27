import { describe, expect, it } from 'vitest';

import {
  isSafeUrl,
  rehypeRawAsText,
  remarkHauntSyntax,
  splitText,
  wrapSpoilers,
  type MdNode,
} from './markdown-plugins';

const text = (value: string): MdNode => ({ type: 'text', value });

describe('splitText', () => {
  it('оставляет обычный текст одним куском', () => {
    expect(splitText('просто текст', { mentions: true })).toEqual([
      { type: 'text', value: 'просто текст' },
    ]);
  });

  it('находит упоминания ника и канала', () => {
    expect(splitText('привет @ваня, загляни в #общий-чат', { mentions: true })).toEqual([
      { type: 'text', value: 'привет ' },
      { type: 'mention', kind: 'user', name: 'ваня' },
      { type: 'text', value: ', загляни в ' },
      { type: 'mention', kind: 'channel', name: 'общий-чат' },
    ]);
  });

  it('не считает упоминанием середину слова: почта, C#', () => {
    expect(splitText('mail@host и C#', { mentions: true })).toEqual([
      { type: 'text', value: 'mail@host и C#' },
    ]);
  });

  it('отрезает точку и дефис в конце ника', () => {
    expect(splitText('спроси @vanya.', { mentions: true })).toEqual([
      { type: 'text', value: 'спроси ' },
      { type: 'mention', kind: 'user', name: 'vanya' },
      { type: 'text', value: '.' },
    ]);
  });

  it('без флага mentions упоминания остаются текстом', () => {
    expect(splitText('@ваня', {})).toEqual([{ type: 'text', value: '@ваня' }]);
  });

  it('заменяет шорткоды из словаря', () => {
    expect(splitText('ок :smile: :нет:', { emoji: { smile: '😄' } })).toEqual([
      { type: 'text', value: 'ок ' },
      { type: 'emoji', shortcode: 'smile', value: '😄' },
      { type: 'text', value: ' :нет:' },
    ]);
  });

  it('после неизвестного шорткода закрывающее двоеточие открывает следующий', () => {
    expect(splitText(':nope:smile:', { emoji: { smile: '😄' } })).toEqual([
      { type: 'text', value: ':nope' },
      { type: 'emoji', shortcode: 'smile', value: '😄' },
    ]);
  });

  it('не берёт ключи прототипа как шорткоды', () => {
    expect(splitText(':constructor: :__proto__:', { emoji: {} })).toEqual([
      { type: 'text', value: ':constructor: :__proto__:' },
    ]);
  });

  it('разбирает длинную строку за линейное время', () => {
    const value = '@a:b'.repeat(25_000) + ':'.repeat(50_000);
    const started = performance.now();

    splitText(value, { mentions: true, emoji: { b: 'B' } });

    expect(performance.now() - started).toBeLessThan(500);
  });
});

describe('wrapSpoilers', () => {
  it('оборачивает текст между маркерами', () => {
    expect(wrapSpoilers([text('a ||тайна|| b')])).toEqual([
      text('a '),
      {
        type: 'hauntSpoiler',
        children: [text('тайна')],
        data: { hName: 'span', hProperties: { dataHaunt: 'spoiler' } },
      },
      text(' b'),
    ]);
  });

  it('захватывает форматирование между маркерами из разных узлов', () => {
    const strong: MdNode = { type: 'strong', children: [text('жирный')] };
    const [spoiler] = wrapSpoilers([text('||'), strong, text(' спойлер||')]);

    expect(spoiler?.type).toBe('hauntSpoiler');
    expect(spoiler?.children).toEqual([strong, text(' спойлер')]);
  });

  it('незакрытый маркер остаётся текстом', () => {
    expect(wrapSpoilers([text('a ||b ||c|| d')])).toEqual([
      text('a '),
      expect.objectContaining({ type: 'hauntSpoiler', children: [text('b ')] }),
      text('c|| d'),
    ]);
  });

  it('пустой спойлер — текстом', () => {
    expect(wrapSpoilers([text('a |||| b')])).toEqual([text('a |||| b')]);
  });

  it('без пары маркеров возвращает те же узлы', () => {
    const children = [text('a || b')];

    expect(wrapSpoilers(children)).toBe(children);
  });
});

describe('remarkHauntSyntax', () => {
  it('не трогает код и не разбирает упоминания внутри ссылок', () => {
    const tree: MdNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'inlineCode', value: '@ваня ||x||' },
            { type: 'link', children: [text('@ваня :smile:')] },
          ],
        },
        { type: 'code', value: '||x|| @ваня' },
      ],
    };

    remarkHauntSyntax({ mentions: true, emoji: { smile: '😄' } })(tree);

    const paragraph = tree.children![0]!;

    expect(paragraph.children![0]).toEqual({ type: 'inlineCode', value: '@ваня ||x||' });
    expect(paragraph.children![1]!.children!.map((node) => node.type)).toEqual([
      'text',
      'hauntEmoji',
    ]);
    expect(tree.children![1]).toEqual({ type: 'code', value: '||x|| @ваня' });
  });

  it('разбирает упоминания и эмодзи внутри спойлера', () => {
    const tree: MdNode = {
      type: 'root',
      children: [{ type: 'paragraph', children: [text('||@ваня :smile:||')] }],
    };

    remarkHauntSyntax({ mentions: true, emoji: { smile: '😄' } })(tree);

    const spoiler = tree.children![0]!.children![0]!;

    expect(spoiler.type).toBe('hauntSpoiler');
    expect(spoiler.children!.map((node) => node.type)).toEqual([
      'hauntMention',
      'text',
      'hauntEmoji',
    ]);
    expect(spoiler.children![0]!.data?.hProperties).toEqual({
      dataHaunt: 'mention',
      dataKind: 'user',
      dataName: 'ваня',
    });
  });
});

describe('rehypeRawAsText', () => {
  it('превращает сырой HTML в текст на любой глубине', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'element',
          children: [{ type: 'raw', value: '<script>alert(1)</script>' }],
        },
      ],
    };

    rehypeRawAsText()(tree);

    expect(tree.children[0]!.children[0]).toEqual({
      type: 'text',
      value: '<script>alert(1)</script>',
    });
  });
});

describe('isSafeUrl', () => {
  it.each([
    ['https://haunt.dev/a?b#c', true],
    ['http://localhost:3000', true],
    ['mailto:me@haunt.dev', true],
    ['javascript:alert(1)', false],
    ['JavaScript:alert(1)', false],
    ['data:text/html,<script>', false],
    ['/relative/path', false],
    ['https://', false],
    ['mailto:nobody', false],
  ])('%s → %s', (url, safe) => {
    expect(isSafeUrl(url)).toBe(safe);
  });
});
