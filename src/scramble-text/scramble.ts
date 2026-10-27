import { isMotionAllowed } from '../fx/environment';

/** Набор «шумовых» символов: латиница, цифры и знаки — все есть в JetBrains Mono одной ширины */
export const SCRAMBLE_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+=<>/?';

/**
 * Кадр расшифровки: первые `progress` × длина символов уже настоящие, остальные — случайные из набора.
 * Пробелы не шумят: слова сохраняют форму, и текст узнаётся раньше, чем допишется. `random` — параметром,
 * чтобы кадр проверялся в тестах детерминированно
 */
export function scrambleFrame(
  text: string,
  progress: number,
  random: () => number = Math.random,
  charset: string = SCRAMBLE_CHARSET,
): string {
  const chars = [...text];
  const noise = [...charset];

  if (progress >= 1 || noise.length === 0) return text;

  const resolved = Math.floor(Math.max(0, progress) * chars.length);

  return chars
    .map((char, index) => {
      if (index < resolved || /\s/u.test(char)) return char;

      return noise[Math.floor(random() * noise.length)] ?? char;
    })
    .join('');
}

/** Длина кадра: символы меняются ступенями, как в терминале, а не на каждом кадре экрана */
const FRAME_MS = 40;

export interface ScrambleOptions {
  text: string;
  duration: number;
  charset: string;
}

/**
 * Запустить расшифровку: `onFrame` получает кадры, в конце — `null` (показать итог). Без разрешения на
 * движение сразу `null`. Возвращает отмену
 */
export function runScramble(
  element: Element,
  { text, duration, charset }: ScrambleOptions,
  onFrame: (frame: string | null) => void,
): () => void {
  if (!isMotionAllowed(element) || duration <= 0) {
    onFrame(null);

    return () => {};
  }

  const startedAt = performance.now();
  let lastStep = -1;
  let raf = 0;

  const tick = (now: number) => {
    const elapsed = now - startedAt;

    if (elapsed >= duration) {
      onFrame(null);

      return;
    }

    const step = Math.floor(elapsed / FRAME_MS);

    if (step !== lastStep) {
      lastStep = step;
      onFrame(scrambleFrame(text, elapsed / duration, Math.random, charset));
    }

    raf = requestAnimationFrame(tick);
  };

  onFrame(scrambleFrame(text, 0, Math.random, charset));
  raf = requestAnimationFrame(tick);

  return () => cancelAnimationFrame(raf);
}
