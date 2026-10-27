import { createRandom, hashSeed, pick, randomInt } from './seed';

/*
 * Процедурная эмблема: знак с поворотной симметрией порядка 3–8, как нашивка или маркировка на упаковке.
 * Поле 100 × 100, центр (50, 50). Каждая деталь описана один раз в «секторе» (смотрит вверх, симметрична
 * относительно вертикали) и повторяется поворотом — поэтому знак всегда собран, а не случаен.
 * Радиальные детали лежат в непересекающихся кольцах: детали не наезжают друг на друга.
 */

export const EMBLEM_VIEWBOX = 100;

const C = EMBLEM_VIEWBOX / 2;

export interface EmblemPart {
  kind: 'ring' | 'spoke' | 'chevron' | 'dot' | 'tri' | 'arc' | 'bar' | 'core';
  /** Путь SVG в секторе (для ring и core — во всём поле) */
  d: string;
  paint: 'fill' | 'stroke';
  strokeWidth?: number;
  /** Пунктир кольца — `stroke-dasharray` */
  dash?: string;
  /** Повторять поворотом по порядку симметрии */
  repeat: boolean;
  /** Деталь цвета акцента; у эмблемы она одна */
  accent: boolean;
}

export interface EmblemData {
  order: number;
  parts: EmblemPart[];
}

const round = (value: number) => Math.round(value * 100) / 100;

/** Точка на окружности: угол от вертикали вверх по часовой */
function polar(r: number, degrees: number): [number, number] {
  const angle = (degrees * Math.PI) / 180;

  return [round(C + r * Math.sin(angle)), round(C - r * Math.cos(angle))];
}

function circlePath(r: number): string {
  return `M ${C} ${round(C - r)} A ${r} ${r} 0 1 1 ${C} ${round(C + r)} A ${r} ${r} 0 1 1 ${C} ${round(C - r)}`;
}

type Band = [inner: number, outer: number];

/** Деталь сектора, вписанная в кольцо band; sector — угол сектора, чтобы соседние копии не сливались */
function sectorPart(random: () => number, band: Band, sector: number): EmblemPart {
  const [inner, outer] = band;
  const height = outer - inner;
  const kind = pick(random, ['spoke', 'chevron', 'dot', 'tri', 'arc', 'bar'] as const);
  // Полуширина детали не больше половины дуги сектора на внутреннем радиусе
  const room = Math.max(2, inner * Math.sin(((sector / 2) * Math.PI) / 180) * 0.8);

  switch (kind) {
    case 'spoke': {
      const width = round(Math.min(room, 1.5 + random() * 3));

      return {
        kind,
        d: `M ${round(C - width / 2)} ${round(C - outer)} h ${width} V ${round(C - inner)} h ${-width} Z`,
        paint: 'fill',
        repeat: true,
        accent: false,
      };
    }

    case 'chevron': {
      const spread = round(Math.min(room, 3 + random() * height));
      const tip = round(C - outer + 1);
      const depth = round(Math.min(height - 2, 2 + random() * height * 0.7));

      return {
        kind,
        d: `M ${round(C - spread)} ${round(tip + depth)} L ${C} ${tip} L ${round(C + spread)} ${round(tip + depth)}`,
        paint: 'stroke',
        strokeWidth: round(1.5 + random() * 1.5),
        repeat: true,
        accent: false,
      };
    }

    case 'dot': {
      const r = round(Math.min(room, height / 2, 1.5 + random() * 3));
      const cy = round(C - (inner + outer) / 2);

      return {
        kind,
        d: `M ${round(C - r)} ${cy} A ${r} ${r} 0 1 1 ${round(C + r)} ${cy} A ${r} ${r} 0 1 1 ${round(C - r)} ${cy} Z`,
        paint: 'fill',
        repeat: true,
        accent: false,
      };
    }

    case 'tri': {
      const half = round(Math.min(room, 2 + random() * height * 0.6));

      return {
        kind,
        d: `M ${C} ${round(C - outer)} L ${round(C + half)} ${round(C - inner)} L ${round(C - half)} ${round(C - inner)} Z`,
        paint: 'fill',
        repeat: true,
        accent: false,
      };
    }

    case 'arc': {
      const r = round((inner + outer) / 2);
      const sweep = sector * (0.35 + random() * 0.4);
      const [x1, y1] = polar(r, -sweep / 2);
      const [x2, y2] = polar(r, sweep / 2);

      return {
        kind,
        d: `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`,
        paint: 'stroke',
        strokeWidth: round(Math.min(height * 0.8, 1.5 + random() * 3)),
        repeat: true,
        accent: false,
      };
    }

    case 'bar': {
      const half = round(Math.min(room * 1.4, 3 + random() * 6));
      const y = round(C - (inner + outer) / 2);

      return {
        kind,
        d: `M ${round(C - half)} ${y} H ${round(C + half)}`,
        paint: 'stroke',
        strokeWidth: round(Math.min(height * 0.7, 1.5 + random() * 2.5)),
        repeat: true,
        accent: false,
      };
    }
  }
}

function corePart(random: () => number, radius: number): EmblemPart | null {
  const shape = pick(random, ['dot', 'diamond', 'ring', 'none'] as const);
  const r = round(Math.max(2.5, radius * (0.45 + random() * 0.4)));

  if (shape === 'none') return null;

  if (shape === 'diamond') {
    return {
      kind: 'core',
      d: `M ${C} ${round(C - r)} L ${round(C + r)} ${C} L ${C} ${round(C + r)} L ${round(C - r)} ${C} Z`,
      paint: 'fill',
      repeat: false,
      accent: false,
    };
  }

  return {
    kind: 'core',
    d: circlePath(r),
    paint: shape === 'dot' ? 'fill' : 'stroke',
    strokeWidth: shape === 'ring' ? 2 : undefined,
    repeat: false,
    accent: false,
  };
}

/** Эмблема по строке: одна строка — всегда один знак */
export function emblemFromSeed(seed: string): EmblemData {
  const random = createRandom(hashSeed(seed));
  const order = pick(random, [3, 4, 5, 6, 8]);
  const sector = 360 / order;
  const parts: EmblemPart[] = [];

  // Внешнее кольцо — сплошное или пунктир с числом штрихов, кратным порядку
  const ringWidth = pick(random, [1.5, 2, 3]);
  const ringR = 47 - ringWidth / 2;
  const dashes = pick(random, [0, order * 2, order * 3, order * 6]);
  const circumference = 2 * Math.PI * ringR;

  parts.push({
    kind: 'ring',
    d: circlePath(ringR),
    paint: 'stroke',
    strokeWidth: ringWidth,
    dash: dashes
      ? `${round((circumference / dashes) * 0.62)} ${round((circumference / dashes) * 0.38)}`
      : undefined,
    repeat: false,
    accent: false,
  });

  // Радиальные детали в кольцах от 41 к центру: 2–3 кольца случайной толщины с зазорами
  const count = randomInt(random, 2, 3);
  let outer = 41;

  for (let i = 0; i < count; i++) {
    const height = 7 + random() * 7;
    const inner = Math.max(10, outer - height);

    parts.push(sectorPart(random, [round(inner), round(outer)], sector));
    outer = inner - 3;

    if (outer < 13) break;
  }

  const core = corePart(random, Math.max(4, outer));

  if (core) parts.push(core);

  // Один акцент на знак — как одна краска поверх чёрной печати
  const accentIndex = randomInt(random, 1, parts.length - 1);
  const accentPart = parts[accentIndex];

  if (accentPart) accentPart.accent = true;

  return { order, parts };
}
