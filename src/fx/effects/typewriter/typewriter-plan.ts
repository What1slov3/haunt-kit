import { graphemes } from '../text-utils';

/*
 * Расписание печатной машинки — чистые функции. Время каждого символа считается заранее, кадр только
 * ищет, сколько символов видно к моменту `elapsed`: печать не зависит от частоты кадров и пропусков.
 * После знаков препинания — пауза, как у человека: строка читается фразами, а не ровной лентой.
 */

export interface TypewriterTiming {
  /** Символ печатается за, мс */
  typeMs: number;
  /** Символ стирается за, мс */
  deleteMs: number;
  /** Пауза на напечатанной строке перед стиранием, мс */
  holdMs: number;
  /** Пауза перед первым символом, мс */
  startDelay: number;
  /** После последней строки стереть её и начать с первой */
  loop: boolean;
}

interface Segment {
  chars: string[];
  start: number;
  /** Момент, когда напечатан k-й символ (k = индекс + 1) */
  typed: number[];
  typedEnd: number;
  holdEnd: number;
  /** Конец стирания; у последней строки без loop — равен holdEnd (не стирается) */
  deleteEnd: number;
}

export interface TypewriterPlan {
  segments: Segment[];
  deleteMs: number;
  startDelay: number;
  loop: boolean;
  /** Длина одного цикла по всем строкам, мс */
  cycle: number;
}

export type TypewriterPhase = 'waiting' | 'typing' | 'holding' | 'deleting' | 'done';

export interface TypewriterFrame {
  index: number;
  /** Сколько символов строки видно */
  count: number;
  phase: TypewriterPhase;
}

const PAUSE_AFTER = /[,.!?;:…—]/u;
const PAUSE_FACTOR = 5;

export function planTypewriter(texts: readonly string[], timing: TypewriterTiming): TypewriterPlan {
  const segments: Segment[] = [];
  let time = 0;

  texts.forEach((text, index) => {
    const chars = graphemes(text);
    const start = time;
    const typed: number[] = [];

    for (let position = 0; position < chars.length; position++) {
      const previous = chars[position - 1];
      // Пауза — перед символом после знака препинания: сам знак появляется сразу
      const pause = previous && PAUSE_AFTER.test(previous) ? timing.typeMs * PAUSE_FACTOR : 0;

      time += timing.typeMs + pause;
      typed.push(time);
    }

    const typedEnd = time;
    const last = index === texts.length - 1;
    const holdEnd = typedEnd + (last && !timing.loop ? 0 : timing.holdMs);
    const deleteEnd = last && !timing.loop ? holdEnd : holdEnd + chars.length * timing.deleteMs;

    segments.push({ chars, start, typed, typedEnd, holdEnd, deleteEnd });
    time = deleteEnd;
  });

  return {
    segments,
    deleteMs: timing.deleteMs,
    startDelay: timing.startDelay,
    loop: timing.loop,
    cycle: time,
  };
}

/** Что видно в момент `elapsed` от запуска */
export function typewriterFrame(plan: TypewriterPlan, elapsed: number): TypewriterFrame {
  const { segments } = plan;
  let t = elapsed - plan.startDelay;

  if (segments.length === 0) return { index: 0, count: 0, phase: 'done' };

  if (t < 0) return { index: 0, count: 0, phase: 'waiting' };

  if (plan.loop && plan.cycle > 0) t %= plan.cycle;
  else if (t >= plan.cycle) {
    const last = segments.length - 1;

    return { index: last, count: segments[last]!.chars.length, phase: 'done' };
  }

  const index = Math.max(
    0,
    segments.findIndex((segment) => t < segment.deleteEnd),
  );
  const segment = segments[index]!;

  if (t < segment.typedEnd) {
    // Символов видно столько, сколько моментов печати уже прошло
    let count = 0;

    while (count < segment.typed.length && segment.typed[count]! <= t) count++;

    return { index, count, phase: 'typing' };
  }

  if (t < segment.holdEnd) return { index, count: segment.chars.length, phase: 'holding' };

  const removed = Math.floor((t - segment.holdEnd) / plan.deleteMs) + 1;

  return { index, count: Math.max(0, segment.chars.length - removed), phase: 'deleting' };
}

/** Видимая часть строки: графемы, а не UTF-16 — эмодзи не печатаются половинками */
export function typedText(plan: TypewriterPlan, frame: TypewriterFrame): string {
  return (plan.segments[frame.index]?.chars ?? []).slice(0, frame.count).join('');
}
