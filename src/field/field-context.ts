import { createContext, useContext } from 'react';

export interface FieldContextValue {
  /** id контрола — на него ссылается метка */
  id: string;
  /** id подсказки или ошибки — для aria-describedby */
  describedBy?: string;
  invalid: boolean;
}

export const FieldContext = createContext<FieldContextValue | null>(null);

interface FieldControlInput {
  id?: string;
  invalid?: boolean;
  'aria-describedby'?: string;
}

/**
 * Связь контрола с обёрткой <Field>: id, описание и признак ошибки берутся из контекста, если
 * не заданы явно. Вне Field ничего не меняет.
 */
export function useFieldControl(input: FieldControlInput) {
  const field = useContext(FieldContext);

  return {
    invalid: input.invalid ?? field?.invalid ?? false,
    props: {
      id: input.id ?? field?.id,
      'aria-describedby': input['aria-describedby'] ?? field?.describedBy,
    },
  };
}
