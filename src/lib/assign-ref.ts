import type { Ref } from 'react';

/**
 * Передать узел в ref снаружи — функцию или объект. Для компонентов, которым узел нужен самим и которые
 * пробрасывают `ref` дальше. Очистку, которую может вернуть ref-функция React 19, не возвращает: где она
 * нужна, ref пробрасывается напрямую.
 */
export function assignRef<T>(ref: Ref<T> | undefined, node: T | null): void {
  if (typeof ref === 'function') ref(node);
  else if (ref) ref.current = node;
}
