import type { CSSProperties } from 'react';

import type { ThemedToken } from 'shiki/core';

// Биты FontStyle shiki: Italic = 1, Bold = 2, Underline = 4. Числами, а не enum из shiki: импорт значения
// притянул бы пакет в стартовый чанк, а здесь нужны только три флага
const ITALIC = 1;
const BOLD = 2;
const UNDERLINE = 4;

function tokenStyle({ color, fontStyle = 0 }: ThemedToken): CSSProperties {
  return {
    color,
    fontStyle: fontStyle & ITALIC ? 'italic' : undefined,
    fontWeight: fontStyle & BOLD ? 'var(--weight-semibold)' : undefined,
    textDecoration: fontStyle & UNDERLINE ? 'underline' : undefined,
  };
}

export interface CodeLineProps {
  /** Текст строки — пока подсветки нет, и для пустой строки */
  text: string;
  /** Токены shiki этой строки (`useHighlight`) */
  tokens?: readonly ThemedToken[];
}

/**
 * Строка кода с токенами подсветки или, пока их нет, простым текстом; пустая строка держит высоту
 * пробелом. Общая у CodeBlock и DiffView — одна раскраска на кит.
 */
export function CodeLine({ text, tokens }: CodeLineProps) {
  if (!tokens?.length) return <>{text || ' '}</>;

  // Токены строки не переставляются: позиция — стабильный ключ
  return (
    <>
      {tokens.map((token, position) => (
        <span key={position} style={tokenStyle(token)}>
          {token.content}
        </span>
      ))}
    </>
  );
}
