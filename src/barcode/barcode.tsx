import type { ComponentPropsWithRef } from 'react';

import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';

import styles from './barcode.module.css';
import { CODE128_QUIET_ZONE, code128Layout } from './code128';

export interface BarcodeProps extends ComponentPropsWithRef<'span'> {
  /** Печатный ASCII (Code 128 B); строка с другими символами не рисуется */
  value: string;
  /** Высота штрихов, px */
  height?: number;
  /** Ширина модуля, px: 1 — мелкий код в табличке, 2 — читаемый сканером */
  moduleWidth?: number;
  /** Строка под кодом, моно-капителью */
  showValue?: boolean;
  /** Тихая зона в модулях; меньше 10 сканер может не прочитать — для декоративного кода можно 0 */
  quietZone?: number;
  /** Светлая плашка под кодом: сканер читает тёмное на светлом в любой теме */
  plate?: boolean;
}

/** Штрихкод Code 128 B из строки: id пространства, номер билета, серийник в DataPlate */
export function Barcode({
  value,
  height = 40,
  moduleWidth = 2,
  showValue,
  quietZone = CODE128_QUIET_ZONE,
  plate,
  className,
  ...rest
}: BarcodeProps) {
  const strings = useUiStrings();
  const layout = code128Layout(value, quietZone);

  if (!layout) return null;

  return (
    <span
      role="img"
      aria-label={strings.barcode.label(value)}
      className={cx(styles.barcode, plate && styles.plate, className)}
      {...rest}
    >
      <svg
        viewBox={`0 0 ${layout.width} 1`}
        width={layout.width * moduleWidth}
        height={height}
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
        aria-hidden
      >
        {layout.bars.map((bar) => (
          <rect key={bar.x} x={bar.x} width={bar.width} height={1} />
        ))}
      </svg>

      {showValue && (
        <span className={styles.value} aria-hidden>
          {value}
        </span>
      )}
    </span>
  );
}
