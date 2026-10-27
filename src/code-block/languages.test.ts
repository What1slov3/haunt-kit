import { describe, expect, it } from 'vitest';

import { resolveLanguage } from './languages';

describe('resolveLanguage', () => {
  it('принимает имя грамматики в любом регистре', () => {
    expect(resolveLanguage('TypeScript')).toBe('typescript');
    expect(resolveLanguage(' tsx ')).toBe('tsx');
  });

  it('понимает короткие подписи из markdown-блоков', () => {
    expect(resolveLanguage('ts')).toBe('typescript');
    expect(resolveLanguage('sh')).toBe('bash');
    expect(resolveLanguage('yml')).toBe('yaml');
    expect(resolveLanguage('rs')).toBe('rust');
  });

  it('незнакомый или пустой язык — без подсветки', () => {
    expect(resolveLanguage('cobol')).toBeNull();
    expect(resolveLanguage('')).toBeNull();
    expect(resolveLanguage(undefined)).toBeNull();
  });
});
