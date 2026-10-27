import { useEffect } from 'react';

/** Тянут ли файлы: текст и ссылки браузер в окне не открывает, их трогать незачем */
export function isFileDrag(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files');
}

/**
 * Файл, брошенный мимо зоны, браузер открывает вместо приложения — чат пропадает с экрана. Хук гасит
 * dragover и drop на окне, пока `enabled`, и только для файлов. Зоны не ломает: зона сама гасит событие и
 * ставит `dropEffect = 'copy'`, а окно меняет курсор на «нельзя» лишь там, где событие никто не принял.
 * Включать на экране, где есть FileDropzone (композер, настройки), — не глобально.
 */
export function usePreventWindowDrop(enabled = true): void {
  useEffect(() => {
    if (!enabled) return;

    const onDragOver = (event: DragEvent) => {
      if (!isFileDrag(event)) return;

      if (!event.defaultPrevented && event.dataTransfer) event.dataTransfer.dropEffect = 'none';

      event.preventDefault();
    };

    const onDrop = (event: DragEvent) => {
      if (isFileDrag(event)) event.preventDefault();
    };

    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);

    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [enabled]);
}
