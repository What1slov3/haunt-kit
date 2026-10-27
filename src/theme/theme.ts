export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'haunt.theme';
const DEFAULT_THEME: Theme = 'dark';

function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light';
}

export function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    return isTheme(stored) ? stored : null;
  } catch {
    // localStorage недоступен (приватный режим, запрет куки) — живём с темой по умолчанию
    return null;
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;

  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // см. readStoredTheme
  }
}

export function getCurrentTheme(): Theme {
  const current = document.documentElement.dataset.theme;

  return isTheme(current) ? current : DEFAULT_THEME;
}

/** Вызывается до первого рендера: ставит сохранённую тему на <html>. */
export function initTheme(): void {
  document.documentElement.dataset.theme = readStoredTheme() ?? DEFAULT_THEME;
}
