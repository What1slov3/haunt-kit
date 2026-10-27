/*
 * Шрифт глифов TUI — `src/theme/fonts/haunt-tui.woff`. В подмножествах JetBrains Mono из fontsource нет
 * псевдографики, блоков и брайля (U+2500–259F, U+2800–28FF), а знаков Powerline (U+E0B0–E0BF) нет нигде: эти знаки рисовал системный шрифт со своей
 * шириной и высотой, рамки рвались пунктиром, блоки не стыковались. Здесь глифы строятся геометрией ровно
 * в клетку JetBrains Mono (600 × 1320 единиц, верх 1020, низ −300), так что `┌─┐`, `█▌░` и `⠋` — обычный
 * текст: копируется, читается и стыкуется в соседних клетках, как в терминале.
 *
 * Запуск: `pnpm --filter @haunt/ui build:tui-font`. Файл в репозитории; тест рядом сверяет его с
 * генератором, поэтому правка геометрии без пересборки шрифта не пройдёт проверку.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const ADVANCE = 600;
const ASCENT = 1020;
const DESCENT = 300;
const TOP = ASCENT;
const BOTTOM = -DESCENT;
const CX = ADVANCE / 2;
const CY = (TOP + BOTTOM) / 2;
/* Вертикальные линии выходят за клетку: при межстрочном больше 1,32 соседние строки всё равно стыкуются.
 * Блоки и брайль не выходят — они должны точно заполнять клетку и не наезжать на соседей. */
const OVERSHOOT = 120;
/* Блоки заходят на соседнюю клетку на 2 % кегля: клетка занимает дробное число пикселей, и без захода
 * между соседними █ сглаживание оставляет светлый шов. Линии не заходят: у тонкого штриха все пиксели
 * полупрозрачные, и нахлёст соседних знаков дал бы тёмные бусины через клетку */
const BLEED = 20;
const LIGHT = 90;
const HEAVY = 180;
/** Двойная линия: два штриха по ±DOUBLE_GAP от оси */
const DOUBLE_GAP = 80;
const DOUBLE_STROKE = 70;

type Point = [number, number];
type Contour = Point[];
type Glyph = Contour[];

function area(contour: Contour): number {
  let sum = 0;

  for (let i = 0; i < contour.length; i++) {
    const [x0, y0] = contour[i]!;
    const [x1, y1] = contour[(i + 1) % contour.length]!;

    sum += x0 * y1 - x1 * y0;
  }

  return sum / 2;
}

/** TrueType закрашивает по ненулевому правилу: внешние контуры — по часовой стрелке, дырки — против */
function orient(contour: Contour, clockwise = true): Contour {
  return area(contour) < 0 === clockwise ? contour : [...contour].reverse();
}

function rect(x0: number, y0: number, x1: number, y1: number, clockwise = true): Contour {
  return orient(
    [
      [Math.min(x0, x1), Math.min(y0, y1)],
      [Math.min(x0, x1), Math.max(y0, y1)],
      [Math.max(x0, x1), Math.max(y0, y1)],
      [Math.max(x0, x1), Math.min(y0, y1)],
    ],
    clockwise,
  );
}

function polygon(points: Point[]): Contour {
  return orient(points);
}

/** Точки дуги эллипса; углы в градусах, против часовой от оси x */
function arcPoints(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  from: number,
  to: number,
): Point[] {
  const steps = Math.max(4, Math.ceil(Math.abs(to - from) / 7.5));
  const points: Point[] = [];

  for (let i = 0; i <= steps; i++) {
    const angle = ((from + ((to - from) * i) / steps) * Math.PI) / 180;

    points.push([cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)]);
  }

  return points;
}

/** Круг многоугольником: точки брайля и стыки ломаных мельче пикселя, кривые им не нужны */
function circle(x: number, y: number, radius: number, sides = 12): Contour {
  return polygon(
    Array.from({ length: sides }, (_, i): Point => {
      const angle = (i / sides) * 2 * Math.PI;

      return [x + radius * Math.cos(angle), y + radius * Math.sin(angle)];
    }),
  );
}

/** Толстая ломаная: каждый отрезок — свой четырёхугольник, стыки закрывает круг в вершине */
function stroke(points: Point[], width: number): Glyph {
  const glyph: Glyph = [];

  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i]!;
    const [x1, y1] = points[i + 1]!;
    const length = Math.hypot(x1 - x0, y1 - y0);
    const nx = (-(y1 - y0) / length) * (width / 2);
    const ny = ((x1 - x0) / length) * (width / 2);

    glyph.push(
      polygon([
        [x0 + nx, y0 + ny],
        [x1 + nx, y1 + ny],
        [x1 - nx, y1 - ny],
        [x0 - nx, y0 - ny],
      ]),
    );

    if (i > 0) glyph.push(circle(x0, y0, width / 2, 8));
  }

  return glyph;
}

