import { useEffect, useState, type PropsWithChildren } from 'react';

import { DocsContainer, type DocsContainerProps } from '@storybook/addon-docs/blocks';
import { GLOBALS_UPDATED } from 'storybook/internal/core-events';

import { AmbientBackground, ThemeProvider, Toaster, UiStringsProvider } from '@haunt/ui';

import { applyGlobals, readUrlGlobals, resolveGlobals, type HauntGlobals } from './haunt-globals';
import { hauntDark, hauntLight } from './storybook-themes';

/*
 * Обёртка страниц документации (autodocs и MDX). Истории на странице рендерятся каждая в свой
 * React-корень и проходят через декоратор, а сама страница — нет: без этой обёртки MDX «Токены»
 * показывал бы значения не той темы, оформление документации не переключалось бы с тулбаром, а живые
 * примеры руководства (компоненты прямо в MDX) остались бы без ThemeProvider — подсказки и useTheme
 * требуют его, — и без языка из тулбара.
 */
export function HauntDocsContainer({ context, children }: PropsWithChildren<DocsContainerProps>) {
  const [globals, setGlobals] = useState<HauntGlobals>(() => resolveGlobals(readUrlGlobals()));

  useEffect(() => {
    const onGlobalsUpdated = (event: { globals: Record<string, unknown> }) =>
      setGlobals(resolveGlobals(event.globals));

    context.channel.on(GLOBALS_UPDATED, onGlobalsUpdated);

    return () => context.channel.off(GLOBALS_UPDATED, onGlobalsUpdated);
  }, [context]);

  useEffect(() => applyGlobals(globals), [globals]);

  return (
    <DocsContainer context={context} theme={globals.theme === 'light' ? hauntLight : hauntDark}>
      {/* Один фон и один Toaster на страницу: в декораторе каждой истории их было бы по копии */}
      <UiStringsProvider locale={globals.locale}>
        {/* key — ThemeProvider читает тему с <html> один раз при монтировании; смена темы его пересоздаёт */}
        <ThemeProvider key={globals.theme}>
          {globals.background !== 'none' && (
            <AmbientBackground variant={globals.background} reaction={globals.reaction} />
          )}

          {children}

          <Toaster />
        </ThemeProvider>
      </UiStringsProvider>
    </DocsContainer>
  );
}
