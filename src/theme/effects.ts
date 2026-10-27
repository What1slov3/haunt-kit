/** Уровень эффектов (прожектор, отблески, зерно, всплески): off — ничего, subtle — по умолчанию, rich — заметно */
export type EffectsLevel = 'off' | 'subtle' | 'rich';

const STORAGE_KEY = 'haunt.effects';
const DEFAULT_LEVEL: EffectsLevel = 'subtle';

function isEffectsLevel(value: unknown): value is EffectsLevel {
  return value === 'off' || value === 'subtle' || value === 'rich';
}

export function readStoredEffects(): EffectsLevel | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    return isEffectsLevel(stored) ? stored : null;
  } catch {
    // localStorage недоступен — живём с уровнем по умолчанию
    return null;
  }
}

/** Ставит `data-effects` на <html>: effects.css читает его и выставляет интенсивности `--fx-*` */
export function applyEffects(level: EffectsLevel): void {
  document.documentElement.dataset.effects = level;

  try {
    localStorage.setItem(STORAGE_KEY, level);
  } catch {
    // см. readStoredEffects
  }
}

export function getCurrentEffects(): EffectsLevel {
  const current = document.documentElement.dataset.effects;

  return isEffectsLevel(current) ? current : DEFAULT_LEVEL;
}

/** Вызывается до первого рендера вместе с initTheme */
export function initEffects(): void {
  document.documentElement.dataset.effects = readStoredEffects() ?? DEFAULT_LEVEL;
}
