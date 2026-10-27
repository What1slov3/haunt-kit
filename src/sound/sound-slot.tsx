import { Slot } from 'radix-ui';
import type { FocusEvent, MouseEvent, PointerEvent, ReactElement } from 'react';

import { sound } from './sound';
import type { SoundName } from './sounds';

export interface SoundSlotProps {
  /** Один элемент — кнопка, пункт меню, ссылка; обработчики сливаются с его собственными */
  children: ReactElement;
  /** Звук на нажатие (click) */
  press?: SoundName;
  /** Звук на наведение мышью; на касание не звучит */
  hover?: SoundName;
  /** Звук на фокус с клавиатуры */
  focus?: SoundName;
  volume?: number;
}

/**
 * Обёртка для приложения: озвучить чужой компонент, не меняя его. `<SoundSlot press="send">
 * <Button>…</Button></SoundSlot>` — звук на клик кнопки, уровень — с ближайшего `[data-sound]`
 * (по умолчанию off, так что без настройки ничего не звучит). Кит сам ничего не озвучивает.
 */
export function SoundSlot({ children, press, hover, focus, volume }: SoundSlotProps) {
  const play = (name: SoundName | undefined, element: Element) => {
    if (name) sound.play(name, { element, volume });
  };

  return (
    <Slot.Root
      onClick={
        press ? (event: MouseEvent<HTMLElement>) => play(press, event.currentTarget) : undefined
      }
      onPointerEnter={
        hover
          ? (event: PointerEvent<HTMLElement>) => {
              if (event.pointerType === 'mouse') play(hover, event.currentTarget);
            }
          : undefined
      }
      onFocus={
        focus
          ? (event: FocusEvent<HTMLElement>) => {
              // Только фокус с клавиатуры: фокус от клика уже озвучен нажатием
              if (event.currentTarget.matches(':focus-visible')) play(focus, event.currentTarget);
            }
          : undefined
      }
    >
      {children}
    </Slot.Root>
  );
}
