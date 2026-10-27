/*
 * Прожектор: один слушатель pointermove на окно, обновление в requestAnimationFrame. Все элементы с
 * `data-spotlight` под курсором — вся цепочка предков, а не только ближайший — получают `--spot-x` /
 * `--spot-y` (в своих координатах) и `data-spotlight-on`; рисует свечение effects.css. Цепочка — чтобы
 * панель не гасла, когда курсор зашёл на кнопку с собственным прожектором внутри неё. Никаких подписок
 * на каждый элемент — панелей может быть много, а курсор один.
 */
const SELECTOR = '[data-spotlight]';

function chainOf(target: EventTarget | null): HTMLElement[] {
  const chain: HTMLElement[] = [];
  let node = target instanceof Element ? target.closest<HTMLElement>(SELECTOR) : null;

  while (node) {
    chain.push(node);
    node = node.parentElement?.closest<HTMLElement>(SELECTOR) ?? null;
  }

  return chain;
}

export function installSpotlight(): () => void {
  let frame = 0;
  let pending: PointerEvent | null = null;
  let current: HTMLElement[] = [];

  const clear = (keep: HTMLElement[] = []) => {
    for (const element of current) {
      if (!keep.includes(element)) element.removeAttribute('data-spotlight-on');
    }

    current = keep;
  };

  const flush = () => {
    frame = 0;

    const event = pending;

    if (!event) return;

    const chain = chainOf(event.target);

    clear(chain);

    for (const element of chain) {
      const rect = element.getBoundingClientRect();

      element.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
      element.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
      element.setAttribute('data-spotlight-on', '');
    }
  };

  const onMove = (event: PointerEvent) => {
    pending = event;

    if (!frame) frame = requestAnimationFrame(flush);
  };

  const onLeave = () => {
    pending = null;
    clear();
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);

  return () => {
    window.removeEventListener('pointermove', onMove);
    document.documentElement.removeEventListener('pointerleave', onLeave);
    if (frame) cancelAnimationFrame(frame);
    clear();
  };
}
