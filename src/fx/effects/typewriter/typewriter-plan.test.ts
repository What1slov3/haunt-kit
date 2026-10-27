import { describe, expect, it } from 'vitest';

import { planTypewriter, typedText, typewriterFrame } from './typewriter-plan';

const timing = { typeMs: 10, deleteMs: 5, holdMs: 100, startDelay: 0, loop: false };

describe('typewriterFrame', () => {
  it('одна строка: символ за typeMs, в конце — done со всей строкой', () => {
    const plan = planTypewriter(['абв'], timing);

    expect(typewriterFrame(plan, 0)).toEqual({ index: 0, count: 0, phase: 'typing' });
    expect(typewriterFrame(plan, 10).count).toBe(1);
    expect(typewriterFrame(plan, 25).count).toBe(2);
    expect(typewriterFrame(plan, 30)).toEqual({ index: 0, count: 3, phase: 'done' });
    expect(typewriterFrame(plan, 10_000).phase).toBe('done');
  });

  it('до startDelay — ничего', () => {
    const plan = planTypewriter(['да'], { ...timing, startDelay: 50 });

    expect(typewriterFrame(plan, 40)).toEqual({ index: 0, count: 0, phase: 'waiting' });
    expect(typewriterFrame(plan, 60).count).toBe(1);
  });

  it('после знака препинания — пауза', () => {
    const plan = planTypewriter(['а, б'], timing);

    // «а» 10, «,» 20, « » — после запятой: 20 + 10 + 50
    expect(typedText(plan, typewriterFrame(plan, 75))).toBe('а,');
    expect(typedText(plan, typewriterFrame(plan, 80))).toBe('а, ');
  });

  it('несколько строк: держит, стирает и печатает следующую; последнюю не стирает', () => {
    const plan = planTypewriter(['аб', 'вг'], timing);

    expect(typewriterFrame(plan, 50).phase).toBe('holding');
    expect(typewriterFrame(plan, 120)).toEqual({ index: 0, count: 1, phase: 'deleting' });
    expect(typewriterFrame(plan, 125)).toEqual({ index: 0, count: 0, phase: 'deleting' });
    expect(typewriterFrame(plan, 140)).toEqual({ index: 1, count: 1, phase: 'typing' });
    expect(typewriterFrame(plan, 10_000)).toEqual({ index: 1, count: 2, phase: 'done' });
  });

  it('loop — после последней строки снова первая', () => {
    const plan = planTypewriter(['а', 'б'], { ...timing, loop: true });

    expect(plan.cycle).toBe(2 * (10 + 100 + 5));
    expect(typewriterFrame(plan, plan.cycle + 10)).toEqual({
      index: 0,
      count: 1,
      phase: 'holding',
    });
  });

  it('эмодзи печатается целиком', () => {
    const plan = planTypewriter(['ok👍🏽'], timing);

    expect(typedText(plan, typewriterFrame(plan, 30))).toBe('ok👍🏽');
    expect(typedText(plan, typewriterFrame(plan, 25))).toBe('ok');
  });
});
