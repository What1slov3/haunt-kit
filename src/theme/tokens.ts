import type { CSSProperties } from 'react';

import { TOKEN_DEFAULTS, TOKEN_VARS } from './tokens.generated';

/*
 * Токены из кода — типизированно поверх CSS. Источник правды — CSS кита (theme/tokens.css и соседи), имена и
 * значения по умолчанию приходят из tokens.generated.ts (`pnpm --filter @haunt/ui build:tokens`). Опечатка в
 * имени — ошибка компиляции, а не тихий `var(--txet-muted)`, который браузер молча проигнорирует.
 */

export { TOKEN_DEFAULTS, TOKEN_VARS };

/** Ключ токена в коде: `textMuted`, `radiusLg`, `space1_5` */
export type TokenKey = keyof typeof TOKEN_VARS;

/** Имя свойства CSS: `--text-muted` */
export type TokenProperty = (typeof TOKEN_VARS)[TokenKey];

/** Значения для записи: строка как в CSS; число пишется как есть, без единиц (`0.45`, а не `0.45px`) */
export type TokenValues = { [K in TokenKey]?: string | number };

/**
 * Ссылки на токены для инлайн-стилей и кода, которому нужен цвет строкой: `tokens.textMuted` →
 * `'var(--text-muted)'`. Значение вычисляет браузер в точке использования — тема, акцент и скоупы работают.
 */
export const tokens = Object.fromEntries(
  Object.entries(TOKEN_VARS).map(([key, property]) => [key, `var(${property})`]),
) as { readonly [K in TokenKey]: `var(${(typeof TOKEN_VARS)[K]})` };

/** Имя свойства CSS по ключу: `tokenProperty('radiusLg')` → `'--radius-lg'` */
export function tokenProperty<K extends TokenKey>(key: K): (typeof TOKEN_VARS)[K] {
  return TOKEN_VARS[key];
}

/** Ссылка с запасным значением: `tokenVar('chamfer', '0px')` → `'var(--chamfer, 0px)'` — для ручек стиля */
export function tokenVar(key: TokenKey, fallback?: string): string {
  return fallback === undefined
    ? `var(${TOKEN_VARS[key]})`
    : `var(${TOKEN_VARS[key]}, ${fallback})`;
}

/**
 * Инлайн-стиль с переопределёнными токенами: `<div style={tokenStyle({ radiusLg: '4px' })}>`. Всё внутри
 * элемента читает новые значения; производные (`--accent-text` от `--accent`) пересчитываются сами.
 */
export function tokenStyle(values: TokenValues): CSSProperties {
  const style: Record<string, string> = {};

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) style[TOKEN_VARS[key as TokenKey]] = String(value);
  }

  return style as CSSProperties;
}

/**
 * Записать токены на элемент: `document.documentElement` — на всё приложение, контейнер — на его часть.
 * Возвращает функцию, которая возвращает прежние значения: удобно для настроек, превью и тестов.
 */
export function setTokens(element: HTMLElement, values: TokenValues): () => void {
  const previous = new Map<string, string>();

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;

    const property = TOKEN_VARS[key as TokenKey];

    previous.set(property, element.style.getPropertyValue(property));
    element.style.setProperty(property, String(value));
  }

  return () => {
    for (const [property, value] of previous) {
      if (value) element.style.setProperty(property, value);
      else element.style.removeProperty(property);
    }
  };
}

/**
 * Вычисленное значение токена на элементе (по умолчанию `<html>`): тема, акцент и скоупы учтены. Для кода,
 * которому нужен сам цвет — canvas, WebGL, графики. Выражения браузер не вычисляет для custom property:
 * `--accent-text` вернётся как `color-mix(…)`; конкретный цвет даст `getComputedStyle(el).color` на элементе
 * с `color: var(--accent-text)`.
 */
export function readToken(key: TokenKey, element?: Element): string {
  const target = element ?? document.documentElement;

  return getComputedStyle(target).getPropertyValue(TOKEN_VARS[key]).trim();
}
