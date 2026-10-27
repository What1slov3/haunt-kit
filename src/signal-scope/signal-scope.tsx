import { useEffect, useState, type ComponentPropsWithRef } from 'react';

import { PortalContainerContext, usePortalContainer } from '../theme/portal-container';

import type { SignalAccent, SignalFont } from './signal-options';

export interface SignalScopeProps extends ComponentPropsWithRef<'div'> {
  /** Дисплейный шрифт стиля; по умолчанию — Archivo широкий */
  font?: SignalFont;
  /** Кислотный акцент стиля; по умолчанию — лайм. AccentScope внутри всё равно главнее */
  accent?: SignalAccent;
}

/**
 * Хост для порталов внутри скоупа: элемент с `display: contents` и атрибутами стиля. Кладётся не в
 * <body>, а в контейнер порталов снаружи (хост ThemeScope / AccentScope, если он есть), поэтому меню
 * внутри «сигнала» в светлом ThemeScope получают и стиль, и тему.
 */
function useSignalPortalHost(font?: SignalFont, accent?: SignalAccent): HTMLElement | null {
  const parent = usePortalContainer();
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const element = document.createElement('div');

    element.style.display = 'contents';
    element.dataset.style = 'signal';
    (parent ?? document.body).appendChild(element);
    setHost(element);

    return () => {
      element.remove();
      setHost(null);
    };
  }, [parent]);

  useEffect(() => {
    if (!host) return;

    if (font) host.dataset.signalFont = font;
    else delete host.dataset.signalFont;

    if (accent) host.dataset.signalAccent = accent;
    else delete host.dataset.signalAccent;
  }, [host, font, accent]);

  return host;
}

/**
 * Контейнер в стиле «сигнал»: `data-style="signal"` и переключатели шрифта и акцента. Всплывающее внутри
 * (меню, подсказки, диалоги) порталится в хост с теми же атрибутами — стиль не теряется у порталов.
 * Нужен импорт `@haunt/ui/signal` один раз в приложении: без него атрибут ничего не меняет.
 */
export function SignalScope({ font, accent, ...rest }: SignalScopeProps) {
  const host = useSignalPortalHost(font, accent);

  return (
    <PortalContainerContext.Provider value={host}>
      <div data-style="signal" data-signal-font={font} data-signal-accent={accent} {...rest} />
    </PortalContainerContext.Provider>
  );
}
