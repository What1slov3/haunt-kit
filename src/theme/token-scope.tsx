import type { ComponentPropsWithRef, ElementType } from 'react';

import { PortalContainerContext, usePortalContainer } from './portal-container';
import { tokenStyle, type TokenValues } from './tokens';
import { usePortalHost } from './use-portal-host';

export interface TokenScopeProps extends ComponentPropsWithRef<'div'> {
  /** Токены, переопределённые внутри: `{ radiusLg: '4px', controlMd: '32px' }` */
  tokens: TokenValues;
  /** Какой тег рендерить вместо div (section, main…) */
  as?: ElementType;
}

/**
 * Контейнер со своими значениями токенов: всё внутри читает их — плотность, скругления, цвета. Всплывающее
 * (меню, поповер, диалог) порталится в хост с теми же переменными, вложенный в хост внешнего скоупа: внутри
 * `AccentScope › TokenScope` меню получает и акцент, и токены.
 */
export function TokenScope({ tokens: values, as, style, ...rest }: TokenScopeProps) {
  const Component = as ?? 'div';
  const inline = tokenStyle(values);
  const host = usePortalHost(
    { tokenHost: '' },
    inline as Record<string, string>,
    usePortalContainer(),
  );

  return (
    <PortalContainerContext.Provider value={host}>
      <Component style={{ ...inline, ...style }} {...rest} />
    </PortalContainerContext.Provider>
  );
}
