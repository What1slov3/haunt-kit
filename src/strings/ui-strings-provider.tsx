import { useContext, useMemo, type ReactNode } from 'react';

import { mergeUiStrings, stringsForLocale } from './merge-strings';
import { UiStringsContext } from './ui-strings-context';
import type { UiStringsOverride } from './ui-strings-types';

export interface UiStringsProviderProps {
  /**
   * Локаль Intl (`en`, `ru-RU`): по ней выбирается словарь, и её же берут даты и числа компонентов без
   * явного `locale`. Не задана — как у внешнего провайдера, вместе с его перезаписью
   */
  locale?: string;
  /**
   * Перезапись части строк поверх словаря языка. Объект лучше держать стабильным (константа модуля):
   * новый объект на каждый рендер перерисовывает всех потребителей
   */
  strings?: UiStringsOverride;
  children: ReactNode;
}

/**
 * Язык подписей кита: кнопки закрытия, пустые состояния, объявления для скринридера, локаль дат и чисел.
 * Это контекст React — всплывающее в порталах получает его так же, как остальное дерево.
 */
export function UiStringsProvider({ locale, strings, children }: UiStringsProviderProps) {
  const parent = useContext(UiStringsContext);

  const value = useMemo(
    () => ({
      locale: locale ?? parent.locale,
      strings: mergeUiStrings(
        locale === undefined ? parent.strings : stringsForLocale(locale),
        strings,
      ),
    }),
    [locale, strings, parent],
  );

  return <UiStringsContext.Provider value={value}>{children}</UiStringsContext.Provider>;
}
