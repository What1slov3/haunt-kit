export type TuiProgressVariant = 'blocks' | 'ascii';

/** Переходная клетка — восьмые доли слева направо, как у прогресса в терминале (pv, cargo, btop) */
const EIGHTHS = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉'];

/**
 * Полоса из символов. blocks: █ заполнено, ░ пусто, переходная клетка — ▏…▉ по дробной части с шагом
 * в 1/8 клетки: на узкой полосе (10 клеток) шаг в 10 % иначе слишком груб. ascii: # и - для мест без
 * блочных глифов (логи, копирование в чат). Доля прижимается к 0…1
 */
export function progressCells(ratio: number, width: number, variant: TuiProgressVariant): string {
  const cells = Math.max(0, Math.floor(width));
  const clamped = Number.isNaN(ratio) ? 0 : Math.min(1, Math.max(0, ratio));

  if (variant === 'ascii') {
    const filled = Math.round(clamped * cells);

    return '#'.repeat(filled) + '-'.repeat(cells - filled);
  }

  const exact = clamped * cells;
  const full = Math.floor(exact);

  if (full >= cells) return '█'.repeat(cells);

  const partial = EIGHTHS[Math.floor((exact - full) * 8)] || '░';

  return '█'.repeat(full) + partial + '░'.repeat(cells - full - 1);
}

/** Пустая дорожка неопределённого состояния: по ней бежит блок */
export function emptyCells(width: number, variant: TuiProgressVariant): string {
  return progressCells(0, width, variant);
}

/** «  5%», « 42%», «100%» — одной ширины, чтобы полоса рядом не сдвигалась */
export function formatPercent(ratio: number): string {
  const clamped = Number.isNaN(ratio) ? 0 : Math.min(1, Math.max(0, ratio));

  return `${Math.round(clamped * 100)}%`.padStart(4, ' ');
}
