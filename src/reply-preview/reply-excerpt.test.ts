import { describe, expect, it } from 'vitest';

import { replyExcerpt } from './reply-excerpt';

describe('replyExcerpt', () => {
  it('первая непустая строка', () => {
    expect(replyExcerpt('\n\n  Привет всем  \nвторая строка')).toBe('Привет всем');
  });

  it('без разметки блоков', () => {
    expect(replyExcerpt('> цитата')).toBe('цитата');
    expect(replyExcerpt('## Заголовок')).toBe('Заголовок');
    expect(replyExcerpt('- пункт')).toBe('пункт');
    expect(replyExcerpt('2. второй')).toBe('второй');
  });

  it('без знаков выделения и с подписью ссылки', () => {
    expect(replyExcerpt('**жирный** и _курсив_, `код`, ~~было~~')).toBe(
      'жирный и курсив, код, было',
    );
    expect(replyExcerpt('см. [документацию](https://haunt.app/docs)')).toBe('см. документацию');
  });

  it('спойлер закрыт', () => {
    expect(replyExcerpt('убийца — ||дворецкий||')).toBe('убийца — █████████');
    expect(replyExcerpt('||да||')).toBe('███');
  });

  it('ограда кода пропускается, берётся код', () => {
    expect(replyExcerpt('```ts\nconst a = 1;\n```')).toBe('const a = 1;');
  });

  it('пробелы схлопываются', () => {
    expect(replyExcerpt('много    пробелов\tи\tтабов')).toBe('много пробелов и табов');
  });

  it('пусто — пустая строка', () => {
    expect(replyExcerpt('')).toBe('');
    expect(replyExcerpt('  \n ')).toBe('');
  });
});
