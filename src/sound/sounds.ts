import { envelopeDuration, type Envelope } from './envelope';

/*
 * Звуки интерфейса — данными: генераторы, шум, фильтры и огибающие. Характер — тактильный, как у
 * стекла и дерева под пальцем: низкий и средний регистр (основные тоны 300–800 Гц), мягкая атака,
 * удары с коротким спадом высоты, без писка в 2–4 кГц, где ухо слышит громче всего, и без
 * «электронных» прямоугольников. Звук должен ложиться под интерфейс, а не поверх него. Громкости —
 * доли пика до уровня и лимитера; сумма голосов звука ≤ 1.
 */

export const SOUND_NAMES = [
  'click',
  'hover',
  'send',
  'mention',
  'voice-join',
  'voice-leave',
  'error',
  'success',
  'message',
  'reaction',
  'toggle-on',
  'toggle-off',
  'open',
  'close',
  'delete',
  'warning',
  'mute',
  'unmute',
  'screen-start',
  'screen-stop',
  'level-up',
  'copy',
  'drop',
  'ring',
] as const;

export type SoundName = (typeof SOUND_NAMES)[number];

/** Медленное покачивание параметра: частота качания и глубина (в единицах того, что качается) */
export interface Lfo {
  /** Гц */
  rate: number;
  depth: number;
}

export interface FilterSpec {
  type: BiquadFilterType;
  frequency: number;
  q?: number;
  /** Качание среза: глубина — доля частоты 0…1 («вау» у шума и тона) */
  lfo?: Lfo;
}

/** pulse — прямоугольник с шириной `pulseWidth`: от «пустого» 0.5 до «носового» 0.1 */
export type Wave = Exclude<OscillatorType, 'custom'> | 'pulse';

/** Частотная модуляция: второй синус качает частоту голоса — колокол, металл, стекло */
export interface FmSpec {
  /** Частота модулятора — доля частоты голоса: целые — гармонично, дробные — металл */
  ratio: number;
  /** Индекс модуляции в начале: 0 — чистый тон, 2–5 — колокол */
  depth: number;
  /** Индекс к концу огибающей; по умолчанию как `depth`. Спадающий индекс — удар, который «темнеет» */
  depthEnd?: number;
}

interface VoiceBase {
  /** Задержка от начала звука, с */
  delay?: number;
  gain: number;
  envelope: Envelope;
  /** Тремоло: глубина 0…1 — насколько проседает громкость */
  tremolo?: Lfo;
  /** Перегруз 0…1: мягкое насыщение, к единице — хрип */
  drive?: number;
}

export interface ToneVoice extends VoiceBase {
  kind: 'tone';
  wave: Wave;
  /** Ширина импульса у `pulse`, 0.05…0.95; по умолчанию 0.5 */
  pulseWidth?: number;
  /** Гц */
  frequency: number;
  /** Скольжение к частоте за время огибающей до конца спада */
  glideTo?: number;
  fm?: FmSpec;
  /** Вибрато: глубина в центах (100 — полутон) */
  vibrato?: Lfo;
  filter?: FilterSpec;
}

/** white — шипение, pink — ровный «дождь», brown — глухой рокот */
export type NoiseColor = 'white' | 'pink' | 'brown';

export interface NoiseVoice extends VoiceBase {
  kind: 'noise';
  color?: NoiseColor;
  filter: FilterSpec;
}

export type Voice = ToneVoice | NoiseVoice;

/**
 * Помещение звука — импульсная характеристика, собранная по параметрам (`impulseResponse`): ранние
 * отражения и диффузный хвост. Звучит поверх общего короткого помещения движка
 */
export interface RoomSpec {
  /** Длина хвоста до −60 дБ, с */
  decay: number;
  /** Пауза до первых отражений, с: больше — зал крупнее */
  preDelay?: number;
  /** 0 — тёмный хвост (ковёр, дерево), 1 — светлый (кафель, стекло) */
  brightness?: number;
  /** Ширина стерео 0…1 */
  width?: number;
  /** Доля отражённого звука 0…1 */
  mix: number;
}

/** Эхо — задержка с повторами: каждый следующий тише на `feedback` и темнее на `tone` */
export interface EchoSpec {
  /** Между повторами, с */
  time: number;
  /** 0…0.9 */
  feedback: number;
  /** Срез верха в петле, Гц: повторы темнеют, как в настоящем эхе */
  tone?: number;
  mix: number;
}

/** ui — звук интерфейса до 0,5 с; motif — мотив до 3 с: награда, вход, звонок, событие */
export type SoundCategory = 'ui' | 'motif';

export interface SoundSpec {
  /** По умолчанию ui. Мотивы прореживаются отдельно и не отнимают голоса у интерфейса */
  category?: SoundCategory;
  /** subtle — звучит и на тихом уровне; on — только на полном (щелчки и наведение — их много) */
  minLevel: 'subtle' | 'on';
  /** Не чаще, мс */
  minInterval: number;
  voices: Voice[];
  room?: RoomSpec;
  echo?: EchoSpec;
}

