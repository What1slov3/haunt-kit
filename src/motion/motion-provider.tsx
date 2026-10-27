import type { ReactNode } from 'react';

import { MotionConfig } from 'motion/react';

import { springs } from './presets';

export interface MotionProviderProps {
  children: ReactNode;
}

/**
 * Настройки Motion для экранов, которые им пользуются: пружина по умолчанию без перелёта и
 * `reducedMotion="user"` — Motion сам гасит transform-анимации по prefers-reduced-motion, как глобальное
 * правило global.css гасит CSS. Кит Motion не требует: провайдер ставит экран, а не корень приложения,
 * чтобы 135 kB библиотеки грузились только с ним.
 */
export function MotionProvider({ children }: MotionProviderProps) {
  return (
    <MotionConfig reducedMotion="user" transition={springs.gentle}>
      {children}
    </MotionConfig>
  );
}
