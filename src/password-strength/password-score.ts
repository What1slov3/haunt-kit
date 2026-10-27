/*
 * Оценка надёжности пароля без внешних словарей — грубая, но честная: это подсказка при вводе, а не
 * проверка на сервере. Считаем «биты»: длина × log2(алфавит), где длина — эффективная: символы в
 * последовательностях (`abc`, `123`, `qwerty`, `йцукен`), повторах (`aaa`, `abab`) и частых словах
 * весят четверть. Частый пароль целиком — почти ноль, сколько бы цифр к нему ни приписали.
 */

export type PasswordScore = 0 | 1 | 2 | 3 | 4;

export type PasswordHint =
  | 'common'
  | 'personal'
  | 'tooShort'
  | 'sequence'
  | 'repeat'
  | 'mixCase'
  | 'digits'
  | 'symbols'
  | 'longer';

export interface PasswordScoreOptions {
  /** Короче — не больше «слабого» и подсказка «слишком короткий»; по умолчанию 8 */
  minLength?: number;
  /** Имя, ник, почта: пароль с ними внутри слабее */
  userInputs?: readonly string[];
  /** Сколько подсказок вернуть, самые важные первыми; по умолчанию 3 */
  maxHints?: number;
}

export interface PasswordStrengthResult {
  score: PasswordScore;
  /** Что улучшить, по важности; у надёжного — пусто */
  hints: PasswordHint[];
  /** Оценка энтропии в битах — для тестов и своих порогов */
  bits: number;
}

/*
 * Небольшой встроенный список: самые частые пароли из утечек, русские слова и они же, набранные в
 * английской раскладке (`gfhjkm` — «пароль»). Цифры по краям и замены `0 → o` снимаются до сравнения.
 */
const COMMON = new Set([
  '123456',
  '1234567',
  '12345678',
  '123456789',
  '1234567890',
  '111111',
  '000000',
  '123123',
  '654321',
  '666666',
  '121212',
  '112233',
  '159753',
  '147258',
  '123321',
  '7777777',
  'password',
  'qwerty',
  'qwertyuiop',
  '1q2w3e4r',
  '1q2w3e',
  '1qaz2wsx',
  'zaq12wsx',
  'qazwsx',
  'asdfgh',
  'asdfghjkl',
  'zxcvbn',
  'zxcvbnm',
  'iloveyou',
  'admin',
  'administrator',
  'root',
  'login',
  'welcome',
  'letmein',
  'monkey',
  'dragon',
  'master',
  'shadow',
  'sunshine',
  'princess',
  'football',
  'baseball',
  'soccer',
  'superman',
  'batman',
  'starwars',
  'trustno',
  'hello',
  'freedom',
  'whatever',
  'michael',
  'charlie',
  'jordan',
  'hunter',
  'killer',
  'secret',
  'abc',
  'test',
  'guest',
  'default',
  'changeme',
  'access',
  'flower',
  'cheese',
  'pokemon',
  'minecraft',
  'matrix',
  'internet',
  'computer',
  'samsung',
  'google',
  'love',
  'lovely',
  'summer',
  'winter',
  'angel',
  'qwer',
  'pass',
  'haunt',
  'discord',
  'пароль',
  'йцукен',
  'йцукенг',
  'привет',
  'любовь',
  'люблю',
  'солнце',
  'наташа',
  'максим',
  'марина',
  'андрей',
  'кошка',
  'котик',
  'gfhjkm',
  'ghbdtn',
  'ktnj',
  'natasha',
  'maxim',
  'marina',
  'andrey',
  'solnce',
  'lubov',
  'privet',
  'parol',
  'qwerty123',
]);

const LEET: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  $: 's',
  '!': 'i',
};

/** Ряды клавиатуры и алфавиты: три соседних символа подряд — последовательность */
const SEQUENCES = [
  'abcdefghijklmnopqrstuvwxyz',
  'абвгдеёжзийклмнопрстуфхцчшщъыьэюя',
  '01234567890',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
  'йцукенгшщзхъ',
  'фывапролджэ',
  'ячсмитьбю',
  '1qaz2wsx3edc4rfv',
];

const MIN_RUN = 3;
const WEAK_WEIGHT = 0.25;

/** Пороги в битах для оценок 1–4 */
const THRESHOLDS = [25, 40, 52, 70] as const;

/** Короче этого — не больше «хорошего»: длина важнее экзотики */
const STRONG_LENGTH = 12;

const SAFE_LENGTH = 16;

function deLeet(text: string): string {
  return Array.from(text, (char) => LEET[char] ?? char).join('');
}

/** Цифры и знаки по краям: `password123!` → `password` */
const stripEdges = (text: string) => text.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');

/** Частый пароль под приписками и заменами: `P@ssw0rd2024`, `4dmin` */
function isCommon(lower: string): boolean {
  const candidates = [
    lower,
    stripEdges(lower),
    deLeet(stripEdges(lower)),
    stripEdges(deLeet(lower)),
  ];

  return candidates.some((candidate) => candidate.length >= 3 && COMMON.has(candidate));
}

/** Отметить символы [start, end) как слабые */
function mark(weak: boolean[], start: number, end: number) {
  for (let index = start; index < end; index++) weak[index] = true;
}

