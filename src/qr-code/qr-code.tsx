import { useEffect, useMemo, useState, type ComponentPropsWithRef } from 'react';

import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';

import styles from './qr-code.module.css';
import type * as QrEncode from './qr-encode';
import type { QrCodeData } from './qr-encode';

type Encoder = typeof QrEncode;

/*
 * Генератор грузится лениво при первом коде на экране: QR редкий (приглашения), а Reed–Solomon и выбор
 * маски в стартовый чанк не нужны. Загруженный модуль запоминается — следующие коды считаются сразу.
 */
let encoder: Encoder | null = null;
let loading: Promise<Encoder> | null = null;

function loadEncoder(): Promise<Encoder> {
  loading ??= import('./qr-encode').then((module) => (encoder = module));

  return loading;
}

export interface QrCodeProps extends ComponentPropsWithRef<'span'> {
  /** Строка (UTF-8), до 213 байт — версия 10, уровень коррекции M; длиннее — код не рисуется */
  value: string;
  /** Сторона вместе с тихой зоной, px */
  size?: number;
  /** Тихая зона в модулях; стандарт требует 4 */
  quietZone?: number;
  /** Светлая плашка под кодом (по умолчанию): сканер читает тёмное на светлом в любой теме */
  plate?: boolean;
  /** Подпись для чтения с экрана; по умолчанию — из словаря: «QR-код: <value>» */
  label?: string;
}

function modulesPath(qr: QrCodeData, quietZone: number): string {
  let d = '';

  qr.modules.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) d += `M${x + quietZone} ${y + quietZone}h1v1h-1z`;
    }),
  );

  return d;
}

/** QR-код из строки без зависимостей: режим byte, коррекция M, версии 1–10 */
export function QrCode({
  value,
  size = 160,
  quietZone = 4,
  plate = true,
  label,
  className,
  style,
  ...rest
}: QrCodeProps) {
  const strings = useUiStrings();
  const [loaded, setLoaded] = useState(Boolean(encoder));

  useEffect(() => {
    if (encoder) return;

    let alive = true;

    void loadEncoder().then(() => alive && setLoaded(true));

    return () => {
      alive = false;
    };
  }, []);

  // Восемь масок со штрафом — не на каждый рендер, а при смене строки
  const qr = useMemo(
    () => (loaded && encoder ? encoder.encodeQr(value) : undefined),
    [loaded, value],
  );

  if (qr === null) return null;

  const side = qr ? qr.size + quietZone * 2 : 0;

  return (
    <span
      role="img"
      aria-label={label ?? strings.qrCode.label(value)}
      className={cx(styles.qr, plate && styles.plate, className)}
      style={{ width: size, height: size, ...style }}
      data-ready={qr ? true : undefined}
      data-version={qr?.version}
      {...rest}
    >
      {qr && (
        <svg
          viewBox={`0 0 ${side} ${side}`}
          width={size}
          height={size}
          shapeRendering="crispEdges"
          aria-hidden
        >
          <path d={modulesPath(qr, quietZone)} />
        </svg>
      )}
    </span>
  );
}
