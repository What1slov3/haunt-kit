// @vitest-environment node
// Шрифт собирается в Node: в jsdom import.meta.url — не file:, и путь к файлу не построить
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

import { describe, expect, it } from 'vitest';

import { buildTtf, sfntTables, tuiGlyphs, WOFF_PATH } from './tui-font';

/** Таблицы из WOFF 1.0: сжатая таблица короче исходной, несжатая лежит как есть */
function woffTables(woff: Uint8Array): Map<string, Uint8Array> {
  const view = new DataView(woff.buffer, woff.byteOffset, woff.byteLength);
  const tables = new Map<string, Uint8Array>();

  for (let i = 0; i < view.getUint16(12); i++) {
    const entry = 44 + i * 20;
    const tag = String.fromCharCode(...woff.subarray(entry, entry + 4));
    const offset = view.getUint32(entry + 4);
    const packed = woff.subarray(offset, offset + view.getUint32(entry + 8));
    const length = view.getUint32(entry + 12);

    tables.set(tag, packed.length < length ? new Uint8Array(inflateSync(packed)) : packed);
  }

  return tables;
}

function bounds(code: number) {
  const points = tuiGlyphs().get(code)!.flat();

  return {
    left: Math.min(...points.map(([x]) => x)),
    right: Math.max(...points.map(([x]) => x)),
    bottom: Math.min(...points.map(([, y]) => y)),
    top: Math.max(...points.map(([, y]) => y)),
  };
}

describe('шрифт глифов TUI', () => {
  it('файл в репозитории собран из текущего генератора', () => {
    const committed = woffTables(new Uint8Array(readFileSync(WOFF_PATH)));
    const generated = sfntTables(buildTtf());

    expect([...committed.keys()]).toEqual([...generated.keys()]);

    for (const [tag, data] of generated) expect(committed.get(tag), tag).toEqual(data);
  });

  it('покрывает псевдографику, блоки, брайль и стрелки Powerline целиком', () => {
    const codes = [...tuiGlyphs().keys()];
    const range = (from: number, to: number) =>
      Array.from({ length: to - from + 1 }, (_, i) => from + i);

    expect(codes).toEqual([
      ...range(0x2500, 0x259f),
      ...range(0x2800, 0x28ff),
      ...range(0xe0b0, 0xe0bf),
    ]);
  });

  it('линии доходят до краёв клетки и выходят за строку — соседние знаки стыкуются', () => {
    const cross = bounds(0x253c);

    expect(cross.left).toBeLessThanOrEqual(0);
    expect(cross.right).toBeGreaterThanOrEqual(600);
    expect(cross.bottom).toBeLessThan(-300);
    expect(cross.top).toBeGreaterThan(1020);
  });

  it('полный блок закрывает клетку и не заходит на соседнюю строку дальше захода от шва', () => {
    const full = bounds(0x2588);

    expect(full.left).toBeLessThanOrEqual(0);
    expect(full.right).toBeGreaterThanOrEqual(600);
    expect(full.bottom).toBeGreaterThanOrEqual(-320);
    expect(full.top).toBeLessThanOrEqual(1040);
  });

  it('у знака брайля столько точек, сколько битов в коде', () => {
    const glyphs = tuiGlyphs();

    expect(glyphs.get(0x2800)).toHaveLength(0);
    expect(glyphs.get(0x2801)).toHaveLength(1);
    expect(glyphs.get(0x28ff)).toHaveLength(8);
  });
});
