import { createContext, useContext } from 'react';

/**
 * Куда порталить всплывающее (меню, поповер, диалог, подсказка). По умолчанию — <body>, и тогда
 * содержимое не наследует акцент и тему контейнера. AccentScope / ThemeScope создают в <body>
 * «хост» с теми же переменными и кладут его сюда; примитивы берут его через usePortalContainer.
 */
export const PortalContainerContext = createContext<HTMLElement | null>(null);

export function usePortalContainer(): HTMLElement | undefined {
  return useContext(PortalContainerContext) ?? undefined;
}
