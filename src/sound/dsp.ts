import type { NoiseColor, RoomSpec } from './sounds';

/*
 * Сигналы для синтеза — чистые функции над массивами, без Web Audio: шум трёх цветов, коэффициенты
 * прямоугольника с шириной импульса, кривая перегруза и импульсная характеристика помещения. Движок
 * кладёт их в AudioBuffer / PeriodicWave / WaveShaper, генератор рисует по ним картинку, тесты
 * проверяют форму. Случайность — свой генератор с зерном: одинаковые параметры — одинаковый звук.
 */

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Линейный конгруэнтный генератор, −1…1 */
function noiseSource(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;

    return (state / 4294967296) * 2 - 1;
  };
}

function normalizePeak(...channels: Float32Array[]): void {
  let peak = 0;

  for (const data of channels) for (const value of data) peak = Math.max(peak, Math.abs(value));

  if (peak === 0) return;

  for (const data of channels) for (let i = 0; i < data.length; i++) data[i]! /= peak;
}

/**
 * Шум цвета `color`, пик 1: белый — ровный по частотам; розовый — −3 дБ на октаву (фильтр Келлета),
 * ровный на слух, как дождь; коричневый — −6 дБ на октаву (интеграл с утечкой), глухой рокот
 */
export function noiseSamples(
  color: NoiseColor,
  length: number,
  seed = 0x9e3779b9,
): Float32Array<ArrayBuffer> {
  const out = new Float32Array(length);
  const next = noiseSource(seed);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;
  let brown = 0;

  for (let i = 0; i < length; i++) {
    const white = next();

    if (color === 'white') {
      out[i] = white;
    } else if (color === 'pink') {
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      out[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      b6 = white * 0.115926;
    } else {
      brown = (brown + 0.02 * white) / 1.02;
      out[i] = brown;
    }
  }

  normalizePeak(out);

  return out;
}

/**
 * Ряд Фурье импульса шириной `width` (доля периода) для `createPeriodicWave`: real — косинусы,
 * imag — синусы, нулевой член (постоянная составляющая) — ноль. 0.5 — обычный прямоугольник
 */
export function pulseCoefficients(
  width: number,
  harmonics = 64,
): { real: Float32Array; imag: Float32Array } {
  const duty = clamp(width, 0.05, 0.95);
  const real = new Float32Array(harmonics + 1);
  const imag = new Float32Array(harmonics + 1);

  for (let n = 1; n <= harmonics; n++) {
    real[n] = Math.sin(2 * Math.PI * n * duty) / (n * Math.PI);
    imag[n] = (1 - Math.cos(2 * Math.PI * n * duty)) / (n * Math.PI);
  }

  return { real, imag };
}

/** Кривая WaveShaper: tanh с крутизной от `amount` 0…1, нормирована — пик на входе 1 даёт пик 1 */
export function driveCurve(amount: number, size = 1024): Float32Array<ArrayBuffer> {
  const k = 1 + clamp(amount, 0, 1) * 24;
  const norm = Math.tanh(k);
  const curve = new Float32Array(size);

  for (let i = 0; i < size; i++) curve[i] = Math.tanh(k * ((i / (size - 1)) * 2 - 1)) / norm;

  return curve;
}

/** Параметры помещения без доли отражённого звука — то, от чего зависит сама характеристика */
export type RoomShape = Omit<RoomSpec, 'mix'>;

/** Число ранних отражений: столько отдельных ударов от стен слышно до того, как хвост сольётся */
const EARLY_TAPS = 8;

/**
 * Импульсная характеристика помещения, стерео, пик 1:
 * - пауза `preDelay`, затем ранние отражения — 8 отдельных ударов в первые 15–80 мс (зал крупнее —
 *   они реже), каждый со своей стороной;
 * - диффузный хвост — шум со спадом до −60 дБ к `decay`. Плотность нарастает за 10 мс, а верх гаснет
 *   быстрее низа (однополюсный срез темнеет со временем) — так звучат настоящие стены;
 * - `brightness` — насколько светлый хвост в начале, `width` — насколько разные левый и правый.
 */
export function impulseResponse(
  room: RoomShape,
  sampleRate: number,
  seed = 0x2545f491,
): [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] {
  const decay = clamp(room.decay, 0.05, 8);
  const pre = Math.round(clamp(room.preDelay ?? 0, 0, 0.25) * sampleRate);
  const tail = Math.ceil(decay * sampleRate);
  const brightness = clamp(room.brightness ?? 0.5, 0, 1);
  const width = clamp(room.width ?? 0.8, 0, 1);
  const left = new Float32Array(pre + tail);
  const right = new Float32Array(pre + tail);
  const next = noiseSource(seed);
  const early = Math.min(0.08, Math.max(0.015, decay * 0.25)) * sampleRate;

  for (let k = 0; k < EARLY_TAPS; k++) {
    const at = pre + Math.floor((0.1 + 0.9 * ((next() + 1) / 2)) * early);
    const amp = (1 - k / EARLY_TAPS) * 0.5 * Math.sign(next() || 1);
    const pan = (next() + 1) / 2;

    left[at]! += amp * (1 - width * pan);
    right[at]! += amp * (1 - width * (1 - pan));
  }

  // Коэффициент сглаживания: 1 — срез выше слышимого, к 0 — всё темнее
  const bright = 0.12 + 0.85 * brightness;
  let smoothLeft = 0;
  let smoothRight = 0;

  for (let i = 0; i < tail; i++) {
    const t = i / sampleRate;
    const envelope = Math.exp((-6.9 * t) / decay) * Math.min(1, t / 0.01);
    const a = Math.max(0.03, bright * Math.exp((-t * (2 - brightness)) / decay));
    const common = next();
    const l = common * (1 - width) + next() * width;
    const r = common * (1 - width) + next() * width;

    smoothLeft += (l - smoothLeft) * a;
    smoothRight += (r - smoothRight) * a;
    left[pre + i]! += smoothLeft * envelope;
    right[pre + i]! += smoothRight * envelope;
  }

  normalizePeak(left, right);

  return [left, right];
}
