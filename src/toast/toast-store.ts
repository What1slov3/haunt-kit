import { useSyncExternalStore, type ReactNode } from 'react';

/*
 * Очередь тостов вне React: `toast.show()` можно звать из сервисов и обработчиков, а <Toaster />
 * подписывается и рисует. Один экземпляр на приложение.
 */

export type ToastTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export interface ToastOptions {
  title: ReactNode;
  description?: ReactNode;
  tone?: ToastTone;
  /** Кнопка действия справа: «Отменить», «Открыть» */
  action?: { label: string; onClick: () => void };
  /** мс; 0 — пока не закроют */
  duration?: number;
}

export interface ToastItem extends ToastOptions {
  id: number;
  tone: ToastTone;
  duration: number;
}

const MAX_VISIBLE = 4;

let items: ToastItem[] = [];
let nextId = 1;

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export const toast = {
  show(options: ToastOptions): number {
    const id = nextId++;
    const item: ToastItem = { tone: 'neutral', duration: 5000, ...options, id };

    // Старые уходят первыми: новое важнее, чем то, что пользователь уже мог прочитать
    items = [...items.slice(-(MAX_VISIBLE - 1)), item];
    emit();

    return id;
  },

  success(title: ReactNode, options: Omit<ToastOptions, 'title' | 'tone'> = {}): number {
    return toast.show({ ...options, title, tone: 'success' });
  },

  error(title: ReactNode, options: Omit<ToastOptions, 'title' | 'tone'> = {}): number {
    return toast.show({ ...options, title, tone: 'danger', duration: options.duration ?? 8000 });
  },

  dismiss(id: number): void {
    items = items.filter((item) => item.id !== id);
    emit();
  },

  clear(): void {
    items = [];
    emit();
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return items;
}

export function useToasts(): ToastItem[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