/* --- Псевдографика ------------------------------------------------------------------------
 * Знак — четыре плеча (вверх, вправо, вниз, влево), у каждого вес: 0 нет, 1 тонкое, 2 жирное, 3 двойное.
 * Плечо строится в своих координатах: `a` — от центра к краю, `p` — поперёк, «боковые» плечи — соседние.
 * Длина плеча у центра зависит от соседей: так тонкая линия упирается во внешний или внутренний штрих
 * двойной, а углы двойных сходятся, как в ╔ и ╬.
 */
type Weight = 0 | 1 | 2 | 3;
type Direction = 'up' | 'right' | 'down' | 'left';

const DIRECTIONS: Direction[] = ['up', 'right', 'down', 'left'];

const FRAMES: Record<Direction, { side: [Direction, Direction]; opposite: Direction }> = {
  up: { side: ['right', 'left'], opposite: 'down' },
  right: { side: ['up', 'down'], opposite: 'left' },
  down: { side: ['right', 'left'], opposite: 'up' },
  left: { side: ['up', 'down'], opposite: 'right' },
};

function halfWidth(weight: Weight): number {
  if (weight === 1) return LIGHT / 2;

  if (weight === 2) return HEAVY / 2;

  return weight === 3 ? DOUBLE_GAP + DOUBLE_STROKE / 2 : 0;
}

/** Прямоугольник плеча из своих координат в координаты клетки */
function armRect(direction: Direction, a0: number, a1: number, p0: number, p1: number): Contour {
  if (direction === 'right') return rect(CX + a0, CY + p0, CX + a1, CY + p1);

  if (direction === 'left') return rect(CX - a0, CY + p0, CX - a1, CY + p1);

  if (direction === 'up') return rect(CX + p0, CY + a0, CX + p1, CY + a1);

  return rect(CX + p0, CY - a0, CX + p1, CY - a1);
}

function armLength(direction: Direction): number {
  return direction === 'left' || direction === 'right' ? CX : TOP - CY + OVERSHOOT;
}

function boxGlyph(spec: string): Glyph {
  const weights = Object.fromEntries(
    DIRECTIONS.map((direction, i) => [direction, Number(spec[i]) as Weight]),
  ) as Record<Direction, Weight>;
  const glyph: Glyph = [];

  for (const direction of DIRECTIONS) {
    const weight = weights[direction];

    if (weight === 0) continue;

    const { side, opposite } = FRAMES[direction];
    const plus = weights[side[0]];
    const minus = weights[side[1]];
    const ahead = weights[opposite];
    const end = armLength(direction);

    if (weight !== 3) {
      const half = halfWidth(weight);
      let start = 0;

      if (ahead) start = 0;
      else if (plus === 3 && minus === 3) start = DOUBLE_GAP;
      else if (plus === 3 || minus === 3) start = -halfWidth(3);
      else start = -Math.max(halfWidth(plus), halfWidth(minus));

      glyph.push(armRect(direction, start, end, -half, half));

      continue;
    }

    // Двойное плечо: штрих со стороны `near` упирается в соседа с той же стороны или тянется к дальнему
    const doubleStart = (near: Weight, far: Weight): number => {
      if (near) return near === 3 ? DOUBLE_GAP : 0;

      if (ahead === 3) return 0;

      if (far) return -halfWidth(far);

      return 0;
    };

    const s = DOUBLE_STROKE / 2;

    glyph.push(armRect(direction, doubleStart(plus, minus), end, DOUBLE_GAP - s, DOUBLE_GAP + s));
    glyph.push(armRect(direction, doubleStart(minus, plus), end, -DOUBLE_GAP - s, -DOUBLE_GAP + s));
  }

  return glyph;
}

