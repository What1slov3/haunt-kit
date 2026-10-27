import { describe, expect, it } from 'vitest';

import { SILENCE } from './envelope';
import {
  SOUND_NAMES,
  SOUNDS,
  soundDuration,
  soundTail,
  type SoundSpec,
  type ToneVoice,
} from './sounds';
import { scheduleSound } from './synth';

/*
 * В jsdom нет Web Audio: граф проверяется на записывающем «контексте» — какие узлы созданы, как
 * соединены и что назначено параметрам. Сам звук рисует история в OfflineAudioContext.
 */

interface Call {
  method: string;
  args: unknown[];
}

class FakeParam {
  value = 0;
  calls: Call[] = [];

  setValueAtTime(...args: unknown[]) {
    this.calls.push({ method: 'set', args });
  }

  linearRampToValueAtTime(...args: unknown[]) {
    this.calls.push({ method: 'linear', args });
  }

  exponentialRampToValueAtTime(...args: unknown[]) {
    this.calls.push({ method: 'exponential', args });
  }
}

class FakeNode {
  outputs: unknown[] = [];
  [param: string]: unknown;

  constructor(public kind: string) {}

  connect(node: unknown) {
    this.outputs.push(node);

    return node;
  }
}

class FakeSource extends FakeNode {
  type = '';
  buffer: unknown = null;
  loop = false;
  wave: unknown = null;
  frequency = new FakeParam();
  detune = new FakeParam();
  started: unknown[] = [];
  stopped: number[] = [];

  start(...args: unknown[]) {
    this.started = args;
  }

  stop(at: number) {
    this.stopped.push(at);
  }

  setPeriodicWave(wave: unknown) {
    this.wave = wave;
  }
}

function fakeContext() {
  const nodes: FakeNode[] = [];
  const track = <T extends FakeNode>(node: T) => {
    nodes.push(node);

    return node;
  };

  const ctx = {
    sampleRate: 8000,
    createGain: () => track(Object.assign(new FakeNode('gain'), { gain: new FakeParam() })),
    createOscillator: () => track(new FakeSource('osc')),
    createBufferSource: () => track(new FakeSource('noise')),
    createBiquadFilter: () =>
      track(
        Object.assign(new FakeNode('filter'), {
          type: '',
          frequency: new FakeParam(),
          Q: new FakeParam(),
        }),
      ),
    createWaveShaper: () => track(new FakeNode('shaper')),
    createDelay: () => track(Object.assign(new FakeNode('delay'), { delayTime: new FakeParam() })),
    createConvolver: () => track(new FakeNode('convolver')),
    createPeriodicWave: (real: Float32Array, imag: Float32Array) => ({ real, imag }),
    createBuffer: (_channels: number, length: number) => {
      const data = new Float32Array(length);

      return { getChannelData: () => data };
    },
  };

  return { ctx: ctx as unknown as BaseAudioContext, nodes };
}

const pulseTone: ToneVoice = {
  kind: 'tone',
  wave: 'pulse',
  pulseWidth: 0.25,
  frequency: 220,
  fm: { ratio: 2, depth: 2 },
  gain: 0.3,
  envelope: { attack: 0.005, decay: 0.2 },
};

const spec = (...voices: SoundSpec['voices']): SoundSpec => ({
  minLevel: 'subtle',
  minInterval: 100,
  voices,
});

