import { describe, expect, it } from 'vitest';

import { linkDomain } from './link-domain';

describe('linkDomain', () => {
  it('без схемы, www и пути', () => {
    expect(linkDomain('https://www.github.com/haunt/haunt/pull/12?x=1#top')).toBe('github.com');
  });

  it('поддомены, кроме www, остаются', () => {
    expect(linkDomain('https://docs.rs/axum')).toBe('docs.rs');
    expect(linkDomain('https://blog.haunt.dev/post')).toBe('blog.haunt.dev');
  });

  it('IDN — как его отдаёт URL (punycode)', () => {
    expect(linkDomain('https://пример.рф/')).toBe('xn--e1afmkfd.xn--p1ai');
  });

  it('битый адрес — как есть', () => {
    expect(linkDomain('не ссылка')).toBe('не ссылка');
  });
});
