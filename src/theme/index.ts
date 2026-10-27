// Глобальные стили (шрифты, токены, сброс) — отдельный вход @haunt/ui/styles: здесь только код
export {
  accentPresets,
  accentStyle,
  resolveAccent,
  type AccentName,
  type AccentPreset,
} from './accent';
export { AccentScope, type AccentScopeProps } from './accent-scope';
export { applyEffects, getCurrentEffects, initEffects, type EffectsLevel } from './effects';
export { PortalContainerContext, usePortalContainer } from './portal-container';
export { applyTheme, getCurrentTheme, initTheme, type Theme } from './theme';
export { ThemeProvider, type ThemeProviderProps } from './theme-provider';
export { ThemeScope, type ThemeScopeProps } from './theme-scope';
export { TokenScope, type TokenScopeProps } from './token-scope';
export {
  readToken,
  setTokens,
  tokenProperty,
  tokens,
  tokenStyle,
  tokenVar,
  TOKEN_DEFAULTS,
  TOKEN_VARS,
  type TokenKey,
  type TokenProperty,
  type TokenValues,
} from './tokens';
export { useTheme } from './use-theme';
