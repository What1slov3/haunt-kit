import { lazy, Suspense, useState } from 'react';

import type { TourStep } from './tour-steps';

export interface TourLabels {
  back?: string;
  next?: string;
  /** «Далее» на последнем шаге */
  finish?: string;
  skip?: string;
}

export interface TourProps {
  /** Шаги данными: цель, заголовок, текст, сторона карточки */
  steps: readonly TourStep[];
  open: boolean;
  /** false — тур закрыт: «Готово», «Пропустить» или Esc */
  onOpenChange: (open: boolean) => void;
  /** Текущий шаг (с нуля) — управляемый режим */
  step?: number;
  defaultStep?: number;
  onStepChange?: (step: number) => void;
  /** «Готово» на последнем шаге */
  onFinish?: () => void;
  /** «Пропустить» или Esc — с номером шага, на котором ушли */
  onSkip?: (step: number) => void;
  /** Цель принимает клики сквозь окно; шаг может переопределить (`clickable`). По умолчанию нет */
  targetClickable?: boolean;
  /** Поле окна вокруг цели, px */
  padding?: number;
  labels?: TourLabels;
}

// Popper, ловушка фокуса и геометрия окна нужны раз за жизнь — при первом показе тура
const TourLayer = lazy(() => import('./tour-layer'));

/**
 * Онбординг по шагам: затемнение экрана с окном вокруг цели и карточка шага рядом с ней. «Назад /
 * Далее / Пропустить», прогресс `2 / 5`, Esc — пропустить, фокус заперт в карточке и возвращается на
 * место после закрытия. Окно следит за прокруткой и размером, к цели за экраном прокручивает.
 */
export function Tour(props: TourProps) {
  const [needed, setNeeded] = useState(props.open);

  // Слой подгружается при первом открытии и дальше остаётся: у карточки и затемнения есть анимация ухода
  if (props.open && !needed) setNeeded(true);

  if (!needed) return null;

  return (
    <Suspense fallback={null}>
      <TourLayer {...props} />
    </Suspense>
  );
}
