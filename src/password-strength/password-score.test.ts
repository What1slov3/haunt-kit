import { describe, expect, it } from 'vitest';

import { scorePassword } from './password-score';

describe('scorePassword', () => {
  it('пустой — ноль без подсказок', () => {
    expect(scorePassword('')).toEqual({ score: 0, hints: [], bits: 0 });
  });

  it.each(['password', 'P@ssw0rd2024', 'qwerty123', '123456789', 'йцукен', 'gfhjkm', '4dmin!'])(
    'частый пароль «%s» — очень слабый',
    (password) => {
      const result = scorePassword(password);

      expect(result.score).toBe(0);
      expect(result.hints[0]).toBe('common');
    },
  );

  it('короткий — не выше «слабого», подсказка про длину', () => {
    const result = scorePassword('Kx9#m');

    expect(result.score).toBeLessThanOrEqual(1);
    expect(result.hints).toContain('tooShort');
  });

  it('последовательности и повторы почти ничего не стоят', () => {
    expect(scorePassword('abcdefghijkl').hints).toContain('sequence');
    expect(scorePassword('abcdefghijkl').score).toBe(0);
    expect(scorePassword('zzzzzzzzzzzz').hints).toContain('repeat');
    expect(scorePassword('zzzzzzzzzzzz').score).toBe(0);
    expect(scorePassword('ab12ab12ab12').hints).toContain('repeat');
  });

  it('последовательность в русской раскладке и обратная', () => {
    expect(scorePassword('фывапро!К9').hints).toContain('sequence');
    expect(scorePassword('zyx98765Q!').hints).toContain('sequence');
  });

  it('советует недостающие классы символов', () => {
    const result = scorePassword('lantern fog', { maxHints: 9 });

    expect(result.hints).toEqual(expect.arrayContaining(['mixCase', 'digits']));
    expect(result.hints).not.toContain('symbols');
  });

  it('случайные 8 символов всех классов — хороший', () => {
    expect(scorePassword('Kx9#mP2q').score).toBe(3);
  });

  it('до 12 символов не бывает надёжного', () => {
    expect(scorePassword('Tr0ub4dor&3').score).toBe(3);
  });

  it('длинная фраза — надёжный и без подсказок', () => {
    expect(scorePassword('correct horse battery staple')).toMatchObject({ score: 4, hints: [] });
    expect(scorePassword('Тихий-маяк-над-водой-7').score).toBe(4);
  });

  it('имя и почта внутри пароля ослабляют его', () => {
    const plain = scorePassword('vagner-Mist-42');
    const personal = scorePassword('vagner-Mist-42', { userInputs: ['vagner@haunt.app'] });

    expect(personal.bits).toBeLessThan(plain.bits);
    expect(personal.hints[0]).toBe('personal');
  });

  it('частое слово внутри длинного пароля ослабляет его', () => {
    expect(scorePassword('mypasswordisgood').hints).toContain('common');
  });

  it('подсказок не больше maxHints', () => {
    expect(scorePassword('aaa', { maxHints: 2 }).hints).toHaveLength(2);
  });

  it('минимальная длина настраивается', () => {
    expect(scorePassword('Kx9#mP2q', { minLength: 10 }).hints).toContain('tooShort');
  });
});
