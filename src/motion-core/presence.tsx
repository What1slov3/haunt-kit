import {
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
} from 'react';

import { Slot } from 'radix-ui';

import { cx } from '../lib/cx';

import styles from './presence.module.css';
import { exitDuration, hasExitAnimation } from './presence-timing';

export type PresenceAnimation = 'fade' | 'pop' | 'rise' | 'slide-right' | 'none';

export interface PresenceProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** Показан ли элемент. false — играет уход, затем размонтирует */
  present: boolean;
  children: ReactNode;
  /**
   * Встроенная пара появления и ухода на `--anim-*`. `none` — своя анимация в CSS ребёнка по
   * `[data-state='open' | 'closed']`
   */
  animation?: PresenceAnimation;
  /** Не оборачивать: `data-state`, класс и ref уходят единственному ребёнку */
  asChild?: boolean;
  /** Страховка: снять не позже чем через столько мс, даже если `animationend` не пришёл */
  timeout?: number;
  /** Уход доигран, элемент снят */
  onExitComplete?: () => void;
}

/** Запас к рассчитанной длительности: событие приходит в следующем кадре после конца анимации */
const SAFETY_MS = 80;

/**
 * Монтирование с анимацией ухода на CSS, без Motion: при `present = false` элемент получает
 * `data-state="closed"`, играет анимацию ухода и размонтируется по `animationend`. Если события нет
 * (анимации нет, keyframes не нашлись, вкладка в фоне) — по таймеру-страховке из вычисленной
 * длительности. Анимации — только через `var(--anim-*)`: локальное имя keyframes из CSS Modules не
 * нашлось бы (README кита). При reduced-motion глобальный стиль сокращает анимации — уход мгновенный.
 */
export function Presence({
  present,
  children,
  animation = 'fade',
  asChild = false,
  timeout,
  onExitComplete,
  className,
  ...rest
}: PresenceProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(present);
  const completeRef = useRef(onExitComplete);

  // Снова показан — монтируем сразу, в этом же рендере (синхронизация с пропом)
  if (present && !mounted) setMounted(true);

  useLayoutEffect(() => {
    completeRef.current = onExitComplete;
  });

  useLayoutEffect(() => {
    const element = elementRef.current;

    if (present || !mounted) return;

    let finished = false;

    const finish = () => {
      if (finished) return;

      finished = true;
      setMounted(false);
      completeRef.current?.();
    };

    if (!element) {
      finish();

      return;
    }

    const style = getComputedStyle(element);
    const running =
      typeof element.getAnimations === 'function' ? element.getAnimations().length > 0 : true;

    if (!running || !hasExitAnimation(style.animationName, style.animationDuration)) {
      finish();

      return;
    }

    const onEnd = (event: AnimationEvent) => {
      // Анимации детей всплывают сюда же — ждём только свою
      if (event.target === element) finish();
    };
    const timer = window.setTimeout(finish, timeout ?? exitDuration(style) + SAFETY_MS);

    element.addEventListener('animationend', onEnd);
    element.addEventListener('animationcancel', onEnd);

    return () => {
      window.clearTimeout(timer);
      element.removeEventListener('animationend', onEnd);
      element.removeEventListener('animationcancel', onEnd);
    };
  }, [present, mounted, timeout]);

  if (!mounted) return null;

  const Component = asChild ? Slot.Root : 'div';

  return (
    <Component
      ref={elementRef}
      data-state={present ? 'open' : 'closed'}
      className={cx(animation !== 'none' && styles[animation], className)}
      {...rest}
    >
      {children}
    </Component>
  );
}
