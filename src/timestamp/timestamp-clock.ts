/*
 * Один таймер на все Timestamp на экране, а не по setInterval на каждый: в ленте сотни подписей.
 * Подписка разовая: слушатель вызывается один раз, когда подошёл его срок, и подписывается заново с
 * новой задержкой (она зависит от того, что теперь в подписи). Таймер всегда один — на ближайший срок.
 */

type Listener = () => void;

/**
 * Сроки округляются вверх до кванта: подписи, смонтированные в разное время, обновляются одним
 * тиком и одним рендером, а не вразнобой. Опоздание до 5 с на шкале «минут» незаметно
 */
export const CLOCK_QUANTUM = 5_000;

const due = new Map<Listener, number>();

let timer: ReturnType<typeof setTimeout> | undefined;
let timerAt = Number.POSITIVE_INFINITY;

function schedule(): void {
  let next = Number.POSITIVE_INFINITY;

  for (const at of due.values()) next = Math.min(next, at);

  if (next === timerAt) return;

  if (timer !== undefined) clearTimeout(timer);

  timer = undefined;
  timerAt = next;

  if (next === Number.POSITIVE_INFINITY) return;

  timer = setTimeout(fire, Math.max(0, next - Date.now()));
}

function fire(): void {
  timer = undefined;
  timerAt = Number.POSITIVE_INFINITY;

  const now = Date.now();
  const ready: Listener[] = [];

  for (const [listener, at] of due) {
    if (at <= now) ready.push(listener);
  }

  for (const listener of ready) due.delete(listener);

  schedule();

  for (const listener of ready) listener();
}

/** Вызвать `listener` один раз через ~`delay` мс; возвращает отписку */
export function subscribeClock(listener: Listener, delay: number): () => void {
  const at = Math.ceil((Date.now() + delay) / CLOCK_QUANTUM) * CLOCK_QUANTUM;

  due.set(listener, at);
  schedule();

  return () => {
    due.delete(listener);
    schedule();
  };
}
