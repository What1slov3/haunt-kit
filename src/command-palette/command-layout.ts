/*
 * Набрано не в той раскладке: «yfcnhjqrb» — это «настройки», «пщщпду» — «google». Таблица — физические
 * клавиши QWERTY ↔ ЙЦУКЕН, включая клавиши знаков, на которых в русской раскладке буквы (х ъ ж э б ю ё).
 */

const EN = '`qwertyuiop[]asdfghjkl;\'zxcvbnm,.~QWERTYUIOP{}ASDFGHJKL:"ZXCVBNM<>';
const RU = 'ёйцукенгшщзхъфывапролджэячсмитьбюЁЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮ';

const EN_TO_RU = new Map([...EN].map((char, i) => [char, RU[i]!]));
const RU_TO_EN = new Map([...RU].map((char, i) => [char, EN[i]!]));

/** Латиница по клавишам — в кириллицу; что не на буквенных клавишах (цифры, пробел), остаётся как есть */
export function toRussianLayout(text: string): string {
  return [...text].map((char) => EN_TO_RU.get(char) ?? char).join('');
}

/** Кириллица по клавишам — в латиницу */
export function toEnglishLayout(text: string): string {
  return [...text].map((char) => RU_TO_EN.get(char) ?? char).join('');
}

const LATIN = /[a-z]/i;
const CYRILLIC = /[а-яё]/i;

/**
 * Запрос, каким он был бы в другой раскладке, или null, если переводить нечего. Смешанный запрос
 * («nastrojki в») не переводится: так набирают нарочно, а не по ошибке.
 */
export function switchLayout(query: string): string | null {
  const latin = LATIN.test(query);
  const cyrillic = CYRILLIC.test(query);

  if (latin === cyrillic) return null;

  const switched = latin ? toRussianLayout(query) : toEnglishLayout(query);

  return switched === query ? null : switched;
}
