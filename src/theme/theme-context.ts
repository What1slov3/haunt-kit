import { createContext } from 'react';

import type { EffectsLevel } from './effects';
import type { Theme } from './theme';

export interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  /** Уровень эффектов — data-effects на <html>, см. theme/effects.css */
  effects: EffectsLevel;
  setEffects: (level: EffectsLevel) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
