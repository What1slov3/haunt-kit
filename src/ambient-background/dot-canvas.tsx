import { useEffect, useRef } from 'react';

import { ambient, type AmbientReaction } from './ambient-events';
import styles from './ambient-background.module.css';
import { DotField } from './dot-field';

interface DotCanvasProps {
  reaction: AmbientReaction;
}

const AREA_SELECTOR = '[data-ambient-area]';

function readColors(element: HTMLElement) {
  const style = getComputedStyle(element);
  const number = (name: string, fallback: number) => {
    const parsed = Number.parseFloat(style.getPropertyValue(name));

    return Number.isNaN(parsed) ? fallback : parsed;
  };

  return {
    dot: style.getPropertyValue('--ambient-dot-color').trim() || '#ffffff',
    dotAlpha: number('--ambient-dot-alpha', 0.08),
    particle: style.getPropertyValue('--accent').trim() || '#6e5ce6',
    particleAlpha: number('--ambient-particle-alpha', 0.6),
  };
}

/**
 * Точечная сетка на canvas. Слушает шину `ambient` (волны), курсор и активную область
 * (`data-ambient-area` на панели: фокус внутри неё или наведение). На скрытой вкладке и при
 * prefers-reduced-motion кадры не считаются.
 */
export function DotCanvas({ reaction }: DotCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fieldRef = useRef<DotField | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;

    if (!canvas || !parent) return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const field = new DotField(canvas, {
      reaction,
      reducedMotion: motionQuery.matches,
      readColors: () => readColors(parent),
    });

    fieldRef.current = field;

    // Координаты событий — во вьюпорте; у фона внутри рамки (fixed=false) надо вычесть её смещение
    const toLocal = (clientX: number, clientY: number) => {
      const rect = parent.getBoundingClientRect();

      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const toLocalRect = (rect: DOMRect) => {
      const origin = parent.getBoundingClientRect();

      return new DOMRect(rect.left - origin.left, rect.top - origin.top, rect.width, rect.height);
    };

    const resizeObserver = new ResizeObserver(([entry]) => {
      if (!entry) return;

      field.resize(entry.contentRect.width, entry.contentRect.height);
    });

    const onPointerMove = (event: PointerEvent) => {
      field.setPointer(toLocal(event.clientX, event.clientY));
    };

    const onPointerLeave = () => field.setPointer(null);

    // Обычный клик — тихая волна; сильную шлют сами компоненты через ambient.pulse
    const onPointerDown = (event: PointerEvent) => {
      const point = toLocal(event.clientX, event.clientY);

      field.pulse({ ...point, strength: 0.35 });
    };

    const areaOf = (target: EventTarget | null) =>
      target instanceof Element ? target.closest(AREA_SELECTOR) : null;

    const onFocusIn = (event: FocusEvent) => {
      const area = areaOf(event.target);

      field.setFocusRect(area ? toLocalRect(area.getBoundingClientRect()) : null);
    };

    const onPointerOver = (event: PointerEvent) => {
      const area = areaOf(event.target);

      if (area) field.setFocusRect(toLocalRect(area.getBoundingClientRect()));
      else if (!areaOf(document.activeElement)) field.setFocusRect(null);
    };

    const onVisibility = () => {
      if (document.hidden) field.stop();
      else field.start();
    };

    const onMotionChange = () => field.setOptions({ reducedMotion: motionQuery.matches });

    // Тема и акцент меняются атрибутами на <html>: перечитываем цвета, а не следим за каждым узлом
    const themeObserver = new MutationObserver(() => field.refreshColors());

    const unsubscribe = ambient.subscribe((pulse) => {
      field.pulse({ ...toLocal(pulse.x, pulse.y), strength: pulse.strength });
    });

    resizeObserver.observe(parent);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'style'],
    });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerover', onPointerOver, { passive: true });
    window.addEventListener('focusin', onFocusIn);
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
    document.addEventListener('visibilitychange', onVisibility);
    motionQuery.addEventListener('change', onMotionChange);
    field.start();

    return () => {
      unsubscribe();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerover', onPointerOver);
      window.removeEventListener('focusin', onFocusIn);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      motionQuery.removeEventListener('change', onMotionChange);
      field.destroy();
      fieldRef.current = null;
    };
    // Уровень реакции меняется отдельным эффектом, без пересоздания поля
    // eslint-disable-next-line react-hooks/exhaustive-deps -- см. выше
  }, []);

  useEffect(() => {
    fieldRef.current?.setOptions({ reaction });
  }, [reaction]);

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden />;
}