/** Плечи по кодам: «вверх, вправо, вниз, влево» */
const BOX: Record<number, string> = {
  0x2500: '0101',
  0x2501: '0202',
  0x2502: '1010',
  0x2503: '2020',
  0x250c: '0110',
  0x250d: '0210',
  0x250e: '0120',
  0x250f: '0220',
  0x2510: '0011',
  0x2511: '0012',
  0x2512: '0021',
  0x2513: '0022',
  0x2514: '1100',
  0x2515: '1200',
  0x2516: '2100',
  0x2517: '2200',
  0x2518: '1001',
  0x2519: '1002',
  0x251a: '2001',
  0x251b: '2002',
  0x251c: '1110',
  0x251d: '1210',
  0x251e: '2110',
  0x251f: '1120',
  0x2520: '2120',
  0x2521: '2210',
  0x2522: '1220',
  0x2523: '2220',
  0x2524: '1011',
  0x2525: '1012',
  0x2526: '2011',
  0x2527: '1021',
  0x2528: '2021',
  0x2529: '2012',
  0x252a: '1022',
  0x252b: '2022',
  0x252c: '0111',
  0x252d: '0112',
  0x252e: '0211',
  0x252f: '0212',
  0x2530: '0121',
  0x2531: '0122',
  0x2532: '0221',
  0x2533: '0222',
  0x2534: '1101',
  0x2535: '1102',
  0x2536: '1201',
  0x2537: '1202',
  0x2538: '2101',
  0x2539: '2102',
  0x253a: '2201',
  0x253b: '2202',
  0x253c: '1111',
  0x253d: '1112',
  0x253e: '1211',
  0x253f: '1212',
  0x2540: '2111',
  0x2541: '1121',
  0x2542: '2121',
  0x2543: '2112',
  0x2544: '2211',
  0x2545: '1122',
  0x2546: '1221',
  0x2547: '2212',
  0x2548: '1222',
  0x2549: '2122',
  0x254a: '2221',
  0x254b: '2222',
  0x2550: '0303',
  0x2551: '3030',
  0x2552: '0310',
  0x2553: '0130',
  0x2554: '0330',
  0x2555: '0013',
  0x2556: '0031',
  0x2557: '0033',
  0x2558: '1300',
  0x2559: '3100',
  0x255a: '3300',
  0x255b: '1003',
  0x255c: '3001',
  0x255d: '3003',
  0x255e: '1310',
  0x255f: '3130',
  0x2560: '3330',
  0x2561: '1013',
  0x2562: '3031',
  0x2563: '3033',
  0x2564: '0313',
  0x2565: '0131',
  0x2566: '0333',
  0x2567: '1303',
  0x2568: '3101',
  0x2569: '3303',
  0x256a: '1313',
  0x256b: '3131',
  0x256c: '3333',
  0x2574: '0001',
  0x2575: '1000',
  0x2576: '0100',
  0x2577: '0010',
  0x2578: '0002',
  0x2579: '2000',
  0x257a: '0200',
  0x257b: '0020',
  0x257c: '0201',
  0x257d: '1020',
  0x257e: '0102',
  0x257f: '2010',
};

/** Пунктир: `count` штрихов на клетку, без выхода за край — иначе шаг сбился бы на стыке строк */
function dashed(vertical: boolean, count: number, weight: number): Glyph {
  const length = vertical ? TOP - BOTTOM : ADVANCE;
  const step = length / count;
  const glyph: Glyph = [];

  for (let i = 0; i < count; i++) {
    const from = i * step + step * 0.2;
    const to = from + step * 0.6;

    glyph.push(
      vertical
        ? rect(CX - weight / 2, BOTTOM + from, CX + weight / 2, BOTTOM + to)
        : rect(from, CY - weight / 2, to, CY + weight / 2),
    );
  }

  return glyph;
}

const DASHES: Record<number, [vertical: boolean, count: number, weight: number]> = {
  0x2504: [false, 3, LIGHT],
  0x2505: [false, 3, HEAVY],
  0x2506: [true, 3, LIGHT],
  0x2507: [true, 3, HEAVY],
  0x2508: [false, 4, LIGHT],
  0x2509: [false, 4, HEAVY],
  0x250a: [true, 4, LIGHT],
  0x250b: [true, 4, HEAVY],
  0x254c: [false, 2, LIGHT],
  0x254d: [false, 2, HEAVY],
  0x254e: [true, 2, LIGHT],
  0x254f: [true, 2, HEAVY],
};

/**
 * Скруглённый угол ╭╮╯╰: четверть окружности радиусом в полклетки от середины боковой стороны и
 * вертикаль до края строки — стыкуется с │ и ─ соседних клеток.
 */
function arcGlyph(horizontal: 'left' | 'right', vertical: 'up' | 'down'): Glyph {
  const r = CX;
  const half = LIGHT / 2;
  const cx = horizontal === 'right' ? ADVANCE : 0;
  const cy = vertical === 'down' ? CY - r : CY + r;
  const from =
    horizontal === 'right' ? (vertical === 'down' ? 90 : 270) : vertical === 'down' ? 90 : 270;
  const to = horizontal === 'right' ? 180 : vertical === 'down' ? 0 : 360;
  const outer = arcPoints(cx, cy, r + half, r + half, from, to);
  const inner = arcPoints(cx, cy, r - half, r - half, to, from);
  const edge = vertical === 'down' ? BOTTOM - OVERSHOOT : TOP + OVERSHOOT;

  return [polygon([...outer, ...inner]), rect(CX - half, cy, CX + half, edge)];
}

