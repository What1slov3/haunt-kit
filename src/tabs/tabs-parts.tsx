import { useContext, useId, useRef, useState, type ComponentPropsWithRef } from 'react';

import { Tabs as RadixTabs } from 'radix-ui';

import { cx } from '../lib/cx';
import { useSharedIndicator } from '../lib/use-shared-indicator';

import { TabsContext, type TabsContextValue } from './tabs-context';
import styles from './tabs.module.css';

export type TabsRootProps = ComponentPropsWithRef<typeof RadixTabs.Root> & {
  variant?: TabsContextValue['variant'];
};

/**
 * Значение дублируется в состоянии: Radix отдаёт его триггеру только через data-state, а
 * плавающему индикатору надо знать, активен ли он, до рендера. Root всегда контролируемый
 * (значение по умолчанию — '' = ни одной активной), чтобы Radix не переключался между режимами.
 */
export function TabsRoot({
  value,
  defaultValue,
  onValueChange,
  variant = 'line',
  className,
  ...rest
}: TabsRootProps) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');
  const layoutId = useId();
  const currentValue = value ?? internalValue;

  const handleValueChange = (next: string) => {
    setInternalValue(next);
    onValueChange?.(next);
  };

  return (
    <TabsContext.Provider value={{ value: currentValue, layoutId, variant }}>
      <RadixTabs.Root
        value={currentValue}
        onValueChange={handleValueChange}
        className={cx(variant === 'card' && styles.rootCard, className)}
        {...rest}
      />
    </TabsContext.Provider>
  );
}

export type TabsListProps = ComponentPropsWithRef<typeof RadixTabs.List> & {
  /** Растянуть вкладки на всю ширину */
  fullWidth?: boolean;
};

export function TabsList({ fullWidth, className, ...rest }: TabsListProps) {
  const context = useContext(TabsContext);

  return (
    <RadixTabs.List
      className={cx(
        styles.list,
        context && styles[`list-${context.variant}`],
        fullWidth && styles.fullWidth,
        className,
      )}
      {...rest}
    />
  );
}

/** Индикатор активной вкладки: монтируется у активной и переезжает от прежней (FLIP, без Motion) */
function TabsIndicator({ group }: { group: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useSharedIndicator(group, ref);

  return <span ref={ref} className={styles.indicator} aria-hidden />;
}

export type TabsTriggerProps = ComponentPropsWithRef<typeof RadixTabs.Trigger>;

export function TabsTrigger({ value, className, children, ...rest }: TabsTriggerProps) {
  const context = useContext(TabsContext);

  if (!context) {
    throw new Error('Tabs.Trigger должен быть внутри Tabs.Root');
  }

  const active = context.value === value;

  return (
    <RadixTabs.Trigger
      value={value}
      className={cx(styles.trigger, styles[context.variant], className)}
      {...rest}
    >
      {active && <TabsIndicator group={context.layoutId} />}

      <span className={styles.label}>{children}</span>
    </RadixTabs.Trigger>
  );
}

export type TabsContentProps = ComponentPropsWithRef<typeof RadixTabs.Content>;

export function TabsContent({ className, ...rest }: TabsContentProps) {
  const context = useContext(TabsContext);

  return (
    <RadixTabs.Content
      className={cx(styles.content, context?.variant === 'card' && styles.contentCard, className)}
      {...rest}
    />
  );
}

// Имена как в объекте-фасаде: так их показывают React DevTools и «Show code» в Storybook
TabsRoot.displayName = 'Tabs.Root';
TabsList.displayName = 'Tabs.List';
TabsTrigger.displayName = 'Tabs.Trigger';
TabsContent.displayName = 'Tabs.Content';
