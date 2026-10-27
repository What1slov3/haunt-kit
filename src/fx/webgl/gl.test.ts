import { describe, expect, it } from 'vitest';

import { formatShaderLog } from './gl';

describe('formatShaderLog', () => {
  const source = [
    '#version 300 es',
    'precision highp float;',
    'out vec4 color;',
    'void main() { color = vec3(1.0); }',
  ].join('\n');

  it('показывает строку с ошибкой и соседние, ошибочная помечена', () => {
    const message = formatShaderLog(
      source,
      "ERROR: 0:4: '=' : cannot convert from 'vec3' to 'vec4'",
    );

    expect(message).toContain("cannot convert from 'vec3'");
    expect(message).toContain('>   4 | void main() { color = vec3(1.0); }');
    expect(message).toContain('    3 | out vec4 color;');
  });

  it('лог без номеров строк — как есть', () => {
    expect(formatShaderLog(source, 'link failed')).toBe('link failed');
  });
});
