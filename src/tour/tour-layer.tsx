import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

import { Popover as RadixPopover, Portal, VisuallyHidden } from 'radix-ui';
import { FocusScope, Presence } from 'radix-ui/internal';

import { Button } from '../button/button';
import { PopoverContent } from '../popover/popover-parts';
import { Spacer } from '../spacer/spacer';
import { useUiStrings } from '../strings/ui-strings-context';
import { usePortalContainer } from '../theme/portal-container';

import type { TourProps } from './tour';
import {
  centerAnchor,
  clampStep,
  isRectVisible,
  nextMove,
  padRect,
  previousIndex,
  progressLabel,
  resolveTarget,
  sameRect,
  spotlightPath,
  type Rect,
  type Viewport,
} from './tour-steps';
import styles from './tour.module.css';

// Та же кривая и длительность, что --ease-out / --duration-slow в tokens.css: WAAPI не читает CSS-переменные
const EASING = 'cubic-bezier(0.2, 0.7, 0.2, 1)';
const DURATION_MS = 260;
const RADIUS = 8;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const readViewport = (): Viewport => ({
  width: document.documentElement.clientWidth,
  height: document.documentElement.clientHeight,
});

interface Geometry {
  hole: Rect | null;
  viewport: Viewport;
}

/** Якорь карточки для Radix Popper: живой прямоугольник окна; contextElement — чтобы floating-ui следил за прокруткой предков цели */
interface VirtualAnchor {
  getBoundingClientRect: () => DOMRect;
  contextElement?: Element;
}

/**
 * Слой тура: затемнение с окном и карточка шага. Грузится лениво из `tour.tsx` — онбординг показывают
 * раз, и Popper, FocusScope и геометрии нечего делать в стартовом чанке.
 */
