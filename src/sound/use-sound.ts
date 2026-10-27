import { useEffect, type RefObject } from 'react';

import { sound, type PlayResult } from './sound';
import type { SoundName } from './sounds';

/**
 * Звуки в компоненте: `const play = useSound(ref)` → `play('send')`. Уровень читается с ближайшего
 * `[data-sound]` элемента из ref (без ref — с <html>) в момент вызова, а не при рендере: смена
 * уровня в настройках действует сразу. Движок догружается при монтировании — первый звук не ждёт.
 */
export function useSound(
  ref?: RefObject<Element | null>,
): (name: SoundName, volume?: number) => PlayResult {
  useEffect(() => {
    void sound.preload();
  }, []);

  return (name, volume) => sound.play(name, { element: ref?.current ?? null, volume });
}
