import type { Preview } from '@storybook/react-vite';

import {
  accentPresets,
  signalAccents,
  signalFontLabels,
  signalFonts,
  type AccentName,
  type AmbientReaction,
  type AmbientVariant,
  type EffectsLevel,
  type SignalAccent,
  type SignalFont,
  type Theme,
} from '@haunt/ui';

/*
 * Переключатели тулбара. Те же оси, что в шапке витрины `/ui`: тема, акцент пространства, живой фон,
 * его реакция, уровень эффектов, TUI-акценты и стиль «сигнал» с его шрифтом и акцентом. Значения доходят до компонентов не пропсами, а
 * атрибутами и CSS-переменными на <html> — так же, как в приложении, поэтому истории не знают о тулбаре.
 */

export type BackgroundVariant = 'none' | AmbientVariant;

export interface HauntGlobals {
  theme: Theme;
  accent: AccentName;
  background: BackgroundVariant;
  reaction: AmbientReaction;
  effects: EffectsLevel;
  tui: 'on' | 'off';
  style: 'base' | 'signal';
  signalFont: SignalFont;
  signalAccent: SignalAccent;
  locale: 'ru' | 'en';
}

/*
 * Фон по умолчанию выключен: на холсте истории нужна сама деталь, а canvas с частицами в каждом
 * тесте замедлял бы прогон. Включается в тулбаре.
 */
export const defaultGlobals: HauntGlobals = {
  theme: 'dark',
  accent: 'violet',
  background: 'none',
  reaction: 'quiet',
  effects: 'subtle',
  tui: 'on',
  style: 'base',
  signalFont: 'archivo',
  signalAccent: 'lime',
  locale: 'ru',
};

const accentNames = Object.keys(accentPresets) as AccentName[];

export const hauntGlobalTypes: NonNullable<Preview['globalTypes']> = {
  theme: {
    description: 'Тема: data-theme на <html>',
    toolbar: {
      title: 'Тема',
      icon: 'mirror',
      dynamicTitle: true,
      items: [
        { value: 'dark', title: 'Тёмная', icon: 'moon' },
        { value: 'light', title: 'Светлая', icon: 'sun' },
      ],
    },
  },
  accent: {
    description: 'Акцент пространства: --accent, --accent-2, --accent-contrast на <html>',
    toolbar: {
      title: 'Акцент',
      icon: 'paintbrush',
      dynamicTitle: true,
      items: accentNames.map((name) => ({ value: name, title: name })),
    },
  },
  background: {
    description: 'Живой фон под историей (AmbientBackground)',
    toolbar: {
      title: 'Фон',
      icon: 'photo',
      dynamicTitle: true,
      items: [
        { value: 'none', title: 'без фона' },
        { value: 'blobs', title: 'пятна' },
        { value: 'dots', title: 'точки' },
        { value: 'flow', title: 'поток' },
        { value: 'contour', title: 'горизонтали' },
        { value: 'mesh', title: 'аврора' },
        { value: 'starfield', title: 'звёзды' },
        { value: 'constellation', title: 'созвездие' },
        { value: 'rain', title: 'дождь' },
        { value: 'radar', title: 'радар' },
        { value: 'waveform', title: 'осциллограф' },
        { value: 'hex', title: 'гексы' },
        { value: 'life', title: 'жизнь' },
        { value: 'scanlines', title: 'развёртка' },
      ],
    },
  },
  reaction: {
    description: 'Реакция фона на курсор, клики и ambient.pulse',
    toolbar: {
      title: 'Реакция',
      icon: 'wand',
      dynamicTitle: true,
      items: [
        { value: 'off', title: 'реакция: выкл' },
        { value: 'quiet', title: 'реакция: тихо' },
        { value: 'vivid', title: 'реакция: заметно' },
      ],
    },
  },
  effects: {
    description: 'Уровень эффектов: data-effects на <html>',
    toolbar: {
      title: 'Эффекты',
      icon: 'lightning',
      dynamicTitle: true,
      items: [
        { value: 'off', title: 'эффекты: без' },
        { value: 'subtle', title: 'эффекты: тихо' },
        { value: 'rich', title: 'эффекты: ярко' },
      ],
    },
  },
  tui: {
    description: 'TUI-акценты: data-tui на <html> гасит маркеры и скобки',
    toolbar: {
      title: 'TUI',
      icon: 'markup',
      dynamicTitle: true,
      items: [
        { value: 'on', title: 'tui: вкл' },
        { value: 'off', title: 'tui: выкл' },
      ],
    },
  },
  style: {
    description:
      'Стиль: data-style="signal" на <html> — дополнение к основе, без него кит как раньше',
    toolbar: {
      title: 'Стиль',
      icon: 'component',
      dynamicTitle: true,
      items: [
        { value: 'base', title: 'стиль: основной' },
        { value: 'signal', title: 'стиль: сигнал' },
      ],
    },
  },
  signalFont: {
    description: 'Дисплейный шрифт стиля «сигнал»: data-signal-font на <html>',
    toolbar: {
      title: 'Шрифт сигнала',
      icon: 'paragraph',
      dynamicTitle: true,
      items: signalFonts.map((font) => ({ value: font, title: signalFontLabels[font] })),
    },
  },
  signalAccent: {
    description: 'Акцент стиля «сигнал»: data-signal-accent на <html>',
    toolbar: {
      title: 'Акцент сигнала',
      icon: 'circle',
      dynamicTitle: true,
      items: signalAccents.map((accent) => ({ value: accent, title: `сигнал: ${accent}` })),
    },
  },
  locale: {
    description: 'Язык подписей кита: UiStringsProvider вокруг истории и lang на <html>',
    toolbar: {
      title: 'Язык',
      icon: 'globe',
      dynamicTitle: true,
      items: [
        { value: 'ru', title: 'язык: ru' },
        { value: 'en', title: 'язык: en' },
      ],
    },
  },
};

