import { describe, expect, it } from 'vitest';

import { TUI_SPINNER_FRAMES } from './tui-frames';

describe('TUI_SPINNER_FRAMES', () => {
  it('braille — десять кадров по одному символу', () => {
    expect(TUI_SPINNER_FRAMES.braille.join('')).toBe('⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏');
  });

  it('кадры каждого набора одной ширины — подпись рядом не дёргается', () => {
    for (const frames of Object.values(TUI_SPINNER_FRAMES)) {
      const widths = new Set(frames.map((frame) => [...frame].length));

      expect(widths.size).toBe(1);
    }
  });
});
