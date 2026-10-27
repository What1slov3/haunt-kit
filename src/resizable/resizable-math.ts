/*
 * Математика панелей. Внутри размеры — проценты от места под панели (без ручек), в сумме 100; пиксели
 * переводятся в проценты по текущему размеру контейнера. Ручка растит одну соседку, а место отдают панели
 * с другой стороны по очереди, от ближней к дальней (каскад): упёрлась ближняя в минимум — сжимается дальняя.
 */

/** Размер панели: число и `'30%'` — проценты, `'240px'` — пиксели */
export type PanelSize = number | `${number}%` | `${number}px`;

/** Ограничения панели в процентах — то, с чем работает вся математика ниже */
export interface PanelConstraints {
  /** Начальный размер, %; без него панели делят остаток поровну */
  defaultSize?: number;
  /** Минимум, % */
  minSize?: number;
  /** Максимум, % */
  maxSize?: number;
  /** Панель сворачивается: ручку протянули дальше половины пути от минимума к свёрнутому размеру */
  collapsible?: boolean;
  /** Размер свёрнутой панели, %; по умолчанию 0 */
  collapsedSize?: number;
}

/** Ограничения панели как в пропсах: проценты или пиксели вперемешку */
export interface PanelSpec {
  defaultSize?: PanelSize;
  minSize?: PanelSize;
  maxSize?: PanelSize;
  collapsible?: boolean;
  collapsedSize?: PanelSize;
}

export interface Bounds {
  min: number;
  max: number;
}

export type ResizeDirection = 'horizontal' | 'vertical';

/** Проценты сравниваются с допуском: суммы дробных размеров после деления не бывают ровно 100 */
const EPSILON = 1e-6;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);

export function isPixelSize(size: PanelSize | undefined): size is `${number}px` {
  return typeof size === 'string' && size.endsWith('px');
}

/** Размер в процентах; пиксели без известного размера контейнера не переводятся — undefined */
export function toPercent(size: PanelSize | undefined, available: number): number | undefined {
  if (size === undefined) return undefined;
  if (typeof size === 'number') return size;

  const value = Number.parseFloat(size);

  if (!Number.isFinite(value)) return undefined;
  if (!isPixelSize(size)) return value;

  return available > 0 ? (value / available) * 100 : undefined;
}

/**
 * Пропсы панелей в проценты при данном месте под панели. `defaults` подменяют `defaultSize` — так
 * возвращается сохранённая раскладка.
 */
export function normalizePanels(
  specs: readonly PanelSpec[],
  available: number,
  defaults?: readonly (PanelSize | undefined)[] | null,
): PanelConstraints[] {
  return specs.map((spec, i) => ({
    defaultSize: toPercent(defaults?.[i] ?? spec.defaultSize, available),
    minSize: toPercent(spec.minSize, available),
    maxSize: toPercent(spec.maxSize, available),
    collapsible: spec.collapsible,
    collapsedSize: toPercent(spec.collapsedSize, available),
  }));
}

/**
 * Какие панели держат размер в пикселях, когда меняется контейнер: те, у кого `defaultSize` в px. Хотя бы
 * одна панель остаётся гибкой (последняя), иначе прибавку ширины окна некому было бы забрать.
 */
export function pixelPanels(specs: readonly PanelSpec[]): boolean[] {
  const pixel = specs.map((spec) => isPixelSize(spec.defaultSize));

  if (pixel.length && pixel.every(Boolean)) pixel[pixel.length - 1] = false;

  return pixel;
}

function panelBounds(constraints: PanelConstraints | undefined): Bounds {
  return { min: constraints?.minSize ?? 0, max: constraints?.maxSize ?? 100 };
}

const collapsedSizeOf = (constraints: PanelConstraints | undefined) =>
  constraints?.collapsedSize ?? 0;

export function isCollapsed(size: number, constraints: PanelConstraints | undefined): boolean {
  return constraints?.collapsible === true && size <= collapsedSizeOf(constraints) + EPSILON;
}

