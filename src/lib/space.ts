/** Шаг отступов из tokens.css: число → `var(--space-N)`; полушаги 0.5 и 1.5 — для плотных строк */
export type Space = 0 | 0.5 | 1 | 1.5 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16;

export function spaceVar(value: Space | undefined): string | undefined {
  // В имени custom property точка недопустима: --space-0-5
  return value === undefined ? undefined : `var(--space-${String(value).replace('.', '-')})`;
}

export type Radius = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

export function radiusVar(value: Radius | undefined): string | undefined {
  if (value === undefined) return undefined;

  return value === 'none' ? '0' : `var(--radius-${value})`;
}
