import { useEffect, useEffectEvent } from 'react';

import {
  currentPlatform,
  isApplePlatform,
  isEditableTarget,
  matchHotkey,
  parseHotkey,
} from './hotkey';

export interface UseHotkeyOptions {
  /** Выключить без условного вызова хука */
  enabled?: boolean;
  /**
   * Срабатывать и при фокусе в поле ввода. По умолчанию нет: `/` или `?` в композере — это текст. Включать
   * для сочетаний с модификатором, которые нужны везде (`mod+k`)
   */
  allowInInput?: boolean;
  /** Погасить действие браузера по умолчанию (Ctrl+K — поиск в адресной строке); по умолчанию да */
  preventDefault?: boolean;
}

/**
 * Глобальное сочетание клавиш: `useHotkey('mod+k', () => setOpen(true))`. Слушает keydown на window;
 * несколько сочетаний — массивом. Обработчик берётся последний, без переподписки на каждый рендер.
 */
export function useHotkey(
  combo: string | readonly string[],
  handler: (event: KeyboardEvent) => void,
  { enabled = true, allowInInput = false, preventDefault = true }: UseHotkeyOptions = {},
): void {
  const onMatch = useEffectEvent(handler);
  // Зависимость — строка: массив сочетаний собирается заново на каждом рендере
  const combosKey = typeof combo === 'string' ? combo : combo.join('\n');

  useEffect(() => {
    if (!enabled) return;

    const hotkeys = combosKey.split('\n').map(parseHotkey);
    const apple = isApplePlatform(currentPlatform());

    const listener = (event: KeyboardEvent) => {
      // Набор через IME (китайский, японский): Enter и стрелки выбирают иероглиф, а не действие
      if (event.isComposing || event.defaultPrevented) return;
      if (!allowInInput && isEditableTarget(event.target)) return;
      if (!hotkeys.some((hotkey) => matchHotkey(event, hotkey, apple))) return;

      if (preventDefault) event.preventDefault();

      onMatch(event);
    };

    window.addEventListener('keydown', listener);

    return () => window.removeEventListener('keydown', listener);
  }, [combosKey, enabled, allowInInput, preventDefault]);
}
