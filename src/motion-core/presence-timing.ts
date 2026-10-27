/*
 * Сколько ждать анимацию ухода — чистые функции над вычисленным стилем. Presence ждёт `animationend`,
 * а таймер-страховка снимает элемент, если событие не пришло: keyframes не нашлись (имя локализовали
 * CSS Modules — урок «дропдауны не закрываются»), анимацию перебили, вкладка ушла в фон.
 */

/** '0.15s, 90ms' → [150, 90] (мс) */
export function parseCssTimes(value: string): number[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const number = Number.parseFloat(part);

      if (!Number.isFinite(number)) return 0;

      return part.endsWith('ms') ? number : number * 1000;
    });
}

/** Без анимации (none, нулевая длительность) — уходить сразу */
export function hasExitAnimation(names: string, durations: string): boolean {
  const animated = names.split(',').some((name) => name.trim() && name.trim() !== 'none');

  return animated && parseCssTimes(durations).some((duration) => duration > 0);
}

/**
 * Самая поздняя из анимаций элемента: задержка + длительность × повторы. Списки CSS повторяются
 * по кругу до длины списка имён — как считает браузер. Бесконечная — `fallback`.
 */
export function exitDuration(
  style: {
    animationName: string;
    animationDuration: string;
    animationDelay: string;
    animationIterationCount: string;
  },
  fallback = 1000,
): number {
  const names = style.animationName.split(',');
  const durations = parseCssTimes(style.animationDuration);
  const delays = parseCssTimes(style.animationDelay);
  const counts = style.animationIterationCount.split(',').map((part) => part.trim());
  let longest = 0;

  names.forEach((name, index) => {
    if (name.trim() === 'none') return;

    const duration = durations[index % Math.max(durations.length, 1)] ?? 0;
    const delay = delays[index % Math.max(delays.length, 1)] ?? 0;
    const count = counts[index % Math.max(counts.length, 1)] ?? '1';
    const total =
      count === 'infinite' ? fallback : delay + duration * (Number.parseFloat(count) || 1);

    longest = Math.max(longest, total);
  });

  return longest;
}
