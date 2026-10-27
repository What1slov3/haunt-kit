import type { ComponentPropsWithRef, ElementType } from 'react';

import { accentStyle, resolveAccent, type AccentName, type AccentPreset } from './accent';
import { PortalContainerContext } from './portal-container';
import { usePortalHost } from './use-portal-host';

export interface AccentScopeProps extends ComponentPropsWithRef<'div'> {
  /** Имя пресета или свои три цвета */
  accent: AccentName | AccentPreset;
  /** Какой тег рендерить вместо div (section, main…) */
  as?: ElementType;
}

/**
 * Контейнер со своим акцентом: всё внутри (кнопки, вкладки, фокус, свои сообщения) красится в него.
 * Всплывающее (меню, поповер, диалог, подсказка) порталится в хост с теми же переменными, поэтому
 * тоже окрашено — передавать `container` вручную не нужно.
 */
export function AccentScope({ accent, as, style, ...rest }: AccentScopeProps) {
  const preset = resolveAccent(accent);
  const Component = as ?? 'div';
  const host = usePortalHost(
    { accentHost: '' },
    {
      '--accent': preset.accent,
      '--accent-2': preset.accent2,
      '--accent-contrast': preset.contrast,
    },
  );

  return (
    <PortalContainerContext.Provider value={host}>
      <Component style={{ ...accentStyle(preset), ...style }} {...rest} />
    </PortalContainerContext.Provider>
  );
}
