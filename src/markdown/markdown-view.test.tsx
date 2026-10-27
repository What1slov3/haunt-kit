import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import MarkdownView from './markdown-view';
import type { MarkdownProps } from './markdown-types';

// Весь конвейер (remark → санитайзер → наши компоненты) в строку: проверка безопасности без браузера
const render = (props: MarkdownProps) => renderToStaticMarkup(<MarkdownView {...props} />);

describe('MarkdownView', () => {
  it('выводит сырой HTML текстом', () => {
    const html = render({ children: '<script>alert(1)</script> <img src=x onerror="alert(1)">' });

    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('ссылку с javascript: рендерит текстом без href', () => {
    const html = render({ children: '[жми](javascript:alert(1)) и [дата](data:text/html,x)' });

    expect(html).not.toContain('href');
    expect(html).toContain('жми');
  });

  it('оставляет http, https и mailto ссылками в новой вкладке', () => {
    const html = render({ children: 'https://haunt.dev и [почта](mailto:me@haunt.dev)' });

    expect(html).toContain('href="https://haunt.dev"');
    expect(html).toContain('href="mailto:me@haunt.dev"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('не рендерит картинки', () => {
    expect(render({ children: '![кот](https://haunt.dev/cat.png)' })).not.toContain('<img');
  });

  it('переносит строки как в чате', () => {
    expect(render({ children: 'раз\nдва' })).toContain('<br/>');
  });

  it('рендерит блок кода через CodeBlock с языком и не трогает синтаксис внутри', () => {
    const html = render({
      children: '```rust\nlet a = ||x|| @ваня;\n```',
      resolveMention: () => ({}),
    });

    expect(html).toContain('<figure');
    expect(html).toContain('rust');
    expect(html).toContain('||x|| @ваня');
    expect(html).not.toContain('data-haunt');
  });

  it('неизвестное упоминание остаётся текстом, известное — кнопкой Mention', () => {
    const html = render({
      children: '@ваня и @никто',
      resolveMention: (_kind, name) => (name === 'ваня' ? { label: 'Ваня' } : null),
    });

    expect(html).toMatch(/<button[^>]*data-kind="user"[^>]*>.*Ваня<\/button>/);
    expect(html).toContain('@никто');
  });

  it('inline разворачивает блоки в одну строку', () => {
    const html = render({ children: '> цитата\n\n- пункт\n\n**жирный**', inline: true });

    expect(html).not.toMatch(/<(p|blockquote|ul|li)[ >]/);
    expect(html).toMatch(/^<span/);
    expect(html).toContain('<strong>жирный</strong>');
  });

  it('эмодзи из словаря — role=img с шорткодом', () => {
    expect(render({ children: ':smile:', emoji: { smile: '😄' } })).toContain(
      'role="img" aria-label=":smile:">😄',
    );
  });
});
