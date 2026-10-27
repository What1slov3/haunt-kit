import { useEffect, useState, type RefObject } from 'react';

export interface InViewOptions {
  /** Отступ зоны видимости, как rootMargin у IntersectionObserver: '0px 0px -10% 0px' — чуть раньше низа */
  margin?: string;
  /** Доля элемента в окне, 0…1 */
  amount?: number;
  /** Один раз: после первого появления наблюдатель снимается, значение остаётся true */
  once?: boolean;
  /** Не наблюдать (эффект выключен) */
  disabled?: boolean;
}

/**
 * Виден ли элемент в окне прокрутки. Без IntersectionObserver (старый WebView, jsdom) — сразу true:
 * появление по прокрутке не должно прятать содержимое там, где его не дождаться.
 */
export function useInView(
  ref: RefObject<Element | null>,
  { margin = '0px', amount = 0, once = true, disabled = false }: InViewOptions = {},
): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;

    if (disabled || !element) return;

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);

      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;

        if (entry.isIntersecting) {
          setInView(true);

          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin: margin, threshold: amount },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [ref, margin, amount, once, disabled]);

  return inView;
}
