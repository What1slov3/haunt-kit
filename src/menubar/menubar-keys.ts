/*
 * Alt как в десктопе: нажали и отпустили Alt без других клавиш — фокус переходит в меню окна, повтор
 * возвращает его обратно. Alt+буква, Alt+Tab и Alt+клик — это сочетания, а не вход в меню, поэтому любая
 * другая клавиша или клик между нажатием и отпусканием «разряжают» Alt. Radix Menubar этого не умеет:
 * в браузере Alt ничего не значит, а в окне Tauri меню своё, и его ждут как в системном.
 */

export interface AltKeyState {
  /** Alt нажат один, без других клавиш, — отпускание переключит фокус */
  armed: boolean;
}

export type AltKeyEvent = Pick<
  KeyboardEvent,
  'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'repeat'
>;

export const initialAltKeyState: AltKeyState = { armed: false };

export function altKeyDown(state: AltKeyState, event: AltKeyEvent): AltKeyState {
  if (event.key !== 'Alt') return { armed: false };
  // Автоповтор зажатого Alt ничего не меняет: важно, что между нажатием и отпусканием не было другого
  if (event.repeat) return state;

  return { armed: !event.ctrlKey && !event.metaKey && !event.shiftKey };
}

/** Отпускание: `toggle` — пора переключить фокус между меню и прежним местом */
export function altKeyUp(
  state: AltKeyState,
  event: Pick<KeyboardEvent, 'key'>,
): { state: AltKeyState; toggle: boolean } {
  return { state: { armed: false }, toggle: state.armed && event.key === 'Alt' };
}

/** F10 без модификаторов — тот же вход в меню, что Alt, как в Windows и GNOME */
export function isMenuKey(event: AltKeyEvent & Pick<KeyboardEvent, 'altKey'>): boolean {
  return (
    event.key === 'F10' && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey
  );
}