/*
 * Удар мягкой колотушкой: синус с лёгким спадом высоты (как у настоящего удара) и тихий четвёртый
 * обертон, который гаснет за 25 мс — даёт «дерево», а не «пищалку». Обертон в 4 раза выше
 * основного тона, поэтому основной держим ниже 800 Гц: иначе обертон уходит в 3–4 кГц.
 */
export function malletVoices(
  frequency: number,
  gain: number,
  decay: number,
  delay = 0,
): ToneVoice[] {
  return [
    {
      kind: 'tone',
      wave: 'sine',
      frequency,
      glideTo: frequency * 0.985,
      delay,
      gain,
      envelope: { attack: 0.005, hold: 0.008, decay },
    },
    {
      kind: 'tone',
      wave: 'sine',
      frequency: frequency * 4,
      delay,
      gain: gain * 0.12,
      envelope: { attack: 0.002, decay: 0.025 },
    },
  ];
}

const mallet = malletVoices;

/**
 * Ноты соль-мажорной пентатоники от D4 до B5: сыгранные подряд или вместе, они не спорят. Из них собраны
 * звуки набора и случайные мотивы генератора. Ошибка — вне неё нарочно
 */
export const PENTATONIC = {
  D4: 293.66,
  E4: 329.63,
  G4: 392,
  A4: 440,
  B4: 493.88,
  D5: 587.33,
  E5: 659.26,
  G5: 783.99,
  A5: 880,
  B5: 987.77,
} as const;

const { G4, B4, D5, E5, G5 } = PENTATONIC;