function diagonal(rising: boolean): Glyph {
  return stroke(
    rising
      ? [
          [0, BOTTOM],
          [ADVANCE, TOP],
        ]
      : [
          [0, TOP],
          [ADVANCE, BOTTOM],
        ],
    LIGHT,
  );
}

/* --- Блоки ------------------------------------------------------------------------------- */
const HEIGHT = TOP - BOTTOM;

/** Прямоугольник блока: стороны, лежащие на краю клетки, заходят за него на BLEED */
function block(x0: number, y0: number, x1: number, y1: number): Contour {
  const out = (value: number, edge: number, sign: number) =>
    value === edge ? edge + sign * BLEED : value;

  return rect(out(x0, 0, -1), out(y0, BOTTOM, -1), out(x1, ADVANCE, 1), out(y1, TOP, 1));
}

function lower(eighths: number): Glyph {
  return [block(0, BOTTOM, ADVANCE, BOTTOM + (HEIGHT * eighths) / 8)];
}

function left(eighths: number): Glyph {
  return [block(0, BOTTOM, (ADVANCE * eighths) / 8, TOP)];
}

function quadrants(...parts: ('tl' | 'tr' | 'bl' | 'br')[]): Glyph {
  return parts.map((part) =>
    block(
      part.endsWith('l') ? 0 : CX,
      part.startsWith('t') ? CY : BOTTOM,
      part.endsWith('l') ? CX : ADVANCE,
      part.startsWith('t') ? TOP : CY,
    ),
  );
}

/*
 * Штриховка ░▒▓ — сетка 8 × 16 подклеток: ░ — каждая четвёртая в шахматном порядке, ▒ — шахматка,
 * ▓ — сплошной блок с дырками ░. Подклетка — около пикселя при кегле 12–13 px: при 1x узор сливается в
 * ровный полутон, при 2x — тонкий дизеринг. Крупнее (4 × 8) точки в 2 px читались сыпью по дорожке
 * TuiProgress. Чётные размеры сетки — узор продолжается в соседних клетках без шва.
 */
const SHADE_COLUMNS = 8;
const SHADE_ROWS = 16;

function shadeCells(): Point[] {
  const cells: Point[] = [];

  for (let row = 0; row < SHADE_ROWS; row++) {
    for (let column = 0; column < SHADE_COLUMNS; column++) {
      if (row % 4 === 0 && column % 2 === 0) cells.push([column, row]);

      if (row % 4 === 2 && column % 2 === 1) cells.push([column, row]);
    }
  }

  return cells;
}

function shadeRect([column, row]: Point, clockwise = true): Contour {
  const w = ADVANCE / SHADE_COLUMNS;
  const h = HEIGHT / SHADE_ROWS;

  return rect(column * w, BOTTOM + row * h, (column + 1) * w, BOTTOM + (row + 1) * h, clockwise);
}

function shade(level: 1 | 2 | 3): Glyph {
  if (level === 1) return shadeCells().map((cell) => shadeRect(cell));

  if (level === 3)
    return [block(0, BOTTOM, ADVANCE, TOP), ...shadeCells().map((cell) => shadeRect(cell, false))];

  const glyph: Glyph = [];

  for (let row = 0; row < SHADE_ROWS; row++)
    for (let column = 0; column < SHADE_COLUMNS; column++)
      if ((row + column) % 2 === 0) glyph.push(shadeRect([column, row]));

  return glyph;
}

const BLOCKS: Record<number, Glyph> = {
  0x2580: [block(0, CY, ADVANCE, TOP)],
  0x2581: lower(1),
  0x2582: lower(2),
  0x2583: lower(3),
  0x2584: lower(4),
  0x2585: lower(5),
  0x2586: lower(6),
  0x2587: lower(7),
  0x2588: lower(8),
  0x2589: left(7),
  0x258a: left(6),
  0x258b: left(5),
  0x258c: left(4),
  0x258d: left(3),
  0x258e: left(2),
  0x258f: left(1),
  0x2590: [block(CX, BOTTOM, ADVANCE, TOP)],
  0x2591: shade(1),
  0x2592: shade(2),
  0x2593: shade(3),
  0x2594: [block(0, TOP - HEIGHT / 8, ADVANCE, TOP)],
  0x2595: [block((ADVANCE * 7) / 8, BOTTOM, ADVANCE, TOP)],
  0x2596: quadrants('bl'),
  0x2597: quadrants('br'),
  0x2598: quadrants('tl'),
  0x2599: quadrants('tl', 'bl', 'br'),
  0x259a: quadrants('tl', 'br'),
  0x259b: quadrants('tl', 'tr', 'bl'),
  0x259c: quadrants('tl', 'tr', 'br'),
  0x259d: quadrants('tr'),
  0x259e: quadrants('tr', 'bl'),
  0x259f: quadrants('tr', 'bl', 'br'),
};

