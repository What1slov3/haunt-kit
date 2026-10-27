/*
 * Ширины заглушек строк — псевдослучайные, но устойчивые по seed: лента из одинаковых полос выглядит
 * таблицей, а «случайная» при каждом рендере прыгала бы. Тот же seed — те же ширины в тестах и снимках.
 */

/** Генератор mulberry32: детерминированный, быстрый, без зависимостей */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;

    let t = state;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SkeletonMessageRow {
  /** Ширина имени автора, px */
  name: number;
  /** Ширины строк текста, % */
  lines: number[];
  /** Плашка вложения под текстом */
  attachment: boolean;
}

export interface SkeletonRowsOptions {
  seed?: number;
  /** Доля сообщений с вложением, 0–1 */
  attachments?: number;
}

/** Строки ленты: имя 64–120 px, 1–3 строки текста, последняя короче; изредка — вложение */
export function messageRows(
  count: number,
  { seed = 1, attachments = 0 }: SkeletonRowsOptions = {},
) {
  const random = seededRandom(seed);

  return Array.from({ length: Math.max(0, count) }, (): SkeletonMessageRow => {
    const name = Math.round(64 + random() * 56);
    const lineCount = 1 + Math.floor(random() * 3);
    const lines = Array.from({ length: lineCount }, (_, i) =>
      i === lineCount - 1 ? Math.round(30 + random() * 45) : Math.round(80 + random() * 20),
    );

    return { name, lines, attachment: random() < attachments };
  });
}

/** Имена участников: 40–85 % ширины строки */
export function memberRows(count: number, seed = 1): number[] {
  const random = seededRandom(seed);

  return Array.from({ length: Math.max(0, count) }, () => Math.round(40 + random() * 45));
}
