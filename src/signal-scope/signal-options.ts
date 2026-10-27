import { ruStrings } from '../strings/ru';

/*
 * Переключатели стиля «сигнал» — значения атрибутов `data-signal-font` и `data-signal-accent`
 * (signal/signal.css). Списки — для тулбара Storybook, витрины и экранов настроек.
 */

export const signalFonts = [
  'archivo',
  'archivo-narrow',
  'space-grotesk',
  'big-shoulders',
  'chakra',
  'unbounded',
  'oswald',
  'exo-2',
  'tektur',
  'tektur-narrow',
] as const;

export type SignalFont = (typeof signalFonts)[number];

/**
 * Русские названия — для витрины без провайдера. Экран настроек берёт `useUiStrings().signalScope.fonts`:
 * они следуют языку интерфейса
 */
export const signalFontLabels: Record<SignalFont, string> = ruStrings.signalScope.fonts;

/** Есть ли в шрифте кириллица; без неё русские заголовки рисуются Inter — следующим шрифтом стека */
export const signalFontCyrillic: Record<SignalFont, boolean> = {
  archivo: false,
  'archivo-narrow': false,
  'space-grotesk': false,
  'big-shoulders': false,
  chakra: false,
  unbounded: true,
  oswald: true,
  'exo-2': true,
  tektur: true,
  'tektur-narrow': true,
};

export const signalAccents = ['lime', 'magenta', 'cyan', 'orange'] as const;

export type SignalAccent = (typeof signalAccents)[number];

/** Цвета акцентов — для образцов в переключателях; сами токены объявлены в signal.css */
export const signalAccentColors: Record<SignalAccent, string> = {
  lime: '#d2ff1f',
  magenta: '#ff2d9b',
  cyan: '#2de2ff',
  orange: '#ff6a13',
};