/*
 * Брайль — сетка 2 × 4 точек на всю клетку с шагом ≈ 300 × 330: соседние знаки складываются в ровное
 * поле точек, как у графиков в терминале. Биты: точки 1–3 и 7 — левый столбец сверху вниз, 4–6 и 8 — правый.
 */
const BRAILLE_DOTS: [bit: number, column: number, row: number][] = [
  [0x01, 0, 0],
  [0x02, 0, 1],
  [0x04, 0, 2],
  [0x40, 0, 3],
  [0x08, 1, 0],
  [0x10, 1, 1],
  [0x20, 1, 2],
  [0x80, 1, 3],
];

function braille(bits: number): Glyph {
  const radius = 78;

  return BRAILLE_DOTS.filter(([bit]) => bits & bit).map(([, column, row]) => {
    const x = ADVANCE / 4 + column * (ADVANCE / 2);
    const y = TOP - HEIGHT / 8 - row * (HEIGHT / 4);

    return circle(x, y, radius);
  });
}

/*
 * Powerline (U+E0B0–E0BF): стрелки, полукруги и срезы сегментов на всю высоту клетки. Сплошные знаки
 * стыкуются с заливкой сегмента, поэтому, как блоки, заходят за край клетки на BLEED.
 */
const SOLID_LEFT = -BLEED;
const SOLID_RIGHT = ADVANCE + BLEED;
const SOLID_TOP = TOP + BLEED;
const SOLID_BOTTOM = BOTTOM - BLEED;

const POWERLINE: Record<number, Glyph> = {
  0xe0b0: [
    polygon([
      [SOLID_LEFT, SOLID_BOTTOM],
      [SOLID_LEFT, SOLID_TOP],
      [ADVANCE, CY],
    ]),
  ],
  0xe0b1: stroke(
    [
      [0, TOP],
      [ADVANCE - LIGHT, CY],
      [0, BOTTOM],
    ],
    LIGHT,
  ),
  0xe0b2: [
    polygon([
      [SOLID_RIGHT, SOLID_BOTTOM],
      [SOLID_RIGHT, SOLID_TOP],
      [0, CY],
    ]),
  ],
  0xe0b3: stroke(
    [
      [ADVANCE, TOP],
      [LIGHT, CY],
      [ADVANCE, BOTTOM],
    ],
    LIGHT,
  ),
  0xe0b4: [
    polygon([
      [SOLID_LEFT, SOLID_BOTTOM],
      ...arcPoints(0, CY, ADVANCE, HEIGHT / 2 + BLEED, -90, 90),
      [SOLID_LEFT, SOLID_TOP],
    ]),
  ],
  0xe0b5: stroke(arcPoints(0, CY, ADVANCE - LIGHT / 2, HEIGHT / 2 - LIGHT / 2, -90, 90), LIGHT),
  0xe0b6: [
    polygon([
      [SOLID_RIGHT, SOLID_TOP],
      ...arcPoints(ADVANCE, CY, ADVANCE, HEIGHT / 2 + BLEED, 90, 270),
      [SOLID_RIGHT, SOLID_BOTTOM],
    ]),
  ],
  0xe0b7: stroke(
    arcPoints(ADVANCE, CY, ADVANCE - LIGHT / 2, HEIGHT / 2 - LIGHT / 2, 90, 270),
    LIGHT,
  ),
  // Срезы: сплошные треугольники по диагонали клетки и тонкие диагонали-разделители
  0xe0b8: [
    polygon([
      [SOLID_LEFT, SOLID_TOP],
      [SOLID_LEFT, SOLID_BOTTOM],
      [ADVANCE, SOLID_BOTTOM],
    ]),
  ],
  0xe0b9: diagonal(false),
  0xe0ba: [
    polygon([
      [SOLID_RIGHT, SOLID_TOP],
      [SOLID_RIGHT, SOLID_BOTTOM],
      [0, SOLID_BOTTOM],
    ]),
  ],
  0xe0bb: diagonal(true),
  0xe0bc: [
    polygon([
      [SOLID_LEFT, SOLID_TOP],
      [ADVANCE, SOLID_TOP],
      [SOLID_LEFT, SOLID_BOTTOM],
    ]),
  ],
  0xe0bd: diagonal(true),
  0xe0be: [
    polygon([
      [0, SOLID_TOP],
      [SOLID_RIGHT, SOLID_TOP],
      [SOLID_RIGHT, SOLID_BOTTOM],
    ]),
  ],
  0xe0bf: diagonal(false),
};

