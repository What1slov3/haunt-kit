/*
 * Прореживание звуков — чистое состояние без часов: время передаёт вызывающий. Три правила: один и тот
 * же звук не чаще своего `minInterval` (наведение по списку не превращается в треск), одновременно не
 * больше `maxVoices` звуков, и не больше `maxPerSecond` за скользящую секунду — частые повторы глушатся,
 * а не складываются в громкость.
 */

export interface LimiterOptions {
  maxVoices: number;
  maxPerSecond: number;
}

export const DEFAULT_LIMITS: LimiterOptions = { maxVoices: 4, maxPerSecond: 10 };

export type LimitReason = 'interval' | 'voices' | 'rate';

export interface Limiter {
  /**
   * Можно ли сыграть звук `name` длиной `duration` мс в момент `now` (мс). Да — звук учтён
   * (занял голос до `now + duration`). Нет — причина, звук не учтён.
   */
  take(name: string, now: number, duration: number, minInterval: number): true | LimitReason;
  /**
   * Звук `name` остановили раньше конца: голос свободен с `now`, и повторить можно сразу — интервал
   * гасит частые повторы, а не явную остановку
   */
  release(name: string, now: number): void;
}

export function createLimiter(options: LimiterOptions = DEFAULT_LIMITS): Limiter {
  const last = new Map<string, number>();
  let voices: { name: string; end: number }[] = [];
  let recent: number[] = [];

  return {
    take(name, now, duration, minInterval) {
      const previous = last.get(name);

      if (previous !== undefined && now - previous < minInterval) return 'interval';

      voices = voices.filter((voice) => voice.end > now);
      recent = recent.filter((at) => now - at < 1000);

      if (voices.length >= options.maxVoices) return 'voices';

      if (recent.length >= options.maxPerSecond) return 'rate';

      last.set(name, now);
      voices.push({ name, end: now + duration });
      recent.push(now);

      return true;
    },

    release(name, now) {
      for (const voice of voices) if (voice.name === name) voice.end = Math.min(voice.end, now);

      last.delete(name);
    },
  };
}
