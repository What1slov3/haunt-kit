import { describe, expect, it } from 'vitest';

import { parseFloatingState } from './floating-storage';

const valid = {
  placement: { x: 12, y: 40, anchorX: 'start', anchorY: null },
  size: { width: 320, height: 200 },
  collapsed: true,
};

describe('parseFloatingState', () => {
  it('целое состояние', () => {
    expect(parseFloatingState(JSON.stringify(valid))).toEqual(valid);
  });

  it('без collapsed — развёрнута', () => {
    expect(parseFloatingState(JSON.stringify({ ...valid, collapsed: 'yes' }))?.collapsed).toBe(
      false,
    );
  });

  it('мусор — null', () => {
    expect(parseFloatingState(null)).toBeNull();
    expect(parseFloatingState('{')).toBeNull();
    expect(parseFloatingState('null')).toBeNull();
    expect(
      parseFloatingState(
        JSON.stringify({ ...valid, placement: { ...valid.placement, anchorX: 'left' } }),
      ),
    ).toBeNull();
    expect(
      parseFloatingState(JSON.stringify({ ...valid, size: { width: 0, height: 10 } })),
    ).toBeNull();
  });
});
