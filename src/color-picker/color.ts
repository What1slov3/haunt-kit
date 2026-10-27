export type Rgb = readonly [number, number, number];

export type ContrastLevel = 'AAA' | 'AA' | 'AA-large' | 'fail';

/**
 * Hex из ввода человека: с решёткой и без, 3 или 6 знаков, любой регистр. Результат — `#rrggbb` в
 * нижнем регистре, чтобы пресет и введённый вручную тот же цвет совпадали строкой.
 */
export function parseHex(input: string): string | null {
  const hex = input.trim().replace(/^#/, '').toLowerCase();

  if (/^[0-9a-f]{3}$/.test(hex)) {
    return `#${Array.from(hex, (char) => char + char).join('')}`;
  }

  return /^[0-9a-f]{6}$/.test(hex) ? `#${hex}` : null;
}

export function hexToRgb(hex: string): Rgb | null {
  const normalized = parseHex(hex);

  if (!normalized) return null;

  const value = Number.parseInt(normalized.slice(1), 16);

  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** Оттенок 0–360, насыщенность и яркость 0–1 — как оси палитры: квадрат s × v и полоса h */
export interface Hsv {
  h: number;
  s: number;
  v: number;
}

/** Оттенок 0–360, насыщенность и светлота 0–1 */
export interface Hsl {
  h: number;
  s: number;
  l: number;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Каналы округляются и прижимаются к 0–255: после HSV в них дробные и иногда 255.0000001 */
export function rgbToHex(rgb: Rgb): string {
  return `#${rgb
    .map((channel) =>
      Math.round(Math.min(255, Math.max(0, channel)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

/** Оттенок по каналам 0–1; у серого оттенка нет — 0 */
function hueOf(r: number, g: number, b: number, max: number, delta: number): number {
  if (delta === 0) return 0;

  const sector =
    max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;

  return (sector * 60 + 360) % 360;
}

export function rgbToHsv([r, g, b]: Rgb): Hsv {
  const [red, green, blue] = [r / 255, g / 255, b / 255];
  const max = Math.max(red, green, blue);
  const delta = max - Math.min(red, green, blue);

  return { h: hueOf(red, green, blue, max, delta), s: max === 0 ? 0 : delta / max, v: max };
}

export function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const channel = (n: number) => {
    const k = (n + h / 60) % 6;

    return (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255;
  };

  return [Math.round(channel(5)), Math.round(channel(3)), Math.round(channel(1))];
}

export function rgbToHsl([r, g, b]: Rgb): Hsl {
  const [red, green, blue] = [r / 255, g / 255, b / 255];
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return { h: hueOf(red, green, blue, max, delta), s, l };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;

    return (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255;
  };

  return [Math.round(channel(0)), Math.round(channel(8)), Math.round(channel(4))];
}

export function hsvToHex(hsv: Hsv): string {
  return rgbToHex(hsvToRgb({ h: hsv.h, s: clamp01(hsv.s), v: clamp01(hsv.v) }));
}

/**
 * Hex в HSV. У серого нет оттенка, у чёрного — ещё и насыщенности: их берём из `previous`, иначе ручка
 * оттенка прыгала бы в красный, стоит протащить курсор через угол квадрата.
 */
export function hexToHsv(hex: string, previous?: Hsv): Hsv {
  const rgb = hexToRgb(hex) ?? [0, 0, 0];
  const hsv = rgbToHsv(rgb);

  if (!previous) return hsv;

  return {
    h: hsv.s === 0 || hsv.v === 0 ? previous.h : hsv.h,
    s: hsv.v === 0 ? previous.s : hsv.s,
    v: hsv.v,
  };
}

/** Подписи для копирования: целые каналы и проценты — как их пишут в CSS */
export function formatRgb(hex: string): string | null {
  const rgb = hexToRgb(hex);

  return rgb ? `rgb(${rgb.join(', ')})` : null;
}

export function formatHsl(hex: string): string | null {
  const rgb = hexToRgb(hex);

  if (!rgb) return null;

  const { h, s, l } = rgbToHsl(rgb);

  return `hsl(${Math.round(h) % 360}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

/** Относительная яркость по WCAG 2.x: каналы sRGB линеаризуются и взвешиваются */
export function relativeLuminance([r, g, b]: Rgb): number {
  const linear = (channel: number) => {
    const c = channel / 255;

    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** Контраст двух цветов, 1–21; null — если какой-то цвет не разобрать */
export function contrastRatio(a: string, b: string): number | null {
  const first = hexToRgb(a);
  const second = hexToRgb(b);

  if (!first || !second) return null;

  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const light = Math.max(firstLuminance, secondLuminance);
  const dark = Math.min(firstLuminance, secondLuminance);

  return (light + 0.05) / (dark + 0.05);
}

/** Уровень WCAG для обычного текста: AA — 4.5, AAA — 7; 3 хватает только крупному (18 px жирным и больше) */
export function contrastLevel(ratio: number): ContrastLevel {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA-large';

  return 'fail';
}

/** Какой текст читается на заливке — белый или тёмный: тот, что даёт больший контраст */
export function readableTextOn(hex: string): 'light' | 'dark' {
  const onWhite = contrastRatio(hex, '#ffffff') ?? 0;
  const onBlack = contrastRatio(hex, '#000000') ?? 0;

  return onWhite >= onBlack ? 'light' : 'dark';
}
