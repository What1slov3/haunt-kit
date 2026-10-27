import type { ComponentPropsWithRef } from 'react';

import { Slider as RadixSlider } from 'radix-ui';

import { cx } from '../lib/cx';

import styles from './slider.module.css';

export interface SliderProps extends ComponentPropsWithRef<typeof RadixSlider.Root> {
  /** Подпись для скринридера у ползунка; при нескольких значениях — на каждый */
  label?: string | string[];
  /** Показывать текущее значение в подсказке над ползунком */
  showValue?: boolean;
  /** Форматирование значения в подсказке */
  formatValue?: (value: number) => string;
}

/** Ползунок громкости, чувствительности микрофона. Клавиатура: стрелки, Home/End, PageUp/Down */
export function Slider({
  label,
  showValue,
  formatValue = String,
  value,
  defaultValue,
  className,
  ...rest
}: SliderProps) {
  const values = value ?? defaultValue ?? [0];

  return (
    <RadixSlider.Root
      value={value}
      defaultValue={defaultValue}
      className={cx(styles.root, className)}
      {...rest}
    >
      <RadixSlider.Track className={styles.track}>
        <RadixSlider.Range className={styles.range} />
      </RadixSlider.Track>

      {values.map((current, index) => (
        <RadixSlider.Thumb
          key={index}
          className={styles.thumb}
          aria-label={Array.isArray(label) ? label[index] : label}
        >
          {showValue && <span className={styles.value}>{formatValue(current)}</span>}
        </RadixSlider.Thumb>
      ))}
    </RadixSlider.Root>
  );
}
