import type { ComponentPropsWithRef } from 'react';

import { VisuallyHidden as RadixVisuallyHidden } from 'radix-ui';

export type VisuallyHiddenProps = ComponentPropsWithRef<typeof RadixVisuallyHidden.Root>;

/**
 * Невидимо, но читается скринридером (Radix VisuallyHidden): заголовок диалога без видимого заголовка,
 * живая область, подпись к иконке. `asChild` — спрятать свой элемент, не добавляя обёртку. Не для
 * «спрятать насовсем» — для этого `hidden`.
 */
export function VisuallyHidden(props: VisuallyHiddenProps) {
  return <RadixVisuallyHidden.Root {...props} />;
}