export function tuiGlyphs(): Map<number, Glyph> {
  const glyphs = new Map<number, Glyph>();

  for (let code = 0x2500; code <= 0x257f; code++) {
    const box = BOX[code];
    const dash = DASHES[code];

    if (box) glyphs.set(code, boxGlyph(box));
    else if (dash) glyphs.set(code, dashed(...dash));
  }

  glyphs.set(0x256d, arcGlyph('right', 'down'));
  glyphs.set(0x256e, arcGlyph('left', 'down'));
  glyphs.set(0x256f, arcGlyph('left', 'up'));
  glyphs.set(0x2570, arcGlyph('right', 'up'));
  glyphs.set(0x2571, diagonal(true));
  glyphs.set(0x2572, diagonal(false));
  glyphs.set(0x2573, [...diagonal(true), ...diagonal(false)]);

  for (const [code, glyph] of Object.entries(BLOCKS)) glyphs.set(Number(code), glyph);

  for (let bits = 0; bits < 256; bits++) glyphs.set(0x2800 + bits, braille(bits));

  for (const [code, glyph] of Object.entries(POWERLINE)) glyphs.set(Number(code), glyph);

  return new Map([...glyphs].sort(([a], [b]) => a - b));
}

/* --- Запись TrueType ------------------------------------------------------------------------ */
class Bytes {
  private data: number[] = [];

  get length() {
    return this.data.length;
  }

  u8(value: number) {
    this.data.push(value & 0xff);

    return this;
  }

  u16(value: number) {
    return this.u8(value >> 8).u8(value);
  }

  i16(value: number) {
    return this.u16(value < 0 ? value + 0x10000 : value);
  }

  u32(value: number) {
    return this.u16(Math.floor(value / 0x10000) & 0xffff).u16(value & 0xffff);
  }

  bytes(values: ArrayLike<number>) {
    for (let i = 0; i < values.length; i++) this.u8(values[i]!);

    return this;
  }

  pad4() {
    while (this.data.length % 4) this.u8(0);

    return this;
  }

  done() {
    return Uint8Array.from(this.data);
  }
}

interface Encoded {
  data: Uint8Array;
  bounds: [number, number, number, number] | null;
  points: number;
  contours: number;
}

function encodeGlyph(glyph: Glyph): Encoded {
  const contours = glyph
    .map((contour) =>
      contour
        .map(([x, y]): Point => [Math.round(x), Math.round(y)])
        .filter(([x, y], i, all) => {
          const [px, py] = all[(i + all.length - 1) % all.length]!;

          return x !== px || y !== py;
        }),
    )
    .filter((contour) => contour.length >= 3);

  if (contours.length === 0)
    return { data: new Uint8Array(), bounds: null, points: 0, contours: 0 };

  const all = contours.flat();
  const xs = all.map(([x]) => x);
  const ys = all.map(([, y]) => y);
  const bounds: [number, number, number, number] = [
    Math.min(...xs),
    Math.min(...ys),
    Math.max(...xs),
    Math.max(...ys),
  ];
  const out = new Bytes().i16(contours.length);

  for (const value of bounds) out.i16(value);

  let end = -1;

  for (const contour of contours) out.u16((end += contour.length));

  out.u16(0);

  // Все точки на кривой, координаты — 16-битные приращения: флаг 0x01 без коротких форм
  for (let i = 0; i < all.length; i++) out.u8(0x01);

  let previous = 0;

  for (const [x] of all) {
    out.i16(x - previous);
    previous = x;
  }

  previous = 0;

  for (const [, y] of all) {
    out.i16(y - previous);
    previous = y;
  }

  return { data: out.pad4().done(), bounds, points: all.length, contours: contours.length };
}

function utf16(text: string): number[] {
  return [...text].flatMap((char) => {
    const code = char.charCodeAt(0);

    return [code >> 8, code & 0xff];
  });
}

function checksum(data: Uint8Array): number {
  let sum = 0;

  for (let i = 0; i < data.length; i += 4)
    sum =
      (sum +
        ((data[i]! << 24) >>> 0) +
        ((data[i + 1] ?? 0) << 16) +
        ((data[i + 2] ?? 0) << 8) +
        (data[i + 3] ?? 0)) >>>
      0;

  return sum;
}

const FAMILY = 'Haunt TUI';