/** Значения из тулбара поверх умолчаний: в URL и в тестах приходят не все ключи */
export function resolveGlobals(globals: Record<string, unknown>): HauntGlobals {
  return { ...defaultGlobals, ...(globals as Partial<HauntGlobals>) };
}

/*
 * Пишет напрямую в dataset, а не через applyTheme / applyEffects: те сохраняют выбор в localStorage,
 * и тогда тема из Storybook просочилась бы в `pnpm dev` на том же origin-е и обратно.
 */
export function applyGlobals(globals: HauntGlobals): void {
  const root = document.documentElement;
  const preset = accentPresets[globals.accent] ?? accentPresets.violet;

  root.dataset.theme = globals.theme;
  root.dataset.effects = globals.effects;
  root.dataset.tui = globals.tui;
  root.lang = globals.locale;

  // В «сигнале» акцент — свой (data-signal-accent): инлайн-акцент на том же <html> перебил бы его
  if (globals.style === 'signal') {
    root.dataset.style = 'signal';
    root.dataset.signalFont = globals.signalFont;
    root.dataset.signalAccent = globals.signalAccent;
    root.style.removeProperty('--accent');
    root.style.removeProperty('--accent-2');
    root.style.removeProperty('--accent-contrast');

    return;
  }

  delete root.dataset.style;
  delete root.dataset.signalFont;
  delete root.dataset.signalAccent;
  root.style.setProperty('--accent', preset.accent);
  root.style.setProperty('--accent-2', preset.accent2);
  root.style.setProperty('--accent-contrast', preset.contrast);
}

/**
 * Глобалы из адреса iframe (`?globals=theme:light;accent:teal`). Нужны странице документации: MDX без
 * историй не проходит через декоратор, а первое событие о глобалах приходит раньше, чем она подпишется.
 */
export function readUrlGlobals(): Record<string, string> {
  const raw = new URLSearchParams(window.location.search).get('globals');

  if (!raw) return {};

  return Object.fromEntries(
    raw
      .split(';')
      .map((pair) => pair.split(':'))
      .filter((pair): pair is [string, string] => pair.length === 2 && Boolean(pair[0])),
  );
}
