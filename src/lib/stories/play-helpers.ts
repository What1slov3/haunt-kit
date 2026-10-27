import { expect, userEvent, waitFor, within } from 'storybook/test';

/*
 * Общие шаги play-функций для всплывающего. Только для историй: в приложение не импортируется.
 * Главный регресс, который ловят эти проверки: Radix Presence ждёт animationend, и если keyframes
 * не нашлись (CSS Modules локализовали имя), закрытый слой остаётся в DOM навсегда.
 */

/** Всплывающее порталится в <body>, а не в холст истории — искать его надо по всему документу */
export const screen = () => within(document.body);

export async function pressEscape(): Promise<void> {
  await userEvent.keyboard('{Escape}');
}

/**
 * Клик мимо слоя. Модальные слои Radix ставят на <body> `pointer-events: none`, и userEvent отказался
 * бы кликать, поэтому pointerdown отправляется вручную — именно его слушает DismissableLayer.
 */
export async function clickOutside(target: Element = document.body): Promise<void> {
  target.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      pointerType: 'mouse',
      button: 0,
    }),
  );
  target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
}

/**
 * Слой виден. Через waitFor: появление начинается с opacity 0 (haunt-pop-in), и сразу после
 * открытия toBeVisible ещё видит прозрачный элемент.
 */
export async function expectVisible(element: Element): Promise<void> {
  await waitFor(() => expect(element).toBeVisible());
}

/** Слой не просто скрыт, а размонтирован: анимация ухода дошла до конца */
export async function expectGone(query: () => Element | null): Promise<void> {
  await waitFor(() => expect(query()).toBeNull(), { timeout: 2000 });
}

export async function expectFocused(element: Element): Promise<void> {
  await waitFor(() => expect(element).toHaveFocus());
}
