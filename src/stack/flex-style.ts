import type { CSSProperties } from 'react';

import { spaceVar, type Space } from '../lib/space';

export type FlexAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
export type FlexJustify = 'start' | 'center' | 'end' | 'between' | 'around';

export interface FlexProps {
  /** Промежуток между детьми по шкале `--space-*` */
  gap?: Space;
  /** Выравнивание поперёк основной оси (`align-items`) */
  align?: FlexAlign;
  /** Распределение вдоль основной оси (`justify-content`) */
  justify?: FlexJustify;
  /** Переносить детей на новую строку */
  wrap?: boolean;
  /** Растянуться по основной оси родителя-флекса */
  grow?: boolean;
}

const alignMap: Record<FlexAlign, CSSProperties['alignItems']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
  baseline: 'baseline',
};

const justifyMap: Record<FlexJustify, CSSProperties['justifyContent']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
};

export function flexStyle({ gap, align, justify, wrap, grow }: FlexProps): CSSProperties {
  return {
    gap: spaceVar(gap),
    alignItems: align ? alignMap[align] : undefined,
    justifyContent: justify ? justifyMap[justify] : undefined,
    flexWrap: wrap ? 'wrap' : undefined,
    flexGrow: grow ? 1 : undefined,
    // Без min-width: 0 флекс-ребёнок не даёт тексту внутри обрезаться многоточием
    minWidth: grow ? 0 : undefined,
  };
}
