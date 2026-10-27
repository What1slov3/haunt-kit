import type { ComponentPropsWithRef } from 'react';

import { PortalContainerContext } from './portal-container';
import type { Theme } from './theme';
import { usePortalHost } from './use-portal-host';

export interface ThemeScopeProps extends ComponentPropsWithRef<'div'> {
  /** Тема содержимого контейнера, независимо от темы на <html> */
  theme: Theme;
}

/**
 * Контейнер с другой темой (витрина показывает обе рядом). Как и AccentScope, заводит хост для
 * порталов, чтобы меню и подсказки внутри были в той же теме.
 */
export function ThemeScope({ theme, ...rest }: ThemeScopeProps) {
  const host = usePortalHost({ theme }, {});

  return (
    <PortalContainerContext.Provider value={host}>
      <div data-theme={theme} {...rest} />
    </PortalContainerContext.Provider>
  );
}