/** Свёрнутая панель в каскаде стоит: её не сжимают дальше — только разворачивают */
function cascadeMin(constraints: PanelConstraints | undefined, size: number): number {
  return isCollapsed(size, constraints) ? size : panelBounds(constraints).min;
}

/** Размер в пределах панели; сворачиваемая при размере не больше свёрнутого остаётся свёрнутой */
function clampPanel(size: number, constraints: PanelConstraints | undefined): number {
  if (isCollapsed(size, constraints)) return collapsedSizeOf(constraints);

  const { min, max } = panelBounds(constraints);

  return clamp(size, min, max);
}

/**
 * Сводит сумму к 100: каждую панель — в её пределы, недостачу или избыток забирают панели с конца (обычно
 * основная область). Свёрнутые не трогаются: сумма сходится за счёт остальных.
 */
function fitSizes(sizes: readonly number[], panels: readonly PanelConstraints[]): number[] {
  const next = sizes.map((size, i) => clampPanel(size, panels[i]));
  const locked = next.map((size, i) => isCollapsed(size, panels[i]));
  let diff = 100 - sum(next);

  for (let i = next.length - 1; i >= 0 && Math.abs(diff) > EPSILON; i--) {
    if (locked[i]) continue;

    const { min, max } = panelBounds(panels[i]);
    const size = clamp(next[i]! + diff, min, max);

    diff -= size - next[i]!;
    next[i] = size;
  }

  return next;
}

/**
 * Начальные размеры: заданные `defaultSize` как есть, остаток поровну между остальными, затем ограничения;
 * то, что не сошлось до 100 после ограничений, забирают панели с конца (обычно — основная область).
 */
export function resolveSizes(panels: readonly PanelConstraints[]): number[] {
  if (!panels.length) return [];

  const specified = sum(panels.map((panel) => panel.defaultSize ?? 0));
  const free = panels.filter((panel) => panel.defaultSize === undefined).length;
  const share = free ? Math.max(0, 100 - specified) / free : 0;

  return fitSizes(
    panels.map((panel) => panel.defaultSize ?? share),
    panels,
  );
}

/**
 * Контейнер сменил размер с `from` на `to` px. Пиксельные панели сохраняют ширину в пикселях, свёрнутые —
 * свёрнутый размер, остальное делят гибкие панели в прежней пропорции. `panels` — ограничения уже при `to`,
 * `collapsed` — какие панели были свёрнуты до смены.
 */
export function rescaleSizes(
  sizes: readonly number[],
  panels: readonly PanelConstraints[],
  pixel: readonly boolean[],
  collapsed: readonly boolean[],
  from: number,
  to: number,
): number[] {
  if (from <= 0 || to <= 0 || Math.abs(from - to) < EPSILON) return [...sizes];

  const next = [...sizes];
  const flexible: number[] = [];
  let fixed = 0;

  sizes.forEach((size, i) => {
    if (!collapsed[i] && !pixel[i]) {
      flexible.push(i);

      return;
    }

    next[i] = collapsed[i] ? collapsedSizeOf(panels[i]) : (size * from) / to;
    fixed += next[i]!;
  });

  const remainder = Math.max(0, 100 - fixed);
  const flexTotal = sum(flexible.map((i) => sizes[i]!));

  for (const i of flexible) {
    next[i] =
      flexTotal > EPSILON ? (sizes[i]! / flexTotal) * remainder : remainder / flexible.length;
  }

  return fitSizes(next, panels);
}

/** Отбирает до `amount` у панелей `order` по очереди, каждую — до её минимума; возвращает, сколько отдали */
function shrinkInOrder(
  next: number[],
  panels: readonly PanelConstraints[],
  order: readonly number[],
  amount: number,
): number {
  let left = amount;

  for (const i of order) {
    if (left <= EPSILON) break;

    const take = Math.min(left, Math.max(0, next[i]! - cascadeMin(panels[i], next[i]!)));

    next[i] = next[i]! - take;
    left -= take;
  }

  return amount - left;
}

