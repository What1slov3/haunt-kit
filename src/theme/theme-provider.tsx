import { useEffect, useState, type ReactNode } from 'react';

import { Tooltip } from 'radix-ui';

import { applyEffects, getCurrentEffects, type EffectsLevel } from './effects';
import { installSpotlight } from './spotlight';
import { applyTheme, getCurrentTheme, type Theme } from './theme';
import { ThemeContext } from './theme-context';

export interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Корень дизайн-системы: тема, уровень эффектов, провайдер подсказок и прожектор. Оборачивает
 * приложение один раз. Motion сюда не входит: его провайдер — `@haunt/ui/motion`, ставит экран, которому
 * он нужен (иначе библиотека грузилась бы с каждым экраном).
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(getCurrentTheme);
  const [effects, setEffectsState] = useState<EffectsLevel>(getCurrentEffects);

  const setTheme = (next: Theme) => {
    applyTheme(next);
    setThemeState(next);
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const setEffects = (next: EffectsLevel) => {
    applyEffects(next);
    setEffectsState(next);
  };

  // Прожектор глобальный: один слушатель на окно, а не на каждую панель
  useEffect(() => installSpotlight(), []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, effects, setEffects }}>
      <Tooltip.Provider delayDuration={400} skipDelayDuration={200}>
        {children}
      </Tooltip.Provider>
    </ThemeContext.Provider>
  );
}
