import { useEffect, useRef, useState, type ReactNode } from 'react';

import { Badge } from '../badge/badge';
import { Barcode } from '../barcode/barcode';
import { Button } from '../button/button';
import { ChamferPanel } from '../chamfer-panel/chamfer-panel';
import { Checkbox } from '../checkbox/checkbox';
import { CoordinateGrid } from '../coordinate-grid/coordinate-grid';
import { CornerFrame } from '../corner-frame/corner-frame';
import { DataPlate } from '../data-plate/data-plate';
import { serialFromSeed } from '../data-plate/serial';
import { Divider } from '../divider/divider';
import { Emblem } from '../emblem/emblem';
import { HazardStripe } from '../hazard-stripe/hazard-stripe';
import { Heading } from '../heading/heading';
import { IndexLabel } from '../index-label/index-label';
import { Input } from '../input/input';
import { Kbd } from '../kbd/kbd';
import { cx } from '../lib/cx';
import { Progress } from '../progress/progress';
import { QrCode } from '../qr-code/qr-code';
import { RegistrationMarks } from '../registration-marks/registration-marks';
import {
  signalAccents,
  signalFontCyrillic,
  signalFontLabels,
  signalFonts,
  type SignalFont,
} from '../signal-scope/signal-options';
import { SignalScope } from '../signal-scope/signal-scope';
import { Stamp } from '../stamp/stamp';
import { Switch } from '../switch/switch';
import { Tabs } from '../tabs/tabs';
import { Text } from '../text/text';
import { ThemeScope } from '../theme/theme-scope';
import { Ticker } from '../ticker/ticker';

import styles from './signal-blocks.module.css';
import { useRootVersion } from './use-live-tokens';

/*
 * Класс Storybook: проза документации (preview.css) не трогает то, что внутри. Без него заголовки блоков
 * получили бы шрифт и кегль статьи, и лист сравнения шрифтов показывал бы один Inter.
 */
const UNSTYLED = 'sb-unstyled';

/* --- Палитра с контрастом, посчитанным на странице --------------------------------------- */

/**
 * Цвет токена поверх фона — через canvas: браузер сам разбирает rgba, color-mix и oklab и смешивает
 * прозрачность с подложкой, остаётся прочитать пиксель.
 */
function composite(foreground: string, background: string): [number, number, number] {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });

  canvas.width = 1;
  canvas.height = 1;

  if (!context) return [0, 0, 0];

  context.fillStyle = background;
  context.fillRect(0, 0, 1, 1);
  context.fillStyle = foreground;
  context.fillRect(0, 0, 1, 1);

  const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data;

  return [r, g, b];
}

function luminance([r, g, b]: [number, number, number]): number {
  const channel = (value: number) => {
    const c = value / 255;

    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Контраст WCAG 2.x */
function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];

  return (high + 0.05) / (low + 0.05);
}

interface PaletteToken {
  token: string;
  /** Заливка, а не текст: контраст показан, но AA к ней не относится */
  fill?: boolean;
  /** Подложка для контраста; по умолчанию --background */
  on?: string;
  hint: string;
}

const paletteTokens: PaletteToken[] = [
  { token: '--text', hint: 'текст' },
  { token: '--text-muted', hint: 'вторичный' },
  { token: '--text-subtle', hint: 'подписи' },
  { token: '--accent', hint: 'акцент, заливка', fill: true },
  { token: '--accent-text', hint: 'текст из акцента' },
  { token: '--accent-contrast', on: '--accent', hint: 'чернила на акценте' },
  { token: '--success', hint: 'успех' },
  { token: '--warning', hint: 'сигнальный' },
  { token: '--danger', hint: 'опасность' },
  { token: '--info', hint: 'инфо' },
];

