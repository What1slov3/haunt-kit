// @vitest-environment node
// Генератор читает CSS через import.meta.url — в jsdom это не file:, и путь к файлам не построить
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { buildCurrentTokensModule, collectTokens, tokenKey, TOKENS_MODULE_PATH } from './tokens';

describe('токены для кода', () => {
  it('tokens.generated.ts собран из текущего CSS', () => {
    expect(readFileSync(TOKENS_MODULE_PATH, 'utf8')).toBe(buildCurrentTokensModule());
  });

  it('ключи — camelCase, цифровые части подряд — через _', () => {
    expect(tokenKey('--text-muted')).toBe('textMuted');
    expect(tokenKey('--space-1-5')).toBe('space1_5');
    expect(tokenKey('--space-15')).toBe('space15');
    expect(tokenKey('--radius-2xl')).toBe('radius2xl');
    expect(tokenKey('--accent-2')).toBe('accent2');
  });

  it('значения по темам и выражения берутся как в CSS', () => {
    const read = (file: string) =>
      ({
        'theme/tokens.css': `
          :root { --radius-lg: 8px; }
          :root,
          [data-theme='dark'] { --background: #111; /* тёмная */ }
          [data-theme='light'] { --background: #fff; }
          *, ::before, ::after { --accent-text: color-mix(
            in oklab, var(--accent), white 30%
          ); }
          [data-tui='off'] { --tui-marker: ''; }
        `,
        'signal/signal.css': `@scope (:root) { [data-style='signal'] { --chamfer: 10px; } }`,
      })[file] ?? '';
    const tokens = collectTokens(read);

    expect(tokens.get('radiusLg')?.values).toEqual({ base: '8px' });
    expect(tokens.get('background')?.values).toEqual({ dark: '#111', light: '#fff' });
    expect(tokens.get('accentText')?.values.base).toBe(
      'color-mix(in oklab, var(--accent), white 30%)',
    );
    // Переопределение в режиме — имя известно, значения по умолчанию у него нет
    expect(tokens.get('tuiMarker')?.values).toEqual({});
    expect(tokens.get('chamfer')?.values).toEqual({ signal: '10px' });
  });
});