/** Шрифт целиком (TrueType) */
export function buildTtf(): Uint8Array {
  const glyphs = tuiGlyphs();
  const codes = [...glyphs.keys()];
  // Глиф 0 — .notdef, пустой: знаки вне шрифта браузер берёт из следующего в списке
  const encoded = [encodeGlyph([]), ...[...glyphs.values()].map(encodeGlyph)];
  const bounds = encoded.flatMap((glyph) => (glyph.bounds ? [glyph.bounds] : []));
  const xMin = Math.min(...bounds.map((b) => b[0]));
  const yMin = Math.min(...bounds.map((b) => b[1]));
  const xMax = Math.max(...bounds.map((b) => b[2]));
  const yMax = Math.max(...bounds.map((b) => b[3]));

  const glyf = new Bytes();
  const loca = new Bytes();

  for (const glyph of encoded) {
    loca.u32(glyf.length);
    glyf.bytes(glyph.data);
  }

  loca.u32(glyf.length);

  const hmtx = new Bytes();

  for (const glyph of encoded) hmtx.u16(ADVANCE).i16(glyph.bounds ? glyph.bounds[0] : 0);

  // cmap формат 4: отрезок на каждый непрерывный ряд кодов, номера глифов идут подряд
  const segments: [start: number, end: number, glyph: number][] = [];

  codes.forEach((code, i) => {
    const last = segments.at(-1);

    if (last && code === last[1] + 1) last[1] = code;
    else segments.push([code, code, i + 1]);
  });

  segments.push([0xffff, 0xffff, 0]);

  const segCount = segments.length;
  const searchRange = 2 ** (Math.floor(Math.log2(segCount)) + 1);
  const subtable = new Bytes()
    .u16(4)
    .u16(16 + segCount * 8)
    .u16(0)
    .u16(segCount * 2)
    .u16(searchRange)
    .u16(Math.log2(searchRange / 2))
    .u16(segCount * 2 - searchRange);

  for (const [, end] of segments) subtable.u16(end);

  subtable.u16(0);

  for (const [start] of segments) subtable.u16(start);

  for (const [start, , glyph] of segments)
    subtable.u16(start === 0xffff ? 1 : (glyph - start + 0x10000) % 0x10000);

  for (let i = 0; i < segCount; i++) subtable.u16(0);

  const cmap = new Bytes().u16(0).u16(1).u16(3).u16(1).u32(12).bytes(subtable.done());

  const head = new Bytes()
    .u32(0x00010000)
    .u32(0x00010000)
    .u32(0)
    .u32(0x5f0f3cf5)
    .u16(0x000b)
    .u16(1000)
    .bytes(new Uint8Array(16))
    .i16(xMin)
    .i16(yMin)
    .i16(xMax)
    .i16(yMax)
    .u16(0)
    .u16(8)
    .i16(2)
    .i16(1)
    .i16(0);

  const hhea = new Bytes()
    .u32(0x00010000)
    .i16(ASCENT)
    .i16(-DESCENT)
    .i16(0)
    .u16(ADVANCE)
    .i16(xMin)
    .i16(Math.min(...bounds.map((b) => ADVANCE - b[2])))
    .i16(xMax)
    .i16(1)
    .i16(0)
    .i16(0)
    .bytes(new Uint8Array(8))
    .i16(0)
    .u16(encoded.length);

  const maxp = new Bytes()
    .u32(0x00010000)
    .u16(encoded.length)
    .u16(Math.max(...encoded.map((g) => g.points)))
    .u16(Math.max(...encoded.map((g) => g.contours)))
    .u16(0)
    .u16(0)
    .u16(2)
    .bytes(new Uint8Array(16));

  const os2 = new Bytes()
    .u16(4)
    .i16(ADVANCE)
    .u16(400)
    .u16(5)
    .u16(0)
    .i16(650)
    .i16(600)
    .i16(0)
    .i16(75)
    .i16(650)
    .i16(600)
    .i16(0)
    .i16(350)
    .i16(50)
    .i16(300)
    .i16(0)
    // PANOSE: текстовый, моноширинный
    .bytes([2, 0, 5, 9, 0, 0, 0, 0, 0, 0])
    .u32(0)
    // Биты Unicode: псевдографика (47), блоки (48), PUA (60), брайль (82)
    .u32((1 << 15) | (1 << 16) | (1 << 28))
    .u32(1 << 18)
    .u32(0)
    .bytes([0x48, 0x4e, 0x54, 0x20])
    .u16(0x00c0)
    .u16(codes[0]!)
    .u16(Math.min(0xffff, codes.at(-1)!))
    .i16(ASCENT)
    .i16(-DESCENT)
    .i16(0)
    .u16(ASCENT)
    .u16(DESCENT)
    .u32(1)
    .u32(0)
    .i16(520)
    .i16(730)
    .u16(0)
    .u16(0x20)
    .u16(0);

  const post = new Bytes()
    .u32(0x00030000)
    .u32(0)
    .i16(-100)
    .i16(50)
    .u32(1)
    .bytes(new Uint8Array(16));

  const names: [id: number, text: string][] = [
    [1, FAMILY],
    [2, 'Regular'],
    [3, `${FAMILY} Regular 1.0`],
    [4, FAMILY],
    [5, 'Version 1.000'],
    [6, 'HauntTUI-Regular'],
  ];
  const strings = names.map(([, text]) => utf16(text));
  const name = new Bytes()
    .u16(0)
    .u16(names.length)
    .u16(6 + names.length * 12);
  let offset = 0;

  names.forEach(([id], i) => {
    name.u16(3).u16(1).u16(0x409).u16(id).u16(strings[i]!.length).u16(offset);
    offset += strings[i]!.length;
  });

  for (const string of strings) name.bytes(string);

  const tables: [tag: string, data: Uint8Array][] = (
    [
      ['OS/2', os2],
      ['cmap', cmap],
      ['glyf', glyf],
      ['head', head],
      ['hhea', hhea],
      ['hmtx', hmtx],
      ['loca', loca],
      ['maxp', maxp],
      ['name', name],
      ['post', post],
    ] as const
  ).map(([tag, bytes]) => [tag, bytes.done()]);

  const font = new Bytes();
  const count = tables.length;
  const range = 16 * 2 ** Math.floor(Math.log2(count));

  font
    .u32(0x00010000)
    .u16(count)
    .u16(range)
    .u16(Math.log2(range / 16))
    .u16(count * 16 - range);

  let tableOffset = 12 + count * 16;

  for (const [tag, data] of tables) {
    font.bytes([...tag].map((char) => char.charCodeAt(0)));
    font.u32(checksum(data)).u32(tableOffset).u32(data.length);
    tableOffset += Math.ceil(data.length / 4) * 4;
  }

  for (const [, data] of tables) font.bytes(data).pad4();

  const result = font.done();
  const headOffset =
    12 +
    count * 16 +
    tables.slice(0, 3).reduce((sum, [, d]) => sum + Math.ceil(d.length / 4) * 4, 0);
  const adjustment = (0xb1b0afba - checksum(result) + 0x100000000) % 0x100000000;

  new DataView(result.buffer).setUint32(headOffset + 8, adjustment);

  return result;
}

