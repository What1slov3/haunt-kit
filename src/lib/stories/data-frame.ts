import type { CSSProperties } from 'react';

/** Рамка карточки для историй группы «Данные»: график живёт на `--card`, как на экране статистики */
export const chartFrame: CSSProperties = {
  maxWidth: 640,
  padding: 'var(--space-4)',
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-2xl)',
};