function markSequences(chars: string[], weak: boolean[]): boolean {
  let found = false;

  for (let start = 0; start < chars.length - 1;) {
    let end = start + 1;
    let direction = 0;

    while (end < chars.length) {
      const step = SEQUENCES.reduce<number>((result, line) => {
        if (result) return result;

        const from = line.indexOf(chars[end - 1]!);
        const to = line.indexOf(chars[end]!);

        return from >= 0 && to >= 0 && Math.abs(to - from) === 1 ? to - from : 0;
      }, 0);

      if (!step || (direction && step !== direction)) break;

      direction = step;
      end++;
    }

    if (end - start >= MIN_RUN) {
      mark(weak, start, end);
      found = true;
      start = end;
    } else {
      start++;
    }
  }

  return found;
}

function markRepeats(chars: string[], weak: boolean[]): boolean {
  let found = false;

  // Один символ трижды и больше
  for (let start = 0; start < chars.length;) {
    let end = start + 1;

    while (end < chars.length && chars[end] === chars[start]) end++;

    if (end - start >= MIN_RUN) {
      mark(weak, start, end);
      found = true;
    }

    start = end;
  }

  // Кусок от двух символов, повторённый подряд: `abab`, `123123`; первое вхождение остаётся «честным».
  // Перебор кубический — только по первым 64 символам: пароли длиннее и так надёжны
  const limit = Math.min(chars.length, 64);

  for (let size = 2; size <= Math.floor(limit / 2); size++) {
    for (let start = 0; start + size * 2 <= limit; start++) {
      const chunk = chars.slice(start, start + size).join('\u0000');
      let end = start + size;

      while (end + size <= limit && chars.slice(end, end + size).join('\u0000') === chunk) {
        end += size;
      }

      if (end > start + size) {
        mark(weak, start + size, end);
        found = true;
      }
    }
  }

  return found;
}

function markWords(lower: string[], words: Iterable<string>, weak: boolean[]): boolean {
  const text = deLeet(lower.join(''));
  let found = false;

  for (const word of words) {
    if (word.length < 4) continue;

    let from = text.indexOf(word);

    while (from !== -1) {
      mark(weak, from, from + word.length);
      found = true;
      from = text.indexOf(word, from + word.length);
    }
  }

  return found;
}

function poolSize(chars: readonly string[]): number {
  let pool = 0;

  if (chars.some((char) => /[a-z]/.test(char))) pool += 26;
  if (chars.some((char) => /[A-Z]/.test(char))) pool += 26;
  if (chars.some((char) => /\p{L}/u.test(char) && !/[a-zA-Z]/.test(char))) pool += 33;
  if (chars.some((char) => /\p{N}/u.test(char))) pool += 10;
  if (chars.some((char) => !/[\p{L}\p{N}]/u.test(char))) pool += 33;

  return Math.max(pool, 1);
}

function scoreFromBits(bits: number): PasswordScore {
  return THRESHOLDS.filter((threshold) => bits >= threshold).length as PasswordScore;
}

const HINT_ORDER: readonly PasswordHint[] = [
  'common',
  'personal',
  'tooShort',
  'sequence',
  'repeat',
  'mixCase',
  'digits',
  'symbols',
  'longer',
];

/** Оценка 0–4 (очень слабый → надёжный) и подсказки, что улучшить */
export function scorePassword(
  password: string,
  options: PasswordScoreOptions = {},
): PasswordStrengthResult {
  const { minLength = 8, userInputs = [], maxHints = 3 } = options;
  const chars = Array.from(password);

  if (chars.length === 0) return { score: 0, hints: [], bits: 0 };

  const lowerChars = chars.map((char) => char.toLocaleLowerCase());
  const lower = lowerChars.join('');
  const weak = chars.map(() => false);
  const found = new Set<PasswordHint>();
  const common = isCommon(lower);
  const inputs = userInputs
    .flatMap((input) => input.toLocaleLowerCase().split(/[\s@._-]+/))
    .filter((input) => input.length >= 3);

  if (markSequences(lowerChars, weak)) found.add('sequence');
  if (markRepeats(chars, weak)) found.add('repeat');
  if (markWords(lowerChars, COMMON, weak) || common) found.add('common');
  if (markWords(lowerChars, inputs, weak)) found.add('personal');

  const weakCount = weak.filter(Boolean).length;
  const effective = chars.length - weakCount * (1 - WEAK_WEIGHT);
  let bits = effective * Math.log2(poolSize(chars));

  if (common) bits = Math.min(bits, 10);

  let score = scoreFromBits(bits);

  if (chars.length < minLength) {
    found.add('tooShort');
    score = Math.min(score, 1) as PasswordScore;
  }

  if (chars.length < STRONG_LENGTH) score = Math.min(score, 3) as PasswordScore;

  if (score === 4) return { score, hints: [], bits };

  const letters = chars.filter((char) => /\p{L}/u.test(char));
  const hasUpper = letters.some((char) => char !== char.toLocaleLowerCase());
  const hasLower = letters.some((char) => char !== char.toLocaleUpperCase());

  if (letters.length > 0 && !(hasUpper && hasLower)) found.add('mixCase');
  if (!chars.some((char) => /\p{N}/u.test(char))) found.add('digits');
  if (!chars.some((char) => !/[\p{L}\p{N}]/u.test(char))) found.add('symbols');
  if (chars.length < SAFE_LENGTH) found.add('longer');

  return { score, hints: HINT_ORDER.filter((hint) => found.has(hint)).slice(0, maxHints), bits };
}
