import { useLayoutEffect, useState, type RefObject } from 'react';

/**
 * Ширина элемента по ResizeObserver — график перестраивается под колонку, а не под окно. До первого
 * измерения — 0: компонент не рисует ось по случайной ширине, чтобы она не прыгнула.
 */
export function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;

    if (!element) return;

    setWidth(Math.floor(element.getBoundingClientRect().width));

    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(([entry]) => {
      const box = entry?.contentBoxSize?.[0];
      const next = box ? box.inlineSize : (entry?.contentRect.width ?? 0);

      // Округление вниз: дробная ширина при масштабе экрана иначе дёргает пересчёт на полпикселя
      setWidth(Math.floor(next));
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, [ref]);

  return width;
}
