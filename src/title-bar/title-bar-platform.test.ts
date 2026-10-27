import { describe, expect, it } from 'vitest';

import { resolveWindowPlatform } from './title-bar-platform';

describe('resolveWindowPlatform', () => {
  it('явная платформа побеждает', () => {
    expect(resolveWindowPlatform('linux', 'MacIntel')).toBe('linux');
  });

  it('auto — по строке платформы', () => {
    expect(resolveWindowPlatform('auto', 'MacIntel')).toBe('mac');
    expect(resolveWindowPlatform('auto', 'macOS')).toBe('mac');
    expect(resolveWindowPlatform('auto', 'Win32')).toBe('windows');
    expect(resolveWindowPlatform('auto', 'Windows')).toBe('windows');
    expect(resolveWindowPlatform('auto', 'Linux x86_64')).toBe('linux');
    expect(resolveWindowPlatform('auto', '')).toBe('linux');
  });
});
