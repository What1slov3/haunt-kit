/*
 * Кэш готовых кадров на модуль: одна и та же обложка в списке и в превью, повторный монтаж после
 * смены вкладки, возврат темы туда-обратно — кадр берётся готовым, без пересчёта пикселей.
 * Ключ включает всё, от чего зависит кадр (источник, режим, размер, ячейку, масштаб, палитру, шрифт),
 * поэтому инвалидировать ничего не нужно: изменился вход — другой ключ.
 */

/** Кадр 1200×600 при масштабе 2 — около 11 МБ; 24 кадра держат витрину и пару экранов, не раздувая память */
const MAX_FRAMES = 24;

const frames = new Map<string, HTMLCanvasElement>();

export function getFrame(key: string, render: () => HTMLCanvasElement): HTMLCanvasElement {
  const cached = frames.get(key);

  if (cached) {
    // Map помнит порядок вставки: переставляем в конец — так первым вытесняется давно не нужный
    frames.delete(key);
    frames.set(key, cached);

    return cached;
  }

  const frame = render();

  frames.set(key, frame);

  if (frames.size > MAX_FRAMES) {
    frames.delete(frames.keys().next().value!);
  }

  return frame;
}

/** Для тестов и для ручного сброса после смены шрифтов */
export function clearFrames(): void {
  frames.clear();
}
