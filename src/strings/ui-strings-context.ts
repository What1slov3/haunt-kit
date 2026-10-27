import { createContext, useContext } from 'react';

import { ruStrings } from './ru';
import type { UiStrings } from './ui-strings-types';

export interface UiStringsValue {
  locale: string;
  strings: UiStrings;
}

/*
 * Без провайдера — русский: так кит вёл себя до словаря, и истории с тестами, которые ищут русские
 * подписи, не зависят от обёртки.
 */
export const UiStringsContext = createContext<UiStringsValue>({ locale: 'ru', strings: ruStrings });

/** Строки кита ближайшего UiStringsProvider; без провайдера — русские */
export function useUiStrings(): UiStrings {
  return useContext(UiStringsContext).strings;
}

/**
 * Локаль Intl ближайшего UiStringsProvider; без провайдера — `ru`. Явная локаль компонента (проп `locale`)
 * побеждает провайдер: `const locale = useUiLocale(props.locale)`
 */
export function useUiLocale(explicit?: string): string {
  const { locale } = useContext(UiStringsContext);

  return explicit ?? locale;
}
