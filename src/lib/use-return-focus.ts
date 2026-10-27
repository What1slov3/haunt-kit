import { useRef } from 'react';

/**
 * Возврат фокуса туда, где он был до открытия модального слоя. Radix Dialog после закрытия фокусирует
 * свой Trigger, а слой, открытый сочетанием клавиш или из пункта меню, триггера не имеет — фокус падал
 * на <body>, и человек терял место (композер, список). Обработчики — в `onOpenAutoFocus` /
 * `onCloseAutoFocus` у Content: при открытии фокус ещё на прежнем элементе.
 */
export function useReturnFocus() {
  const previous = useRef<HTMLElement | null>(null);

  return {
    remember: () => {
      const active = document.activeElement;

      previous.current = active instanceof HTMLElement && active !== document.body ? active : null;
    },
    restore: (event: Event) => {
      const element = previous.current;

      previous.current = null;

      // Элемент исчез (пункт закрытого меню) — пусть Radix сделает своё: фокус на Trigger, если он есть
      if (!element?.isConnected) return;

      // Выбранная команда сама увела фокус (в поле поиска, в новый слой) — не отбирать его обратно.
      // Событие приходит на контейнер слоя: фокус внутри него или на <body> — ещё ничей
      const active = document.activeElement;
      const layer = event.target instanceof Node ? event.target : null;

      if (active && active !== document.body && !layer?.contains(active)) return;

      event.preventDefault();
      element.focus();
    },
  };
}
