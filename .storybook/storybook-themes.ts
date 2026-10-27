import { create } from 'storybook/theming/create';

/*
 * Оформление самого Storybook (сайдбар, тулбар, страницы документации) — тем же языком, что кит:
 * нейтральный серый основы, тонкие рамки, сайдбар на фоне страницы, содержимое чуть светлее, знак Haunt.
 * Значения — копии токенов из tokens.css: интерфейс Storybook живёт в другом документе и CSS-переменных
 * кита не видит. То, чего тема Storybook не умеет (тонированный активный пункт, скругления пунктов), —
 * в manager-head.html.
 */

const fonts = {
  fontBase: "'Inter Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  fontCode: "'JetBrains Mono Variable', ui-monospace, 'Cascadia Code', Consolas, monospace",
};

/*
 * Знак в шапке сайдбара — призрак Haunt (тот же контур, что у лендинга, apps/web/…/haunt-mark.tsx) и
 * подпись. Картинкой data:, а не файлом: Storybook показывает brandImage как <img>, CSS-переменных у неё
 * нет, поэтому цвета подписи — свои для каждой темы. Градиент — violet → фиолетовый, акцент кита по умолчанию.
 */
const mark = (ink: string, eyes: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="168" height="32" viewBox="0 0 168 32"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8f80ff"/><stop offset="1" stop-color="#9a4fc4"/></linearGradient></defs><path d="M6 28V14a10 10 0 0 1 20 0v14l-3.33-2.5-3.34 2.5L16 25.5 12.67 28l-3.34-2.5L6 28Z" fill="url(#g)"/><rect x="11.5" y="11.5" width="3" height="5" rx="1.5" fill="${eyes}"/><rect x="17.5" y="11.5" width="3" height="5" rx="1.5" fill="${eyes}"/><text x="38" y="22" font-family="Inter Variable, Inter, system-ui, sans-serif" font-size="17" font-weight="650" letter-spacing="-0.2" fill="${ink}">Haunt</text><text x="96" y="22" font-family="JetBrains Mono Variable, JetBrains Mono, ui-monospace, monospace" font-size="13" fill="${ink}" fill-opacity="0.55">ui</text></svg>`)}`;

const brand = {
  brandTitle: 'Haunt UI',
  brandUrl: './?path=/docs/введение--docs',
  brandTarget: '_self',
  // Акцент violet — тот же, что по умолчанию у кита
  colorPrimary: '#6e5ce6',
  colorSecondary: '#6e5ce6',
};

export const hauntDark = create({
  base: 'dark',
  ...fonts,
  ...brand,
  brandImage: mark('#ededef', '#0c0c0e'),
  // Сайдбар чуть темнее содержимого — как у Fumadocs, где страница лежит карточкой поверх фона
  appBg: '#0c0c0e',
  appContentBg: '#111113',
  appPreviewBg: '#111113',
  appBorderColor: 'rgba(255, 255, 255, 0.1)',
  appHoverBg: 'rgba(140, 140, 150, 0.16)',
  barBg: '#0c0c0e',
  barTextColor: 'rgba(237, 237, 239, 0.66)',
  barSelectedColor: '#ededef',
  barHoverColor: '#ededef',
  textColor: '#ededef',
  textMutedColor: 'rgba(237, 237, 239, 0.62)',
  inputBg: 'rgba(255, 255, 255, 0.03)',
  inputBorder: 'rgba(255, 255, 255, 0.16)',
  inputTextColor: '#ededef',
  buttonBg: '#212124',
  buttonBorder: 'rgba(255, 255, 255, 0.1)',
  booleanBg: '#18181b',
  booleanSelectedBg: '#2a2a2e',
  appBorderRadius: 12,
  inputBorderRadius: 6,
});

export const hauntLight = create({
  base: 'light',
  ...fonts,
  ...brand,
  brandImage: mark('#0b0b0c', '#f6f6f7'),
  appBg: '#f6f6f7',
  appContentBg: '#fcfcfd',
  appPreviewBg: '#fcfcfd',
  appBorderColor: 'rgba(10, 10, 14, 0.1)',
  appHoverBg: 'rgba(120, 120, 130, 0.14)',
  barBg: '#f6f6f7',
  barTextColor: 'rgba(11, 11, 12, 0.68)',
  barSelectedColor: '#0b0b0c',
  barHoverColor: '#0b0b0c',
  textColor: '#0b0b0c',
  textMutedColor: 'rgba(11, 11, 12, 0.6)',
  inputBg: '#ffffff',
  inputBorder: 'rgba(10, 10, 14, 0.17)',
  inputTextColor: '#0b0b0c',
  buttonBg: '#ededef',
  buttonBorder: 'rgba(10, 10, 14, 0.1)',
  booleanBg: '#ededef',
  booleanSelectedBg: '#ffffff',
  appBorderRadius: 12,
  inputBorderRadius: 6,
});
