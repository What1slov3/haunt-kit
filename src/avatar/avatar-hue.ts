/**
 * Один и тот же человек всегда получает один и тот же оттенок заглушки. Отдельным модулем: тот же
 * оттенок тонирует фон плитки участника (MediaTile), и цвет должен совпадать с аватаром на ней
 */
export function hueOf(name: string): number {
  let hash = 0;

  for (const char of name) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % 360;
  }

  return hash;
}
