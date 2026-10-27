import { useEffect, type RefObject } from 'react';

import { altKeyDown, altKeyUp, initialAltKeyState, isMenuKey } from './menubar-keys';

/**
 * Alt и F10 переводят фокус в меню окна и обратно (логика — `menubar-keys.ts`). Слушатели на window в
 * фазе захвата: поле ввода или Radix под фокусом не должны съесть отпускание Alt раньше нас.
 */
export function useMenubarAlt(root: RefObject<HTMLElement | null>, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    let state = initialAltKeyState;
    let previous: HTMLElement | null = null;

    const toggle = () => {
      const element = root.current;
      const active = document.activeElement;

      if (!element) return;

      // Фокус в полосе или в открытом меню — вернуть его туда, откуда пришли
      if (
        active instanceof HTMLElement &&
        (element.contains(active) || active.closest('[role="menu"]'))
      ) {
        const target = previous?.isConnected ? previous : null;

        previous = null;

        if (target) target.focus();
        else active.blur();

        return;
      }

      previous = active instanceof HTMLElement && active !== document.body ? active : null;

      const trigger =
        element.querySelector<HTMLElement>('[role="menuitem"][tabindex="0"]') ??
        element.querySelector<HTMLElement>('[role="menuitem"]');

      trigger?.focus();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isMenuKey(event)) {
        event.preventDefault();
        toggle();

        return;
      }

      state = altKeyDown(state, event);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const result = altKeyUp(state, event);

      state = result.state;

      if (!result.toggle) return;

      // В Windows отпущенный Alt иначе отдаёт фокус системному меню окна
      event.preventDefault();
      toggle();
    };

    // Alt+клик (выделение, открыть в новом окне) — тоже сочетание, не вход в меню
    const disarm = () => {
      state = initialAltKeyState;
    };

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('pointerdown', disarm, true);
    window.addEventListener('blur', disarm);

    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('pointerdown', disarm, true);
      window.removeEventListener('blur', disarm);
    };
  }, [root, enabled]);
}
