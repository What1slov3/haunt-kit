import { createContext } from 'react';

export interface TabsContextValue {
  value: string | undefined;
  /** Общий id группы: layoutId индикатора должен быть уникален на каждый экземпляр Tabs */
  layoutId: string;
  /**
   * line — подчёркивание (навигация), segment — компактный сегмент (переключатель режима),
   * card — вкладки в шапке карточки, как блоки кода и примеры у Fumadocs
   */
  variant: 'line' | 'segment' | 'card';
}

export const TabsContext = createContext<TabsContextValue | null>(null);
