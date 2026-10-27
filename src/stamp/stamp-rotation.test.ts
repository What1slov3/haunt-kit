import { describe, expect, it } from 'vitest';

import { stampRotation } from './stamp-rotation';

describe('stampRotation', () => {
  it('один текст — один наклон', () => {
    expect(stampRotation('ОДОБРЕНО')).toBe(stampRotation('ОДОБРЕНО'));
  });

  it('от −12° до −3° с шагом 0.1°', () => {
    for (const text of ['ОДОБРЕНО', 'НОВОЕ', 'APPROVED', 'beta', '', 'x'.repeat(40)]) {
      const angle = stampRotation(text);

      expect(angle).toBeGreaterThanOrEqual(-12);
      expect(angle).toBeLessThanOrEqual(-3);
      expect(Math.round(angle * 10)).toBeCloseTo(angle * 10);
    }
  });
});
