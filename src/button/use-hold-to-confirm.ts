import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

/** Сколько длится вспышка «подтверждено» после удержания — под длину --anim-pop */
const CONFIRMED_FLASH_MS = 600;

interface HoldHandlers {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onPointerCancel: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onKeyUp: (event: KeyboardEvent<HTMLElement>) => void;
}

export interface HoldState {
  holding: boolean;
  confirmed: boolean;
  handlers: HoldHandlers | null;
}

/**
 * Подтверждение удержанием: `onConfirm` — только если держали `duration` мс без отрыва. Мышь и палец —
 * через pointer-события, клавиатура — Space / Enter (автоповтор keydown игнорируется). Отпустили раньше —
 * отмена. `duration` null — удержание выключено, обработчиков нет.
 */
export function useHoldToConfirm(
  duration: number | null,
  onConfirm: (() => void) | undefined,
  disabled: boolean,
): HoldState {
  const [holding, setHolding] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flash = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Размонтирование посреди удержания не должно вызвать onConfirm у ушедшего экрана
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (flash.current) clearTimeout(flash.current);
    },
    [],
  );

  if (duration === null) {
    return { holding: false, confirmed: false, handlers: null };
  }

  const start = () => {
    if (disabled || timer.current) return;

    setHolding(true);
    setConfirmed(false);

    timer.current = setTimeout(() => {
      timer.current = null;
      setHolding(false);
      setConfirmed(true);
      onConfirm?.();

      flash.current = setTimeout(() => setConfirmed(false), CONFIRMED_FLASH_MS);
    }, duration);
  };

  const cancel = () => {
    if (!timer.current) return;

    clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  };

  const isHoldKey = (event: KeyboardEvent<HTMLElement>) =>
    event.key === ' ' || event.key === 'Enter';

  return {
    holding,
    confirmed,
    handlers: {
      onPointerDown: (event) => {
        if (event.button === 0) start();
      },
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      onKeyDown: (event) => {
        if (!isHoldKey(event) || event.repeat) return;

        // Enter у кнопки кликает сразу на keydown — удержание его заменяет
        event.preventDefault();
        start();
      },
      onKeyUp: (event) => {
        if (isHoldKey(event)) cancel();
      },
    },
  };
}