/** Индексы от `from` до `to` включительно, в любую сторону — ближняя к ручке панель первой */
const range = (from: number, to: number) =>
  Array.from({ length: Math.abs(to - from) + 1 }, (_, i) => (from <= to ? from + i : from - i));

/**
 * Сдвиг ручки `index` на `delta` % (плюс — левая/верхняя растёт). Растёт одна соседка ручки, место отдают
 * панели с другой стороны от ближней к дальней. Сворачиваемая соседка за половиной пути к свёрнутому
 * размеру сворачивается целиком, а до неё держит ручку у минимума — дальние панели в это время стоят, иначе
 * свернуть её было бы нельзя. Свёрнутая разворачивается тем же порогом. Упирается в пределы, а не отскакивает.
 */
export function resizeAt(
  sizes: readonly number[],
  panels: readonly PanelConstraints[],
  index: number,
  delta: number,
): number[] {
  const count = sizes.length;

  if (index < 0 || index >= count - 1 || Math.abs(delta) < EPSILON) return [...sizes];

  const growing = delta > 0 ? index : index + 1;
  const shrinking = delta > 0 ? range(index + 1, count - 1) : range(index, 0);
  const pivot = shrinking[0]!;
  const amount = Math.abs(delta);
  const grow = panels[growing];
  const growSize = sizes[growing]!;
  const next = [...sizes];

  if (isCollapsed(growSize, grow)) {
    const { min, max } = panelBounds(grow);

    if (amount < (min - growSize) / 2) return next;

    const given = shrinkInOrder(
      next,
      panels,
      shrinking,
      clamp(growSize + amount, min, max) - growSize,
    );

    // Отдать хотя бы до минимума некому — развернуть нельзя, раскладка остаётся
    if (growSize + given < min - EPSILON) return [...sizes];

    next[growing] = growSize + given;

    return next;
  }

  const room = Math.max(0, panelBounds(grow).max - growSize);
  const pivotPanel = panels[pivot];
  const collapsible = pivotPanel?.collapsible === true && !isCollapsed(sizes[pivot]!, pivotPanel);

  if (collapsible) {
    const collapsed = collapsedSizeOf(pivotPanel);
    const halfway = (collapsed + panelBounds(pivotPanel).min) / 2;
    const freed = sizes[pivot]! - collapsed;

    if (sizes[pivot]! - amount < halfway && freed <= room + EPSILON) {
      next[pivot] = collapsed;
      next[growing] = growSize + freed;

      return next;
    }
  }

  const given = shrinkInOrder(
    next,
    panels,
    collapsible ? [pivot] : shrinking,
    Math.min(amount, room),
  );

  next[growing] = growSize + given;

  return next;
}

/** Ручка ставит левую панель ровно в `size` % (в пределах) — для Home / End и сброса */
export function resizeTo(
  sizes: readonly number[],
  panels: readonly PanelConstraints[],
  index: number,
  size: number,
): number[] {
  return resizeAt(sizes, panels, index, size - (sizes[index] ?? 0));
}

/**
 * Куда может уйти левая панель ручки `index` — это aria-valuemin / aria-valuemax. Растёт она за счёт всех
 * панелей справа (каскад; сворачиваемая соседка — только своим местом, вплоть до свёрнутого размера),
 * сжимается — до минимума или свёрнутого размера, пока правая соседка может принять.
 */
export function handleBounds(
  sizes: readonly number[],
  panels: readonly PanelConstraints[],
  index: number,
): Bounds {
  const size = sizes[index]!;
  const left = panels[index];
  const right = panels[index + 1];
  const rightSize = sizes[index + 1]!;
  const rightCollapsible = right?.collapsible === true && !isCollapsed(rightSize, right);
  // Может быть отрицательным: раскладка вне пределов, и ручка сначала должна её вернуть
  const give = rightCollapsible
    ? rightSize - collapsedSizeOf(right)
    : sum(
        range(index + 1, sizes.length - 1).map((i) => sizes[i]! - cascadeMin(panels[i], sizes[i]!)),
      );
  const floor = left?.collapsible ? collapsedSizeOf(left) : panelBounds(left).min;
  const min = isCollapsed(size, left)
    ? size
    : Math.max(floor, size - (panelBounds(right).max - rightSize));
  const max = Math.min(panelBounds(left).max, size + give);

  // Несовместимые ограничения: ручка стоит, а не прыгает в недопустимое положение
  if (min > max + EPSILON) return { min: size, max: size };

  return { min, max };
}