/** Таблицы шрифта по тегам — для WOFF и для сверки в тесте */
export function sfntTables(font: Uint8Array): Map<string, Uint8Array> {
  const view = new DataView(font.buffer, font.byteOffset, font.byteLength);
  const tables = new Map<string, Uint8Array>();

  for (let i = 0; i < view.getUint16(4); i++) {
    const entry = 12 + i * 16;
    const tag = String.fromCharCode(...font.subarray(entry, entry + 4));
    const offset = view.getUint32(entry + 8);

    tables.set(tag, font.subarray(offset, offset + view.getUint32(entry + 12)));
  }

  return tables;
}

/** WOFF 1.0: те же таблицы, каждая сжата zlib — в несколько раз меньше TrueType */
export function toWoff(font: Uint8Array): Uint8Array {
  const tables = [...sfntTables(font)];
  const compressed = tables.map(([tag, data]) => {
    const packed = deflateSync(data, { level: 9 });

    return { tag, data, packed: packed.length < data.length ? packed : data };
  });
  const sfntSize =
    12 + tables.length * 16 + tables.reduce((sum, [, d]) => sum + Math.ceil(d.length / 4) * 4, 0);
  let offset = 44 + tables.length * 20;
  const directory = new Bytes();

  for (const { tag, data, packed } of compressed) {
    directory
      .bytes([...tag].map((char) => char.charCodeAt(0)))
      .u32(offset)
      .u32(packed.length)
      .u32(data.length)
      .u32(checksum(data));
    offset += Math.ceil(packed.length / 4) * 4;
  }

  const body = new Bytes();

  for (const { packed } of compressed) body.bytes(packed).pad4();

  const header = new Bytes()
    .u32(0x774f4646)
    .u32(0x00010000)
    .u32(44 + directory.length + body.length)
    .u16(tables.length)
    .u16(0)
    .u32(sfntSize)
    .u16(1)
    .u16(0)
    .bytes(new Uint8Array(20));

  return Uint8Array.from([...header.done(), ...directory.done(), ...body.done()]);
}

export const WOFF_PATH = fileURLToPath(
  new URL('../src/theme/fonts/haunt-tui.woff', import.meta.url),
);

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const woff = toWoff(buildTtf());

  writeFileSync(WOFF_PATH, woff);
  console.log(`${WOFF_PATH}: ${woff.length} байт`);
}
