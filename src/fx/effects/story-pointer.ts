/*
 * Движение указателя для play-функций эффектов за курсором. userEvent.hover не даёт координат, а
 * наклону и магниту нужны clientX/clientY. Только для историй: в API кита не входит.
 */
export function movePointer(
  target: Element,
  clientX: number,
  clientY: number,
  pointerType: 'mouse' | 'touch' = 'mouse',
): void {
  target.dispatchEvent(
    new PointerEvent('pointermove', { bubbles: true, clientX, clientY, pointerType }),
  );
}
