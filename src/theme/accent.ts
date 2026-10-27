import type { CSSProperties } from 'react';

/**
 * Акцент пространства — три переменные; всё остальное (мягкий фон, текст, градиент, свечение)
 * tokens.css выводит сам. Переопределяются на любом контейнере, см. AccentScope.
 */
export interface AccentPreset {
  /** Основной цвет: активные состояния, свои сообщения, начало градиента */
  accent: string;
  /** Второй цвет градиента */
  accent2: string;
  /** Цвет текста поверх акцента */
  contrast: string;
}

/*
 * Пастели референсов, переведённые в насыщенные оттенки. Подобраны так, чтобы белый текст на
 * `accent` давал контраст не ниже AA (4.5:1) — это важно для акцентной кнопки.
 */
export const accentPresets = {
  violet: { accent: '#6e5ce6', accent2: '#9a4fc4', contrast: '#ffffff' },
  indigo: { accent: '#4f63e0', accent2: '#7a4fd6', contrast: '#ffffff' },
  teal: { accent: '#0b7f77', accent2: '#2f6fc9', contrast: '#ffffff' },
  lime: { accent: '#457a0f', accent2: '#1f9a6a', contrast: '#ffffff' },
  amber: { accent: '#a3570f', accent2: '#c93d5a', contrast: '#ffffff' },
  rose: { accent: '#d13a6c', accent2: '#8a46c9', contrast: '#ffffff' },
  sky: { accent: '#1f6fc2', accent2: '#1f9fb3', contrast: '#ffffff' },
} satisfies Record<string, AccentPreset>;

export type AccentName = keyof typeof accentPresets;

export function resolveAccent(accent: AccentName | AccentPreset): AccentPreset {
  return typeof accent === 'string' ? accentPresets[accent] : accent;
}

/** Инлайн-стиль с переменными акцента — для контейнера сообщества. */
export function accentStyle(preset: AccentPreset): CSSProperties {
  // Custom properties нет в типе CSSProperties, поэтому объект собирается через индексную запись
  const style: Record<string, string> = {
    '--accent': preset.accent,
    '--accent-2': preset.accent2,
    '--accent-contrast': preset.contrast,
  };

  return style as CSSProperties;
}
