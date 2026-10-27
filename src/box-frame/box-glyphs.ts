export type BoxFrameVariant = 'single' | 'double' | 'rounded' | 'heavy';

export interface BoxGlyphs {
  tl: string;
  tr: string;
  bl: string;
  br: string;
  h: string;
  v: string;
  /** Стыки разделителей таблицы: ┬ ┴ ├ ┤ ┼ */
  tDown: string;
  tUp: string;
  tRight: string;
  tLeft: string;
  cross: string;
}

/**
 * Знаки рамок — настоящая псевдографика: глифы рисует шрифт `Haunt TUI` (theme/tui-font.css) ровно в
 * клетку моно-сетки, поэтому линии соседних клеток и строк стыкуются, как в терминале. Скруглённая
 * рамка скругляет только углы, стыки у неё одинарные — так рисуют и терминалы.
 */
export const BOX_GLYPHS: Record<BoxFrameVariant, BoxGlyphs> = {
  single: {
    tl: '┌',
    tr: '┐',
    bl: '└',
    br: '┘',
    h: '─',
    v: '│',
    tDown: '┬',
    tUp: '┴',
    tRight: '├',
    tLeft: '┤',
    cross: '┼',
  },
  double: {
    tl: '╔',
    tr: '╗',
    bl: '╚',
    br: '╝',
    h: '═',
    v: '║',
    tDown: '╦',
    tUp: '╩',
    tRight: '╠',
    tLeft: '╣',
    cross: '╬',
  },
  rounded: {
    tl: '╭',
    tr: '╮',
    bl: '╰',
    br: '╯',
    h: '─',
    v: '│',
    tDown: '┬',
    tUp: '┴',
    tRight: '├',
    tLeft: '┤',
    cross: '┼',
  },
  heavy: {
    tl: '┏',
    tr: '┓',
    bl: '┗',
    br: '┛',
    h: '━',
    v: '┃',
    tDown: '┳',
    tUp: '┻',
    tRight: '┣',
    tLeft: '┫',
    cross: '╋',
  },
};

/*
 * Линия, которая тянется по ширине или высоте блока без измерения в JS: длинная строка знаков, лишнее
 * обрезает `overflow: hidden`, а `contain` не даёт ей распирать блок. Обрезка посреди знака не видна:
 * горизонталь и вертикаль одинаковы по всей длине.
 */
const RUN = 480;
const COLUMN = 320;

export const horizontalRun = (glyph: string) => glyph.repeat(RUN);

export const verticalRun = (glyph: string) => `${glyph}\n`.repeat(COLUMN);
