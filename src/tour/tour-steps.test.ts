import { describe, expect, it } from 'vitest';

import {
  centerAnchor,
  clampStep,
  isRectVisible,
  nextMove,
  padRect,
  previousIndex,
  progressLabel,
  resolveTarget,
  sameRect,
  spotlightPath,
} from './tour-steps';

describe('переходы', () => {
  it('«Далее» ведёт к следующему шагу, на последнем — к финишу', () => {
    expect(nextMove(0, 3)).toEqual({ type: 'step', index: 1 });
    expect(nextMove(2, 3)).toEqual({ type: 'finish' });
    expect(nextMove(0, 1)).toEqual({ type: 'finish' });
  });

  it('«Назад» не уходит за первый шаг', () => {
    expect(previousIndex(2)).toBe(1);
    expect(previousIndex(0)).toBe(0);
  });

  it('номер шага зажат в пределы списка', () => {
    expect(clampStep(7, 3)).toBe(2);
    expect(clampStep(-1, 3)).toBe(0);
    expect(clampStep(1.6, 3)).toBe(1);
    expect(clampStep(2, 0)).toBe(0);
  });

  it('прогресс с единицы', () => {
    expect(progressLabel(1, 5)).toBe('2 / 5');
  });
});

describe('цель', () => {
  it('селектор, функция, кривой селектор', () => {
    document.body.innerHTML = '<button id="send">Отправить</button>';

    const button = document.getElementById('send');

    expect(resolveTarget('#send')).toBe(button);
    expect(resolveTarget(() => button)).toBe(button);
    expect(resolveTarget('#missing')).toBeNull();
    expect(resolveTarget('[[[')).toBeNull();
    expect(resolveTarget(undefined)).toBeNull();
  });
});

describe('геометрия', () => {
  const viewport = { width: 1000, height: 600 };

  it('поле вокруг цели', () => {
    expect(padRect({ x: 10, y: 20, width: 100, height: 30 }, 6)).toEqual({
      x: 4,
      y: 14,
      width: 112,
      height: 42,
    });
  });

  it('видна ли цель целиком', () => {
    expect(isRectVisible({ x: 10, y: 10, width: 100, height: 30 }, viewport)).toBe(true);
    expect(isRectVisible({ x: 10, y: 590, width: 100, height: 30 }, viewport)).toBe(false);
    expect(isRectVisible({ x: 10, y: 10, width: 100, height: 30 }, viewport, 16)).toBe(false);
  });

  it('без цели — точка в центре на трети высоты', () => {
    expect(centerAnchor(viewport)).toEqual({ x: 500, y: 200, width: 0, height: 0 });
  });

  it('путь: экран и скруглённое окно', () => {
    expect(spotlightPath({ x: 10, y: 20, width: 100, height: 40 }, viewport, 8)).toBe(
      'M0 0H1000V600H0Z' +
        'M18 20H102A8 8 0 0 1 110 28V52A8 8 0 0 1 102 60H18A8 8 0 0 1 10 52V28A8 8 0 0 1 18 20Z',
    );
  });

  it('радиус не больше половины стороны', () => {
    expect(spotlightPath({ x: 0, y: 0, width: 10, height: 6 }, viewport, 8)).toContain('A3 3');
  });

  it('без цели — те же команды, окно в точку', () => {
    const withHole = spotlightPath({ x: 10, y: 20, width: 100, height: 40 }, viewport, 8);
    const empty = spotlightPath(null, viewport, 8);
    const commands = (path: string) => path.replace(/[^A-Za-z]/g, '');

    expect(commands(empty)).toBe(commands(withHole));
    expect(empty).toContain('M500 300H500A0 0');
  });

  it('прямоугольники равны с точностью до полупикселя', () => {
    const rect = { x: 10, y: 10, width: 20, height: 20 };

    expect(sameRect(rect, { ...rect, x: 10.3 })).toBe(true);
    expect(sameRect(rect, { ...rect, x: 11 })).toBe(false);
    expect(sameRect(null, null)).toBe(true);
    expect(sameRect(rect, null)).toBe(false);
  });
});
