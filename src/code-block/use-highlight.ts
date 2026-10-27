import { useEffect, useState } from 'react';

import type { ThemedToken } from 'shiki/core';

import { resolveLanguage } from './languages';

interface Highlighted {
  key: string;
  tokens: ThemedToken[][];
}

/**
 * Токены подсветки для кода или null, пока shiki грузится, язык не поддержан или подсветка выключена.
 * Загрузчик подтягивается через import() при первом блоке кода: до этого в бандле нет ни shiki, ни
 * грамматик. Ошибка загрузки (сеть, грамматика) молча оставляет блок без подсветки — код читается и так.
 */
export function useHighlight(
  code: string,
  language: string | undefined,
  enabled: boolean,
): ThemedToken[][] | null {
  const grammar = enabled ? resolveLanguage(language) : null;
  const key = grammar ? `${grammar}\u0000${code}` : null;
  const [highlighted, setHighlighted] = useState<Highlighted | null>(null);

  useEffect(() => {
    if (!grammar || !key) return;

    let cancelled = false;

    import('./shiki-loader')
      .then(({ tokenize }) => tokenize(code, grammar))
      .then((tokens) => {
        if (!cancelled) setHighlighted({ key, tokens });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [code, grammar, key]);

  // Токены прошлого кода не показываем: пока считается новый, блок — простым текстом
  return highlighted && highlighted.key === key ? highlighted.tokens : null;
}
