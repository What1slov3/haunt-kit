import { useEffect, useState } from 'react';

/*
 * Живые значения CSS-переменных для страниц документации. Тема, акцент, эффекты и TUI меняются
 * атрибутами и стилем на <html> — после каждой такой смены значения перечитываются.
 */

function subscribeToRoot(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [
      'data-theme',
      'data-effects',
      'data-tui',
      'data-style',
      'data-signal-font',
      'data-signal-accent',
      'style',
    ],
  });

  return () => observer.disconnect();
}

/** Увеличивается при каждой смене темы/акцента/эффектов на <html> — повод перечитать значения */
export function useRootVersion(): number {
  const [version, setVersion] = useState(0);

  useEffect(() => subscribeToRoot(() => setVersion((current) => current + 1)), []);

  return version;
}

/**
 * Значение переменной на элементе. Производные от акцента (`--accent-soft`, `--shadow-*`) объявлены
 * на каждом элементе, а не на :root, поэтому читать их надо с элемента, который их показывает.
 */
export function readToken(element: Element | null, name: string): string {
  if (!element) return '';

  return getComputedStyle(element).getPropertyValue(name).trim().replace(/\s+/g, ' ');
}
