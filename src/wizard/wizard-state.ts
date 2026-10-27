/*
 * Чистая часть мастера: что значит ответ проверки шага и как помнить текущий шаг между открытиями
 * (закрыли диалог создания пространства на третьем шаге — вернулись туда же).
 */

/** Ответ проверки шага: true / ничего — можно дальше, false — нельзя, строка — нельзя, вот почему */
export type WizardValidation = boolean | string | null | undefined | void;

/** null — шаг пройден; строка — ошибка (пустая — показать общий текст) */
export function validationError(result: WizardValidation): string | null {
  if (typeof result === 'string') return result;

  return result === false ? '' : null;
}

/** Шаг в пределах мастера; дробное и мусор — к ближнему целому шагу */
export function clampStep(step: number, total: number): number {
  if (!Number.isFinite(step) || total <= 0) return 0;

  return Math.min(total - 1, Math.max(0, Math.round(step)));
}

/**
 * Сохранённый шаг. Хранилище может быть недоступно (приватный режим, запрет) или хранить чужое — тогда
 * мастер начинается с `fallback`.
 */
export function readSavedStep(
  storageKey: string | undefined,
  total: number,
  fallback: number,
): number {
  if (!storageKey) return clampStep(fallback, total);

  try {
    const saved = Number(localStorage.getItem(storageKey));

    return localStorage.getItem(storageKey) === null
      ? clampStep(fallback, total)
      : clampStep(saved, total);
  } catch {
    return clampStep(fallback, total);
  }
}

export function saveStep(storageKey: string | undefined, step: number | null): void {
  if (!storageKey) return;

  try {
    if (step === null) localStorage.removeItem(storageKey);
    else localStorage.setItem(storageKey, String(step));
  } catch {
    // Не сохранилось — мастер начнётся сначала, это не ошибка
  }
}

/** Куда можно перейти кликом по списку шагов: только назад — вперёд ведёт проверка «Далее» */
export function canJumpTo(target: number, current: number): boolean {
  return target >= 0 && target < current;
}
