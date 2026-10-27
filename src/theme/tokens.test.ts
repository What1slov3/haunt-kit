import { afterEach, describe, expect, it } from 'vitest';

import { readToken, setTokens, tokenProperty, tokens, tokenStyle, tokenVar } from './tokens';

describe('tokens', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('style');
  });

  it('ссылки на токены — var() с именем свойства', () => {
    expect(tokens.textMuted).toBe('var(--text-muted)');
    expect(tokens.space1_5).toBe('var(--space-1-5)');
    expect(tokenProperty('radiusLg')).toBe('--radius-lg');
    expect(tokenVar('chamfer', '0px')).toBe('var(--chamfer, 0px)');
  });

  it('инлайн-стиль: имена свойств CSS, числа без единиц', () => {
    expect(tokenStyle({ radiusLg: '4px', fxGlow: 0.2, accent: undefined })).toEqual({
      '--radius-lg': '4px',
      '--fx-glow': '0.2',
    });
  });

  it('setTokens пишет на элемент и возвращает прежние значения', () => {
    const root = document.documentElement;

    root.style.setProperty('--radius-lg', '10px');

    const restore = setTokens(root, { radiusLg: '4px', controlMd: '32px' });

    expect(readToken('radiusLg')).toBe('4px');
    expect(readToken('controlMd')).toBe('32px');

    restore();

    expect(readToken('radiusLg')).toBe('10px');
    expect(root.style.getPropertyValue('--control-md')).toBe('');
  });

  it('readToken читает с ближайшего элемента', () => {
    const box = document.createElement('div');

    document.body.append(box);
    setTokens(box, { accent: '#0b7f77' });

    expect(readToken('accent', box)).toBe('#0b7f77');

    box.remove();
  });
});