export default function TourLayer({
  steps,
  open,
  onOpenChange,
  step,
  defaultStep = 0,
  onStepChange,
  onFinish,
  onSkip,
  targetClickable = false,
  padding = 6,
  labels,
}: TourProps) {
  const container = usePortalContainer();
  const [innerStep, setInnerStep] = useState(defaultStep);
  const [wasOpen, setWasOpen] = useState(open);

  // Слой живёт и после закрытия (анимация ухода); новый показ тура — снова с начала
  if (open !== wasOpen) {
    setWasOpen(open);

    if (open) setInnerStep(defaultStep);
  }

  const index = clampStep(step ?? innerStep, steps.length);
  const current = steps[index];
  const stepPadding = current?.padding ?? padding;
  const clickable = current?.clickable ?? targetClickable;
  const [geometry, setGeometry] = useState<Geometry>(() => ({
    hole: null,
    viewport: { width: 0, height: 0 },
  }));
  const overlayRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const target = useRef<Element | null>(null);
  const anchor = useRef<VirtualAnchor | null>(null);
  // Путь до смены шага — от него окно переезжает к новой цели; null — без анимации (прокрутка, resize)
  const animateFrom = useRef<string | null>(null);
  const path = useRef<string>('');
  const titleId = useId();
  const contentId = useId();
  const strings = useUiStrings();
  const text = { ...strings.tour, ...labels };

  const goTo = (next: number) => {
    if (step === undefined) setInnerStep(next);

    onStepChange?.(next);
  };

  const close = () => onOpenChange(false);

  const finish = () => {
    onFinish?.();
    close();
  };

  const skip = () => {
    onSkip?.(index);
    close();
  };

  const next = () => {
    const move = nextMove(index, steps.length);

    if (move.type === 'finish') finish();
    else goTo(move.index);
  };

  // Шаг сменился: найти цель, прокрутить к ней, завести якорь карточки и слежение за геометрией
  useEffect(() => {
    if (!open || !current) return;

    const element = resolveTarget(current.target);
    const viewport = readViewport();

    target.current = element;

    if (
      element &&
      !isRectVisible(padRect(element.getBoundingClientRect(), stepPadding), viewport, 16)
    ) {
      // Мгновенно: окно само плавно переезжает к цели, а smooth-прокрутка сдвигала бы её под ним
      element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
    }

    anchor.current = {
      getBoundingClientRect: () => {
        const rect = target.current?.isConnected
          ? padRect(target.current.getBoundingClientRect(), stepPadding)
          : centerAnchor(readViewport());

        return DOMRect.fromRect(rect);
      },
      contextElement: element ?? undefined,
    };

    animateFrom.current = path.current || null;

    let frame = 0;

    const measure = () => {
      frame = 0;

      const rect = target.current?.isConnected ? target.current.getBoundingClientRect() : null;
      const hole = rect ? padRect(rect, stepPadding) : null;
      const nextViewport = readViewport();

      setGeometry((prev) =>
        sameRect(prev.hole, hole) &&
        prev.viewport.width === nextViewport.width &&
        prev.viewport.height === nextViewport.height
          ? prev
          : { hole, viewport: nextViewport },
      );
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();

    const observer = new ResizeObserver(schedule);

    if (element) observer.observe(element);

    // Прокрутка любого предка цели (capture) и смена размера окна двигают окно вслед за целью
    window.addEventListener('scroll', schedule, { capture: true, passive: true });
    window.addEventListener('resize', schedule);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);
    };
  }, [open, current, stepPadding]);

  const clipPath = `path(evenodd, "${spotlightPath(geometry.hole, geometry.viewport, RADIUS)}")`;

  // Окно переезжает между целями: clip-path через WAAPI. Исключение из «только transform / opacity»:
  // форма окна — не прямоугольник с transform (scale исказил бы скругление), а перерисовка одного
  // слоя на 260 мс раз в шаг; зато картинка и область кликов — один и тот же путь и не расходятся
  useLayoutEffect(() => {
    const from = animateFrom.current;
    const overlay = overlayRef.current;

    path.current = clipPath;

    if (!from || from === clipPath || !overlay || geometry.viewport.width === 0) return;

    animateFrom.current = null;

    if (prefersReducedMotion() || typeof overlay.animate !== 'function') return;

    overlay.animate([{ clipPath: from }, { clipPath }], { duration: DURATION_MS, easing: EASING });
  }, [clipPath, geometry.viewport.width]);

  if (!current) return null;

  return (
    <RadixPopover.Root open={open} onOpenChange={(value) => !value && skip()}>
      <Presence.Root present={open}>
        <Portal.Root container={container} asChild>
          <div
            className={styles.layer}
            data-state={open ? 'open' : 'closed'}
            data-clickable={clickable || undefined}
            aria-hidden
          >
            {/* Без кликабельной цели окно тоже ловит клики: прозрачный щит под затемнением */}
            {!clickable && <div className={styles.shield} />}

            <div ref={overlayRef} className={styles.overlay} style={{ clipPath }} />
          </div>
        </Portal.Root>
      </Presence.Root>

      <RadixPopover.Anchor virtualRef={anchor} />

      <PopoverContent
        side={current.side ?? 'bottom'}
        align={current.align ?? 'center'}
        sideOffset={12}
        collisionPadding={12}
        className={styles.card}
        aria-labelledby={titleId}
        aria-describedby={current.content ? contentId : undefined}
        // Фокус ставит ловушка внутри — на «Далее», а не на первую кнопку («Пропустить»)
        onOpenAutoFocus={(event) => event.preventDefault()}
        // Клик мимо карточки (по затемнению или по цели) тур не закрывает: закрывают кнопки и Esc
        onInteractOutside={(event) => event.preventDefault()}
      >
        <FocusScope.Root
          asChild
          loop
          trapped
          onMountAutoFocus={(event) => {
            event.preventDefault();
            nextRef.current?.focus();
          }}
        >
          <div className={styles.body}>
            {/* Ключ — шаг: содержимое нового шага проявляется заново, кнопки остаются на месте */}
            <div key={current.id ?? index} className={styles.step}>
              <div className={styles.header}>
                <span className={styles.progress} aria-hidden>
                  {progressLabel(index, steps.length)}
                </span>

                <VisuallyHidden.Root>{text.step(index + 1, steps.length)}</VisuallyHidden.Root>

                <h2 id={titleId} className={styles.title}>
                  {current.title}
                </h2>
              </div>

              {current.content && (
                <div id={contentId} className={styles.content}>
                  {current.content}
                </div>
              )}
            </div>

            <div className={styles.footer}>
              <Button size="sm" variant="ghost" onClick={skip}>
                {text.skip}
              </Button>

              <Spacer />

              {index > 0 && (
                <Button size="sm" variant="secondary" onClick={() => goTo(previousIndex(index))}>
                  {text.back}
                </Button>
              )}

              <Button ref={nextRef} size="sm" variant="primary" onClick={next}>
                {index === steps.length - 1 ? text.finish : text.next}
              </Button>
            </div>
          </div>
        </FocusScope.Root>
      </PopoverContent>
    </RadixPopover.Root>
  );
}