function PaletteColumn({ title }: { title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const version = useRootVersion();
  const [ratios, setRatios] = useState<Record<string, number>>({});

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    const style = getComputedStyle(element);
    const read = (name: string) => style.getPropertyValue(name).trim();
    const next: Record<string, number> = {};

    for (const { token, on = '--background' } of paletteTokens) {
      const base = composite(read(on), read('--background'));
      const color = composite(read(token), `rgb(${base.join(',')})`);

      next[token] = contrast(color, base);
    }

    setRatios(next);
  }, [version]);

  return (
    <div ref={ref} className={styles.palette}>
      <span className={styles.paletteTitle}>{title}</span>

      {paletteTokens.map(({ token, on, hint, fill }) => {
        const ratio = ratios[token];

        return (
          <div key={token} className={styles.paletteRow}>
            <span
              className={styles.paletteSwatch}
              style={{ background: on ? `var(${on})` : `var(${token})`, color: `var(${token})` }}
            >
              {on ? 'Aa' : ''}
            </span>

            <span className={styles.paletteName}>{token}</span>
            <span className={styles.paletteHint}>{hint}</span>

            <span
              className={styles.paletteRatio}
              data-fill={fill || undefined}
              data-low={!fill && ratio !== undefined && ratio < 4.5}
            >
              {ratio === undefined ? '…' : ratio.toFixed(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Палитра «сигнала» в тёмной теме и на бумаге; контраст с фоном считается здесь же */
export function SignalPalette() {
  return (
    <div className={cx(UNSTYLED, styles.twoColumns)}>
      <ThemeScope theme="dark">
        <SignalScope className={styles.sheet}>
          <PaletteColumn title="тёмная · #0b0b0a" />
        </SignalScope>
      </ThemeScope>

      <ThemeScope theme="light">
        <SignalScope className={styles.sheet}>
          <PaletteColumn title="бумага · #ecebe4" />
        </SignalScope>
      </ThemeScope>
    </div>
  );
}

/** Четыре акцента стиля рядом: заливка с чернилами и текст из акцента */
export function SignalAccents() {
  return (
    <div className={cx(UNSTYLED, styles.accentGrid)}>
      {(['dark', 'light'] as const).map((theme) =>
        signalAccents.map((accent) => (
          <ThemeScope key={`${theme}-${accent}`} theme={theme}>
            <SignalScope accent={accent} className={styles.accentCell}>
              <Button variant="accent" size="sm">
                {accent}
              </Button>

              <Text mono size="sm" style={{ color: 'var(--accent-text)' }}>
                текст · 0042
              </Text>
            </SignalScope>
          </ThemeScope>
        )),
      )}
    </div>
  );
}

/* --- Лист сравнения шрифтов ------------------------------------------------------------- */

function FontSample({ font, index }: { font: SignalFont; index: number }) {
  const cyrillic = signalFontCyrillic[font];

  return (
    <SignalScope font={font} className={styles.fontCell}>
      <IndexLabel
        index={index}
        total={signalFonts.length}
        label={signalFontLabels[font]}
        size="sm"
      />

      <span className={styles.fontNote} data-cyrillic={cyrillic || undefined}>
        {cyrillic ? 'с кириллицей' : 'без кириллицы (заголовки на русском — Inter)'}
      </span>

      <Heading level={1} as="div" size="4xl">
        Night raid 07
      </Heading>

      <Heading level={1} as="div" size="4xl">
        Ночной рейд 07
      </Heading>

      <Heading level={3} as="div">
        Season 03 / Сезон 03 / Штаб
      </Heading>

      <div className={styles.fontRow}>
        <IndexLabel index={4} prefix="SEC" size="lg" rule={false} tone="accent" />
        <IndexLabel index={4} prefix="СЕК" size="lg" rule={false} tone="accent" />
      </div>

      <span className={styles.fontDigits}>0123456789 · 21:00 · 12/16</span>

      <div className={styles.fontRow}>
        <Stamp size="sm" rotate={-6}>
          Approved
        </Stamp>
        <Stamp size="sm" rotate={-4} tone="accent">
          Одобрено
        </Stamp>
      </div>

      <Text tone="muted" size="sm">
        Основной текст остаётся гротеском Inter: дисплейный — только заголовки, индексы и штампы.
      </Text>
    </SignalScope>
  );
}

/**
 * Одна композиция всеми вариантами шрифта — латиницей и кириллицей. Поправки кегля и трекинга у каждого
 * свои (signal.css), чтобы прописные были одной высоты и сравнение было честным.
 */
export function SignalFontSheet({ theme = 'dark' }: { theme?: 'dark' | 'light' }) {
  return (
    <ThemeScope theme={theme} className={cx(UNSTYLED, styles.fontSheet)}>
      {signalFonts.map((font, index) => (
        <FontSample key={font} font={font} index={index + 1} />
      ))}
    </ThemeScope>
  );
}

/* --- Формы и компоненты ------------------------------------------------------------------ */

function Cell({
  title,
  stretch,
  children,
}: {
  title: string;
  stretch?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cx(styles.cell, stretch && styles.stretch)}>
      <span className={styles.cellTitle}>{title}</span>
      {children}
    </div>
  );
}

/** Срезы, засечки, разметка, штриховка — элементы формы стиля */
export function SignalShapes() {
  return (
    <SignalScope className={cx(UNSTYLED, styles.sheet)}>
      <div className={styles.cells}>
        <Cell title="ChamferPanel" stretch>
          <ChamferPanel corners={['tr', 'bl']} className={styles.panelStack}>
            <Text weight="semibold">Срез — clip-path</Text>
            <Text size="sm" tone="muted">
              рамка — кольцо evenodd
            </Text>
          </ChamferPanel>
        </Cell>

        <Cell title="ChamferPanel solid · hatch" stretch>
          <ChamferPanel tone="solid" corners={['tl']} size="sm">
            <Text weight="semibold">LIVE · 0042</Text>
          </ChamferPanel>

          <ChamferPanel tone="hatch" corners={['br']} size="sm">
            <Text size="sm">пустая зона</Text>
          </ChamferPanel>
        </Cell>

        <Cell title="CornerFrame">
          <CornerFrame tone="accent" inline active>
            <Emblem seed="night-raid" size={56} />
          </CornerFrame>
        </Cell>

        <Cell title="RegistrationMarks">
          <RegistrationMarks>
            <Text weight="semibold">Лист 01</Text>
          </RegistrationMarks>
        </Cell>

        <Cell title="HazardStripe" stretch>
          <HazardStripe size="sm" />
          <HazardStripe tone="danger">опасная зона</HazardStripe>
          <HazardStripe tone="accent" size="lg" direction="left" />
        </Cell>

        <Cell title="CoordinateGrid" stretch>
          <CoordinateGrid cell={24} style={{ height: 150 }} crosshair />
        </Cell>
      </div>
    </SignalScope>
  );
}

function KitSample() {
  return (
    <div className={styles.kit}>
      <IndexLabel index={2} total={7} label="настройки" size="sm" />
      <Heading level={3} as="div">
        Ночной рейд · Season 03
      </Heading>

      <div className={styles.fontRow}>
        <Button variant="accent">Пойду</Button>
        <Button variant="secondary">Позже</Button>
        <Badge tone="accent">live</Badge>
        <Badge tone="warning">бета</Badge>
      </div>

      <Input placeholder="позывной" />

      <Tabs.Root defaultValue="all">
        <Tabs.List>
          <Tabs.Trigger value="all">Все</Tabs.Trigger>
          <Tabs.Trigger value="raid">Рейды</Tabs.Trigger>
          <Tabs.Trigger value="store">Магазин</Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>

      <div className={styles.fontRow}>
        <Switch defaultChecked aria-label="Уведомления" />
        <Checkbox defaultChecked label="Напомнить" />
        <Kbd>Ctrl</Kbd>
        <Kbd>K</Kbd>
      </div>

      <Progress value={64} aria-label="Заполнено" />
      <Divider label="сегодня" />
    </div>
  );
}

/** Компоненты кита как есть: слева основа, справа — те же компоненты внутри SignalScope */
export function SignalComparison() {
  return (
    <div className={cx(UNSTYLED, styles.twoColumns)}>
      <div className={styles.sheet}>
        <span className={styles.cellTitle}>основной</span>
        <KitSample />
      </div>

      <SignalScope className={styles.sheet}>
        <span className={styles.cellTitle}>сигнал</span>
        <KitSample />
      </SignalScope>
    </div>
  );
}

/** Композиция стиля: билет события — табличка, QR, штрихкод, бегущая строка, штамп */
export function SignalTicket({ theme = 'dark' }: { theme?: 'dark' | 'light' }) {
  return (
    <ThemeScope theme={theme} className={UNSTYLED}>
      <SignalScope className={styles.sheet}>
        <div className={styles.ticket}>
          <ChamferPanel corners={['tr', 'bl']} size="lg" className={styles.ticketMain}>
            <IndexLabel index={7} prefix="EV" total={12} label="событие" size="sm" />
            <Heading level={2} as="div">
              Night raid
            </Heading>
            <Text tone="muted">Сбор в 21:00 у южного шлюза. Голос — «штаб».</Text>

            <div className={styles.fontRow}>
              <Button variant="accent">Пойду</Button>
              <Stamp size="sm" tone="accent">
                Новое
              </Stamp>
            </div>
          </ChamferPanel>

          <DataPlate
            index="A-07"
            title="Характеристики"
            items={[
              { id: 'date', label: 'Дата', value: '07.11', mono: true },
              { id: 'slots', label: 'Места', value: '12 / 16', mono: true, tone: 'accent' },
              { id: 'risk', label: 'Риск', value: 'высокий', tone: 'warning' },
            ]}
            serial={serialFromSeed('night-raid', { prefix: 'HNT' })}
          />

          <div className={styles.ticketSide}>
            <CornerFrame inline tone="accent">
              <QrCode value="https://haunt.chat/i/7Kq2" size={112} />
            </CornerFrame>

            <Barcode value="HNT-0042" height={28} moduleWidth={1} showValue />
          </div>
        </div>

        <Ticker
          tone="accent"
          separator="◆"
          label="Новости события"
          items={['Сбор 21:00', '12 из 16 мест', 'Голос «штаб» открыт', 'Season 03']}
        />
      </SignalScope>
    </ThemeScope>
  );
}
