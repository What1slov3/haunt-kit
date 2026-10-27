/*
 * Вход `@haunt/ui/sound` — синтезированные звуки интерфейса на Web Audio, без файлов (волна 3,
 * раздел 2.5). Выключены по умолчанию (`data-sound="off"`); AudioContext — только после жеста; синтез
 * и контекст — отдельным чанком через import(). Кит звуки сам не включает: подключение к компонентам —
 * решение приложения (`useSound`, `SoundSlot`).
 */

export { sound, type PlayEvent, type PlayOptions, type PlayResult } from './sound';
export { useSound } from './use-sound';
export { SoundSlot, type SoundSlotProps } from './sound-slot';
export { SoundDesigner, type SoundDesignerProps } from './sound-designer';
export {
  checkSound,
  DESIGN_LIMITS,
  normalizeGain,
  peakGain,
  randomSound,
  seededRandom,
  seedFromText,
  SOUND_MOODS,
  totalGain,
  type SoundIssue,
  type SoundIssueCode,
  type SoundMood,
} from './sound-design';
export {
  DEFAULT_SCALE,
  INSTRUMENTS,
  instrumentVoices,
  MOTIF_ROOM,
  randomMotif,
  randomSequence,
  rescale,
  sequenceSound,
  sequenceVoices,
  stepSeconds,
  toggleStepNote,
  type Instrument,
  type SequenceSpec,
} from './sequence';
export {
  foldIntoRange,
  frequencyToMidi,
  inScale,
  midiToFrequency,
  noteName,
  PITCH_CLASSES,
  quantize,
  SCALE_NAMES,
  SCALE_OCTAVES,
  scaleNotes,
  SCALES,
  transposition,
  type ScaleName,
  type ScaleSpec,
} from './music';
export {
  driveCurve,
  impulseResponse,
  noiseSamples,
  pulseCoefficients,
  type RoomShape,
} from './dsp';
export { isAudible, LEVEL_GAIN, readSoundLevel, SOUND_LEVELS, type SoundLevel } from './level';
export {
  malletVoices,
  PENTATONIC,
  SOUND_NAMES,
  SOUNDS,
  soundDuration,
  soundLength,
  soundTail,
  type EchoSpec,
  type FilterSpec,
  type FmSpec,
  type Lfo,
  type NoiseColor,
  type NoiseVoice,
  type RoomSpec,
  type SoundCategory,
  type SoundName,
  type SoundSpec,
  type ToneVoice,
  type Voice,
  type Wave,
} from './sounds';
export {
  envelopeAt,
  envelopeDuration,
  envelopeSteps,
  type Envelope,
  type EnvelopeStep,
} from './envelope';
export { createLimiter, type Limiter, type LimiterOptions, type LimitReason } from './limiter';

/** Синтез в OfflineAudioContext без проигрывания (форма волны, проверки) — отдельным чанком */
export const loadSynth = () => import('./synth');