describe('scheduleSound', () => {
  it('у каждого голоса — источник и усилитель с огибающей; голоса сходятся в выход звука', () => {
    const { ctx, nodes } = fakeContext();
    const destination = new FakeNode('destination') as unknown as AudioNode;
    const { end, tailEnd, output } = scheduleSound(ctx, destination, SOUNDS.send, 1, 0.5);
    const sources = nodes.filter((node) => node instanceof FakeSource);
    const amps = nodes.filter((node) => node.kind === 'gain' && node !== (output as unknown));

    expect(sources).toHaveLength(SOUNDS.send.voices.length);
    expect(amps).toHaveLength(SOUNDS.send.voices.length);
    expect(end).toBeCloseTo(1 + soundDuration(SOUNDS.send));
    expect(tailEnd).toBe(end);
    expect((output as unknown as FakeNode).outputs).toEqual([destination]);

    for (const amp of amps) expect(amp.outputs).toEqual([output]);
  });

  it('задержка голоса сдвигает старт, стоп — после конца огибающей', () => {
    const { ctx, nodes } = fakeContext();

    scheduleSound(ctx, new FakeNode('out') as unknown as AudioNode, SOUNDS.send, 2, 1);

    const [first, second] = nodes.filter((node): node is FakeSource => node instanceof FakeSource);

    expect(first!.started).toEqual([2]);
    expect(second!.started).toEqual([2 + SOUNDS.send.voices[1]!.delay!]);
    expect(first!.stopped[0]).toBeGreaterThan(2 + 0.074);
  });

  it('огибающая — от тишины к пику громкость × доля голоса, без нулей в экспоненте', () => {
    const { ctx, nodes } = fakeContext();

    const { output } = scheduleSound(
      ctx,
      new FakeNode('out') as unknown as AudioNode,
      SOUNDS.hover,
      0,
      0.5,
    );
    // Первый усилитель — выход звука, огибающая — у усилителя голоса
    const gain = nodes.find(
      (node) => node.kind === 'gain' && node !== (output as unknown),
    ) as unknown as { gain: FakeParam };
    const peak = gain.gain.calls.find((call) => call.method === 'linear');

    expect(peak!.args[0]).toBeCloseTo(SOUNDS.hover.voices[0]!.gain * 0.5);

    for (const call of gain.gain.calls.filter((c) => c.method === 'exponential')) {
      expect(call.args[0]).toBeGreaterThanOrEqual(SILENCE);
    }
  });

  it('шум идёт через фильтр, тон без фильтра — напрямую в усилитель', () => {
    const { ctx, nodes } = fakeContext();

    scheduleSound(ctx, new FakeNode('out') as unknown as AudioNode, SOUNDS.click, 0, 1);

    const noise = nodes.find((node) => node.kind === 'noise')!;
    const osc = nodes.find((node) => node.kind === 'osc')!;

    expect((noise.outputs[0] as FakeNode).kind).toBe('filter');
    expect((osc.outputs[0] as FakeNode).kind).toBe('gain');
  });

  it('импульс — своя волна по ряду Фурье, FM — модулятор качает частоту голоса', () => {
    const { ctx, nodes } = fakeContext();

    scheduleSound(ctx, new FakeNode('out') as unknown as AudioNode, spec(pulseTone), 0, 1);

    const [carrier, modulator] = nodes.filter((node): node is FakeSource => node.kind === 'osc');
    const index = nodes.find((node) => modulator!.outputs.includes(node))!;

    expect(carrier!.wave).toMatchObject({ real: expect.any(Float32Array) });
    expect(carrier!.type).toBe('');
    expect(index.outputs).toEqual([carrier!.frequency]);
    expect((index.gain as FakeParam).calls[0]!.args[0]).toBeCloseTo(2 * 220);
  });

  it('шум идёт по кругу — голос длиннее буфера не обрывается', () => {
    const { ctx, nodes } = fakeContext();

    scheduleSound(ctx, new FakeNode('out') as unknown as AudioNode, SOUNDS.click, 0, 1);

    expect((nodes.find((node) => node.kind === 'noise') as FakeSource).loop).toBe(true);
  });

  it('эхо и помещение звука — между голосами и выходом; хвост продлевает конец', () => {
    const { ctx, nodes } = fakeContext();
    const withEffects: SoundSpec = {
      ...spec(pulseTone),
      room: { decay: 0.8, mix: 0.3 },
      echo: { time: 0.2, feedback: 0, mix: 0.4 },
    };
    const { end, tailEnd, output } = scheduleSound(
      ctx,
      new FakeNode('out') as unknown as AudioNode,
      withEffects,
      0,
      1,
    );

    expect(nodes.some((node) => node.kind === 'convolver')).toBe(true);
    expect(nodes.some((node) => node.kind === 'delay')).toBe(true);
    expect(tailEnd - end).toBeCloseTo(soundTail(withEffects));

    // Вход эффектов (первый усилитель после выхода) ведёт и в выход сухим, и в задержку, и в свёртку
    const input = nodes.find((node) => node.kind === 'gain' && node !== (output as unknown))!;

    expect(input.outputs.map((node) => (node as FakeNode).kind)).toEqual([
      'gain',
      'delay',
      'convolver',
    ]);
  });

  it('все звуки короткие и не громче единицы по сумме голосов', () => {
    for (const name of SOUND_NAMES) {
      const spec = SOUNDS[name];

      expect(soundDuration(spec)).toBeLessThan(0.5);
      expect(spec.voices.reduce((sum, voice) => sum + voice.gain, 0)).toBeLessThanOrEqual(1);
    }
  });
});
