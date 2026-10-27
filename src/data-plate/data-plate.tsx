import type { ComponentPropsWithRef, ReactNode } from 'react';

import { Barcode } from '../barcode/barcode';
import { isCode128B } from '../barcode/code128';
import { cx } from '../lib/cx';

import styles from './data-plate.module.css';

export interface DataPlateItem {
  /** Ключ строки для React */
  id: string;
  label: ReactNode;
  value: ReactNode;
  /** Значение моно — числа, коды, время */
  mono?: boolean;
  tone?: 'default' | 'accent' | 'muted' | 'success' | 'warning' | 'danger';
}

export interface DataPlateProps extends Omit<ComponentPropsWithRef<'section'>, 'title'> {
  /** Заголовок таблички — моно-капителью */
  title?: ReactNode;
  /** Индекс в шапке: `A-07` */
  index?: ReactNode;
  items: readonly DataPlateItem[];
  /** Серийник в подвале; печатный ASCII — с мелким штрихкодом */
  serial?: string;
  /** Штрихкод серийника; по умолчанию — если серийник кодируется */
  barcode?: boolean;
}

/**
 * Табличка характеристик, как на упаковке или шильдике: ключ — значение, штрих-разделители, серийник
 * и мелкий штрихкод. Строки — `<dl>`: чтение с экрана получает пары «термин — значение».
 */
export function DataPlate({
  title,
  index,
  items,
  serial,
  barcode,
  className,
  ...rest
}: DataPlateProps) {
  const showBarcode = serial !== undefined && (barcode ?? isCode128B(serial));

  return (
    <section className={cx(styles.plate, className)} {...rest}>
      {(title || index) && (
        <header className={styles.header}>
          {index && <span className={styles.index}>{index}</span>}
          {title && <span className={styles.title}>{title}</span>}
        </header>
      )}

      <dl className={styles.list}>
        {items.map((item) => (
          <div key={item.id} className={styles.row}>
            <dt className={styles.label}>{item.label}</dt>

            <dd
              className={cx(styles.value, item.mono && styles.mono, styles[item.tone ?? 'default'])}
            >
              {item.value}
            </dd>
          </div>
        ))}
      </dl>

      {serial !== undefined && (
        <footer className={styles.footer}>
          <span className={styles.serial}>{serial}</span>
          {showBarcode && (
            <Barcode
              value={serial}
              height={16}
              moduleWidth={1}
              quietZone={0}
              className={styles.barcode}
            />
          )}
        </footer>
      )}
    </section>
  );
}
