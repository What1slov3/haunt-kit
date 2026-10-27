import { ruStrings } from '../strings/ru';

/** Проверка тега: строка — текст ошибки, пусто — тег подходит */
export type TagValidator = (tag: string, tags: readonly string[]) => string | null | undefined;

export type TagRejectReason = 'duplicate' | 'max' | 'invalid';

export interface TagRejection {
  tag: string;
  reason: TagRejectReason;
  /** Текст ошибки для пользователя; у дубля его нет — дубль подсвечивается, а не ругается */
  message?: string;
}

export interface AddTagsResult {
  tags: string[];
  added: string[];
  rejected: TagRejection[];
}

export interface AddTagsOptions {
  max?: number;
  validate?: TagValidator;
  /** Текст ошибки лимита; по умолчанию русский — компонент передаёт словарь UiStringsProvider */
  maxMessage?: (max: number) => string;
}

/** Вставка «a, b; c» или списка по строкам — отдельные теги без пустых и пробелов по краям */
export function splitTags(text: string): string[] {
  return text
    .split(/[,;\n\r\t]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Дубль ищется без учёта регистра: «Админ» и «админ» — один тег */
export function hasTag(tags: readonly string[], tag: string): boolean {
  const needle = tag.toLocaleLowerCase();

  return tags.some((existing) => existing.toLocaleLowerCase() === needle);
}

/**
 * Добавляет кандидатов по одному: каждый следующий сверяется уже с добавленными, так дубли внутри
 * одной вставки тоже отсеиваются. Порядок проверок — дубль, лимит, валидатор: дубль не должен
 * показывать ошибку лимита, а валидатор не зовётся для того, что всё равно не войдёт.
 */
export function addTags(
  tags: readonly string[],
  candidates: readonly string[],
  { max, validate, maxMessage = ruStrings.tagInput.max }: AddTagsOptions = {},
): AddTagsResult {
  const next = [...tags];
  const added: string[] = [];
  const rejected: TagRejection[] = [];

  for (const raw of candidates) {
    const tag = raw.trim();

    if (!tag) continue;

    if (hasTag(next, tag)) {
      rejected.push({ tag, reason: 'duplicate' });
      continue;
    }

    if (max !== undefined && next.length >= max) {
      rejected.push({ tag, reason: 'max', message: maxMessage(max) });
      continue;
    }

    const message = validate?.(tag, next);

    if (message) {
      rejected.push({ tag, reason: 'invalid', message });
      continue;
    }

    next.push(tag);
    added.push(tag);
  }

  return { tags: next, added, rejected };
}