/**
 * Клавиатура ручки по шаблону WAI-ARIA «window splitter»: стрелки вдоль оси — на `step` %, Home — левую
 * панель к минимуму, End — к максимуму. null — клавиша не наша, её не надо гасить.
 */
export function resizeByKey(
  sizes: readonly number[],
  panels: readonly PanelConstraints[],
  index: number,
  key: string,
  direction: ResizeDirection,
  step: number,
): number[] | null {
  const [decrease, increase] =
    direction === 'horizontal' ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown'];

  if (key === decrease) return resizeAt(sizes, panels, index, -step);
  if (key === increase) return resizeAt(sizes, panels, index, step);
  if (key === 'Home') return resizeTo(sizes, panels, index, handleBounds(sizes, panels, index).min);
  if (key === 'End') return resizeTo(sizes, panels, index, handleBounds(sizes, panels, index).max);

  return null;
}

/** Какую панель сворачивает ручка `index`: левую, если она сворачиваемая, иначе правую; -1 — никакую */
export function collapsibleNeighbour(panels: readonly PanelConstraints[], index: number): number {
  if (panels[index]?.collapsible) return index;
  if (panels[index + 1]?.collapsible) return index + 1;

  return -1;
}

/**
 * Свернуть или развернуть сворачиваемую соседку ручки (двойной клик, Enter). Разворачивается в `restore`
 * — размер до сворачивания — в пределах панели. null — у ручки нет сворачиваемой соседки.
 */
export function toggleCollapse(
  sizes: readonly number[],
  panels: readonly PanelConstraints[],
  index: number,
  restore: number | undefined,
): number[] | null {
  const target = collapsibleNeighbour(panels, index);

  if (target < 0) return null;

  const panel = panels[target];
  const size = sizes[target]!;
  // Левая соседка растёт сдвигом ручки вправо (плюс), правая — влево
  const sign = target === index ? 1 : -1;

  if (isCollapsed(size, panel)) {
    const { min, max } = panelBounds(panel);
    const desired = clamp(restore ?? panel?.defaultSize ?? min, min, max);

    return resizeAt(sizes, panels, index, sign * (desired - size));
  }

  return resizeAt(sizes, panels, index, -sign * (size - collapsedSizeOf(panel)));
}

/**
 * Размер, в который разворачивать: запоминается в момент сворачивания из `base` — раскладки до жеста
 * (начала перетаскивания), а не из промежуточного шага, где панель уже прижата к минимуму.
 */
export function rememberExpanded(
  memory: readonly (number | undefined)[],
  base: readonly number[],
  next: readonly number[],
  panels: readonly PanelConstraints[],
): (number | undefined)[] {
  return next.map((size, i) =>
    isCollapsed(size, panels[i]) && !isCollapsed(base[i] ?? size, panels[i]) ? base[i] : memory[i],
  );
}

/**
 * Раскладка для сохранения: пиксельные панели — в пикселях (сайдбар вернётся в свои 240 px при любом окне),
 * остальные — в процентах. Это готовые `defaultSize`.
 */
export function serializeLayout(
  sizes: readonly number[],
  pixel: readonly boolean[],
  available: number,
): PanelSize[] {
  return sizes.map((size, i) =>
    pixel[i] && available > 0
      ? (`${Math.round((size * available) / 100)}px` as const)
      : Math.round(size * 1000) / 1000,
  );
}

/** Пиксели перетаскивания в проценты места под панели */
export function pixelsToPercent(pixels: number, available: number): number {
  return available > 0 ? (pixels / available) * 100 : 0;
}
