export type TuiSpinnerVariant = 'braille' | 'line' | 'dots';

/**
 * Кадры — содержимое индикатора, а не знаки словаря TUI (те живут в токенах `--tui-*`): у них нет
 * значения, кроме «идёт работа», и при data-tui="off" спиннер целиком заменяется обычным.
 * Кадры `dots` одной ширины (пробелы справа) — иначе подпись рядом дёргалась бы.
 */
export const TUI_SPINNER_FRAMES: Record<TuiSpinnerVariant, readonly string[]> = {
  braille: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  line: ['|', '/', '-', '\\'],
  dots: ['   ', '.  ', '.. ', '...'],
};

/** Скорость по умолчанию: у braille кадров много и они мелкие — быстро; точки — медленно, как набор */
export const TUI_SPINNER_INTERVAL: Record<TuiSpinnerVariant, number> = {
  braille: 80,
  line: 120,
  dots: 320,
};