export const SOUNDS: Record<SoundName, SoundSpec> = {
  // Тап по стеклу: короткий тон с быстрым спадом и мягкий шорох в середине диапазона, без шипения
  click: {
    minLevel: 'on',
    minInterval: 40,
    voices: [
      {
        kind: 'tone',
        wave: 'sine',
        frequency: 640,
        glideTo: 470,
        gain: 0.26,
        envelope: { attack: 0.003, decay: 0.035 },
      },
      {
        kind: 'noise',
        gain: 0.08,
        envelope: { attack: 0.001, decay: 0.012 },
        filter: { type: 'bandpass', frequency: 1800, q: 0.8 },
      },
    ],
  },
  // На грани слышимого: тик около 1 кГц — там ухо заметно глуше, чем на прежних 3 кГц
  hover: {
    minLevel: 'on',
    minInterval: 70,
    voices: [
      {
        kind: 'tone',
        wave: 'sine',
        frequency: 1050,
        glideTo: 900,
        gain: 0.05,
        envelope: { attack: 0.004, decay: 0.018 },
      },
    ],
  },
  // Отправка: «пузырь» вверх на квинту, мягкая точка октавой выше и выдох воздуха
  send: {
    minLevel: 'subtle',
    minInterval: 120,
    voices: [
      {
        kind: 'tone',
        wave: 'sine',
        frequency: G4,
        glideTo: D5,
        gain: 0.34,
        envelope: { attack: 0.006, decay: 0.07 },
      },
      {
        kind: 'tone',
        wave: 'sine',
        frequency: G5,
        delay: 0.05,
        gain: 0.14,
        envelope: { attack: 0.004, decay: 0.07 },
      },
      {
        kind: 'noise',
        gain: 0.05,
        envelope: { attack: 0.012, decay: 0.05 },
        filter: { type: 'bandpass', frequency: 1200, q: 0.7 },
      },
    ],
  },
  // Упоминание: «динь-дон» вниз на кварту, как дверной звонок: заметно, но без звона
  mention: {
    minLevel: 'subtle',
    minInterval: 400,
    voices: [...mallet(G5, 0.3, 0.16), ...mallet(D5, 0.3, 0.22, 0.12)],
  },
  // Вход в голос: два чистых тона вверх в нижнем регистре, выход — те же вниз
  'voice-join': {
    minLevel: 'subtle',
    minInterval: 300,
    voices: [G4, D5].map((frequency, i) => ({
      kind: 'tone' as const,
      wave: 'sine' as const,
      frequency,
      delay: i * 0.09,
      gain: 0.32,
      envelope: { attack: 0.012, decay: 0.16 },
    })),
  },
  'voice-leave': {
    minLevel: 'subtle',
    minInterval: 300,
    voices: [D5, G4].map((frequency, i) => ({
      kind: 'tone' as const,
      wave: 'sine' as const,
      frequency,
      delay: i * 0.09,
      gain: 0.32,
      envelope: { attack: 0.012, decay: 0.16 },
    })),
  },
  /*
   * Ошибка: два глухих удара вниз (ми-бемоль — си-бемоль). У треугольника только нечётные
   * гармоники, и они тише, чем у прямоугольника, а фильтр на 1,3 кГц срезает и их: звучит как стук
   * в дерево, а не как зуммер. Ниже 400 Гц не опускаемся: динамики ноутбука там почти немы.
   */
  error: {
    minLevel: 'subtle',
    minInterval: 300,
    voices: [622.25, 466.16].map((frequency, i) => ({
      kind: 'tone' as const,
      wave: 'triangle' as const,
      frequency,
      glideTo: frequency * 0.94,
      delay: i * 0.12,
      gain: 0.36,
      envelope: { attack: 0.004, hold: 0.02, decay: 0.09 },
      filter: { type: 'lowpass' as const, frequency: 1300, q: 0.5 },
    })),
  },
  // Успех: мажорное трезвучие вверх теми же колотушками, быстрее и светлее входа в голос
  success: {
    minLevel: 'subtle',
    minInterval: 300,
    voices: [
      ...mallet(G4, 0.24, 0.1),
      ...mallet(B4, 0.24, 0.1, 0.06),
      ...mallet(D5, 0.26, 0.2, 0.12),
    ],
  },
  // Сообщение в другом канале или в личке: одна мягкая нота — заметно, но не зовёт, как упоминание
  message: {
    minLevel: 'subtle',
    minInterval: 400,
    voices: mallet(E5, 0.28, 0.14),
  },
  // Реакция: крошечный «пузырь» вверх — их ставят часто, поэтому только на полном уровне
  reaction: {
    minLevel: 'on',
    minInterval: 60,
    voices: [
      {
        kind: 'tone',
        wave: 'sine',
        frequency: 520,
        glideTo: 780,
        gain: 0.2,
        envelope: { attack: 0.003, decay: 0.04 },
      },
    ],
  },
  // Переключатели: два коротких тика — вверх включает, вниз выключает
  'toggle-on': {
    minLevel: 'on',
    minInterval: 80,
    voices: [D5, G5].map((frequency, i) => ({
      kind: 'tone' as const,
      wave: 'sine' as const,
      frequency,
      delay: i * 0.045,
      gain: 0.18,
      envelope: { attack: 0.003, decay: 0.03 },
    })),
  },
  'toggle-off': {
    minLevel: 'on',
    minInterval: 80,
    voices: [G5, D5].map((frequency, i) => ({
      kind: 'tone' as const,
      wave: 'sine' as const,
      frequency,
      delay: i * 0.045,
      gain: 0.18,
      envelope: { attack: 0.003, decay: 0.03 },
    })),
  },
  // Открыть панель или поповер: выдох воздуха и тон вверх; закрыть — то же вниз
  open: {
    minLevel: 'on',
    minInterval: 120,
    voices: [
      {
        kind: 'noise',
        gain: 0.08,
        envelope: { attack: 0.03, decay: 0.09 },
        filter: { type: 'bandpass', frequency: 900, q: 0.6 },
      },
      {
        kind: 'tone',
        wave: 'sine',
        frequency: G4,
        glideTo: D5,
        gain: 0.12,
        envelope: { attack: 0.02, decay: 0.08 },
      },
    ],
  },
  close: {
    minLevel: 'on',
    minInterval: 120,
    voices: [
      {
        kind: 'noise',
        gain: 0.07,
        envelope: { attack: 0.01, decay: 0.07 },
        filter: { type: 'bandpass', frequency: 700, q: 0.6 },
      },
      {
        kind: 'tone',
        wave: 'sine',
        frequency: D5,
        glideTo: G4,
        gain: 0.12,
        envelope: { attack: 0.01, decay: 0.07 },
      },
    ],
  },
  // Удалить: глухой стук вниз под фильтром и шорох — «ушло в корзину», без тревоги ошибки
  delete: {
    minLevel: 'subtle',
    minInterval: 200,
    voices: [
      {
        kind: 'tone',
        wave: 'triangle',
        frequency: G4,
        glideTo: 294,
        gain: 0.3,
        envelope: { attack: 0.004, hold: 0.01, decay: 0.07 },
        filter: { type: 'lowpass', frequency: 900, q: 0.5 },
      },
      {
        kind: 'noise',
        gain: 0.08,
        envelope: { attack: 0.002, decay: 0.03 },
        filter: { type: 'bandpass', frequency: 600, q: 0.7 },
      },
    ],
  },
  // Предупреждение: два одинаковых удара — «внимание», не «плохо»: ошибка идёт вниз, это стоит на месте
  warning: {
    minLevel: 'subtle',
    minInterval: 400,
    voices: [...mallet(D5, 0.24, 0.1), ...mallet(D5, 0.24, 0.12, 0.13)],
  },
  // Микрофон: выключить — тон вниз, включить — вверх; коротко, их жмут на ходу разговора
  mute: {
    minLevel: 'subtle',
    minInterval: 150,
    voices: [
      {
        kind: 'tone',
        wave: 'sine',
        frequency: B4,
        glideTo: G4,
        gain: 0.26,
        envelope: { attack: 0.006, decay: 0.06 },
      },
    ],
  },
  unmute: {
    minLevel: 'subtle',
    minInterval: 150,
    voices: [
      {
        kind: 'tone',
        wave: 'sine',
        frequency: G4,
        glideTo: B4,
        gain: 0.26,
        envelope: { attack: 0.006, decay: 0.06 },
      },
    ],
  },
  // Демонстрация экрана: быстрое арпеджио колотушками вверх — «вас видят»; конец — то же вниз и тише
  'screen-start': {
    minLevel: 'subtle',
    minInterval: 400,
    voices: [
      ...mallet(G4, 0.2, 0.08),
      ...mallet(D5, 0.2, 0.08, 0.05),
      ...mallet(G5, 0.2, 0.14, 0.1),
    ],
  },
  'screen-stop': {
    minLevel: 'subtle',
    minInterval: 400,
    voices: [
      ...mallet(G5, 0.16, 0.08),
      ...mallet(D5, 0.16, 0.08, 0.05),
      ...mallet(G4, 0.16, 0.14, 0.1),
    ],
  },
  // Новый уровень: четыре ноты вверх до октавы — праздник, но короче полсекунды
  'level-up': {
    minLevel: 'subtle',
    minInterval: 800,
    voices: [
      ...mallet(G4, 0.19, 0.09),
      ...mallet(B4, 0.19, 0.09, 0.07),
      ...mallet(D5, 0.19, 0.09, 0.14),
      ...mallet(G5, 0.19, 0.22, 0.21),
    ],
  },
  // Скопировано: самый тихий тик набора — подтверждение, а не событие
  copy: {
    minLevel: 'on',
    minInterval: 100,
    voices: [
      {
        kind: 'tone',
        wave: 'sine',
        frequency: 880,
        glideTo: 660,
        gain: 0.12,
        envelope: { attack: 0.002, decay: 0.025 },
      },
      {
        kind: 'noise',
        gain: 0.04,
        envelope: { attack: 0.001, decay: 0.01 },
        filter: { type: 'bandpass', frequency: 2000, q: 0.8 },
      },
    ],
  },
  // Файл брошен в зону: мягкий «плюх» вниз — вес у файла есть, у клика нет
  drop: {
    minLevel: 'subtle',
    minInterval: 200,
    voices: [
      {
        kind: 'tone',
        wave: 'sine',
        frequency: G4,
        glideTo: 330,
        gain: 0.3,
        envelope: { attack: 0.004, decay: 0.08 },
      },
      {
        kind: 'noise',
        gain: 0.08,
        envelope: { attack: 0.003, decay: 0.04 },
        filter: { type: 'bandpass', frequency: 500, q: 0.7 },
      },
    ],
  },
  // Входящий вызов: «динь-дон» дважды — один такт звонка; экран повторяет его, пока не ответили
  ring: {
    minLevel: 'subtle',
    minInterval: 800,
    voices: [
      ...mallet(G5, 0.2, 0.1),
      ...mallet(E5, 0.2, 0.12, 0.1),
      ...mallet(G5, 0.2, 0.1, 0.22),
      ...mallet(E5, 0.2, 0.12, 0.32),
    ],
  },
};

