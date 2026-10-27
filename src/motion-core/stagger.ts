import type { CSSProperties } from 'react';

/*
 * Каскад через CSS-переменную индекса: элемент получает `--stagger-index`, а задержку считает CSS
 * (`calc(min(index, max) × step)`). JS не держит таймеров, и каскад работает в любом CSS — анимации,
 * переходе, scroll-driven.
 */

export interface StaggerOptions {
  /** Шаг, мс */
  step?: number;
  /** После скольких элементов задержка больше не растёт: длинный список не ждёт секунды */
  max?: number;
}

/** Задержка элемента `index`, мс — та же формула, что в CSS `Stagger` */
export function staggerDelay(index: number, { step = 30, max = 12 }: StaggerOptions = {}): number {
  return Math.min(Math.max(0, index), max) * step;
}

/**
 * Стиль элемента каскада: `--stagger-index` (и шаг, если задан). В своём CSS:
 * `animation-delay: calc(min(var(--stagger-index), var(--stagger-max, 12)) * var(--stagger-step, 30ms))`.
 */
export function stagger(index: number, options: StaggerOptions = {}): CSSProperties {
  return {
    '--stagger-index': index,
    ...(options.step !== undefined && { '--stagger-step': `${options.step}ms` }),
    ...(options.max !== undefined && { '--stagger-max': options.max }),
  } as CSSProperties;
}
