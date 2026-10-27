import { describe, expect, it } from 'vitest';

import { isCode128B } from '../barcode/code128';

import { serialFromSeed } from './serial';

describe('serialFromSeed', () => {
  it('один seed — один номер', () => {
    expect(serialFromSeed('night-raid')).toBe(serialFromSeed('night-raid'));
    expect(serialFromSeed('night-raid')).not.toBe(serialFromSeed('night-raid-2'));
  });

  it('формат: серия и группы через дефис, без 0 / O / 1 / I', () => {
    const serial = serialFromSeed('space-0042', { prefix: 'HNT', groups: 3, length: 3 });

    expect(serial).toMatch(/^HNT-[2-9A-HJ-NP-Z]{3}-[2-9A-HJ-NP-Z]{3}-[2-9A-HJ-NP-Z]{3}$/);
  });

  it('годится для штрихкода', () => {
    expect(isCode128B(serialFromSeed('Лаборатория', { prefix: 'LAB' }))).toBe(true);
  });
});