/** Длина звука, с: последний голос с задержкой и огибающей; без голосов — 0 */
export function soundDuration(spec: SoundSpec): number {
  return Math.max(
    0,
    ...spec.voices.map((voice) => (voice.delay ?? 0) + envelopeDuration(voice.envelope)),
  );
}

/** Тише этого (−60 дБ) хвост эффекта уже не слышен */
const TAIL_FLOOR = 0.001;

/**
 * Хвост эффектов после последнего голоса, с: помещение — пауза и спад до −60 дБ, эхо — пока повторы
 * не стихнут до −60 дБ
 */
export function soundTail(spec: SoundSpec): number {
  const room = spec.room ? (spec.room.preDelay ?? 0) + spec.room.decay : 0;
  const { echo } = spec;
  let repeats = 0;

  if (echo && echo.mix > 0) {
    const feedback = Math.min(0.9, Math.max(0, echo.feedback));

    repeats =
      feedback > 0
        ? Math.ceil(Math.log(TAIL_FLOOR / Math.min(1, echo.mix)) / Math.log(feedback))
        : 1;
  }

  return Math.max(room, echo ? echo.time * Math.max(1, repeats) : 0);
}

/** Полная длина с хвостом эффектов, с: столько рисует `renderSound` и держит движок */
export function soundLength(spec: SoundSpec): number {
  return soundDuration(spec) + soundTail(spec);
}
