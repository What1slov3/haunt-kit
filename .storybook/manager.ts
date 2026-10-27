import { addons } from 'storybook/manager-api';
import { GLOBALS_UPDATED, SET_GLOBALS } from 'storybook/internal/core-events';

import { hauntDark, hauntLight } from './storybook-themes';

// По умолчанию интерфейс тёмный, как основная тема кита
addons.setConfig({ theme: hauntDark });

/*
 * Интерфейс Storybook следует теме из тулбара, как сайдбар Fumadocs следует теме страницы: иначе в
 * светлой теме светлая документация сидела бы в тёмной рамке. Атрибут на <html> менеджера нужен
 * стилям из manager-head.html — активному пункту сайдбара своего цвета в каждой теме.
 */
addons.register('haunt/theme-sync', (api) => {
  let current: string | undefined;

  const apply = ({ globals }: { globals?: Record<string, unknown> }) => {
    const theme = globals?.theme === 'light' ? 'light' : 'dark';

    if (theme === current) return;

    current = theme;
    document.documentElement.dataset.hauntTheme = theme;
    api.setOptions({ theme: theme === 'light' ? hauntLight : hauntDark });
  };

  api.on(SET_GLOBALS, apply);
  api.on(GLOBALS_UPDATED, apply);
});
