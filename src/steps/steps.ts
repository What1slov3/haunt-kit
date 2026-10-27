import { StepsItem, StepsRoot } from './steps-parts';

/**
 * Шаги в духе Fumadocs: номер в круге и линия до следующего шага.
 * <Steps.Root><Steps.Item title="Создать пространство">…</Steps.Item></Steps.Root>
 */
export const Steps = {
  Root: StepsRoot,
  Item: StepsItem,
};

export type { StepsItemProps, StepsRootProps } from './steps-parts';
