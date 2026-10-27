/**
 * Копирует текст в буфер обмена и сообщает, получилось ли; не бросает. Сначала Clipboard API, при
 * отказе (нет фокуса у документа, небезопасный origin, запрет WebView) — старый путь через
 * выделенный textarea и `execCommand('copy')`.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);

      return true;
    }
  } catch {
    // Отказ Clipboard API — пробуем старый путь ниже
  }

  return legacyCopy(text);
}

function legacyCopy(text: string): boolean {
  if (typeof document === 'undefined') return false;

  const previousFocus = document.activeElement as HTMLElement | null;
  const textarea = document.createElement('textarea');

  textarea.value = text;
  textarea.setAttribute('readonly', '');
  // Вне экрана и без прокрутки: выделение не должно двигать страницу
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();

  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    textarea.remove();
    previousFocus?.focus?.();
  }
}
