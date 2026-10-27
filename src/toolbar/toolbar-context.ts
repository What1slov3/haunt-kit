import { createContext } from 'react';

export type ToolbarSize = 'sm' | 'md';

/** Размер задаётся на Root один раз: кнопки и переключатели ряда обязаны быть одной высоты */
export const ToolbarSizeContext = createContext<ToolbarSize>('md');
