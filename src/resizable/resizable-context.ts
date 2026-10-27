import { createContext } from 'react';

import type { PanelConstraints, ResizeDirection } from './resizable-math';

export interface ResizableContextValue {
  direction: ResizeDirection;
  sizes: readonly number[];
  /** Ограничения в процентах при текущем размере контейнера */
  panels: readonly PanelConstraints[];
  panelIds: readonly string[];
  /** `flex` каждой панели: пиксельные — основой в px, гибкие — долей */
  flex: readonly string[];
  collapsed: readonly boolean[];
  /** Размеры по `defaultSize` — для сброса двойным кликом */
  initialSizes: readonly number[];
  /** Размер панели до сворачивания — в него она разворачивается */
  expanded: readonly (number | undefined)[];
  step: number;
  /** Шаг жеста: `base` — раскладка до его начала (по ней запоминается размер до сворачивания) */
  resize: (sizes: readonly number[], base: readonly number[]) => void;
  /** Жест закончен: onResizeEnd и сохранение */
  commit: (sizes: readonly number[]) => void;
  setDragging: (dragging: boolean) => void;
}

export const ResizableContext = createContext<ResizableContextValue | null>(null);

/** Порядковый номер части внутри Root: у панели — её индекс, у ручки — индекс панели слева от неё */
export const ResizableIndexContext = createContext(-1);
