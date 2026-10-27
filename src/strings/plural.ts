/**
 * Формы слова по числу для `plural`. `other` обязательна: в английском это «много», в русском — дроби
 * (1,5 участника); остальные формы — какие есть в языке (ru: one / few / many, en: one).
 */
export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

const rules = new Map<string, Intl.PluralRules>();

function rulesFor(locale: string): Intl.PluralRules {
  let found = rules.get(locale);

  if (!found) {
    found = new Intl.PluralRules(locale);
    rules.set(locale, found);
  }

  return found;
}

/**
 * Форма слова по числу по правилам языка: `plural('ru', 5, { one: 'файл', few: 'файла', many: 'файлов',
 * other: 'файла' })` → «файлов». Нет нужной формы — `other`.
 */
export function plural(locale: string, count: number, forms: PluralForms): string {
  return forms[rulesFor(locale).select(count)] ?? forms.other;
}
