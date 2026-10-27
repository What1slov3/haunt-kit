import { ruStrings } from '../strings/ru';
import type { UiStrings } from '../strings/ui-strings-types';

/** То, что нужно от файла для проверок: настоящий File и запись из стора вложений подходят оба */
export interface FileLike {
  name: string;
  size: number;
  type: string;
}

export type FileRejectReason = 'type' | 'size' | 'count';

export interface FileRejection<T extends FileLike = File> {
  file: T;
  reason: FileRejectReason;
  message: string;
}

export interface FileRules {
  /** Как атрибут accept у input: `image/*,.pdf,application/zip` */
  accept?: string;
  /** Байты */
  maxSize?: number;
  multiple?: boolean;
  maxFiles?: number;
}

export type FileKind = 'image' | 'video' | 'audio' | 'archive' | 'pdf' | 'code' | 'text' | 'file';

export type FileStrings = UiStrings['fileDropzone'];

export interface FileTextOptions {
  /** Локаль чисел; по умолчанию `ru` */
  locale?: string;
  /** Тексты и единицы; по умолчанию русские — компоненты передают словарь UiStringsProvider */
  strings?: FileStrings;
}

/** 1536 → «1,5 КБ»: один знак после запятой до 10, дальше целые — точность, которую читают глазами */
export function formatBytes(
  bytes: number,
  { locale = 'ru', strings = ruStrings.fileDropzone }: FileTextOptions = {},
): string {
  const byteUnits = strings.byteUnits;
  let value = Math.max(0, bytes);
  let unit = 0;

  while (value >= 1024 && unit < byteUnits.length - 1) {
    value /= 1024;
    unit += 1;
  }

  const digits = unit === 0 || value >= 10 ? 0 : 1;
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value);

  return `${number} ${byteUnits[unit]}`;
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');

  return dot > 0 ? name.slice(dot).toLowerCase() : '';
}

/** Как браузер читает accept: расширение `.png`, маска `image/*` или точный MIME */
export function matchesAccept(file: FileLike, accept?: string): boolean {
  const rules = (accept ?? '')
    .split(',')
    .map((rule) => rule.trim().toLowerCase())
    .filter(Boolean);

  if (rules.length === 0) return true;

  const type = file.type.toLowerCase();
  const extension = extensionOf(file.name);

  return rules.some((rule) => {
    if (rule.startsWith('.')) return extension === rule;
    if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1));

    return type === rule;
  });
}

/**
 * Пока файл тащат над зоной, имён ещё нет — только MIME-типы. Если accept задан одними MIME, по ним
 * можно сказать «подходит / нет» заранее; при расширениях в accept или пустых типах ответ — null.
 */
export function acceptsDraggedTypes(types: readonly string[], accept?: string): boolean | null {
  const rules = (accept ?? '')
    .split(',')
    .map((rule) => rule.trim())
    .filter(Boolean);

  if (rules.length === 0) return true;
  if (types.length === 0 || types.some((type) => !type)) return null;
  if (rules.some((rule) => rule.startsWith('.'))) return null;

  return types.every((type) => matchesAccept({ name: '', size: 0, type }, accept));
}

/**
 * Делит файлы на принятые и отклонённые. Порядок проверок — лимит числа, формат, размер: за лимитом
 * файл отклонён, даже если он подошёл бы, — иначе «первые N» зависели бы от того, какие из них плохие.
 */
export function validateFiles<T extends FileLike>(
  files: readonly T[],
  { accept, maxSize, multiple = false, maxFiles }: FileRules,
  text: FileTextOptions = {},
): { accepted: T[]; rejected: Array<FileRejection<T>> } {
  const strings = text.strings ?? ruStrings.fileDropzone;
  const limit = multiple ? maxFiles : 1;
  const accepted: T[] = [];
  const rejected: Array<FileRejection<T>> = [];

  for (const [index, file] of files.entries()) {
    if (limit !== undefined && index >= limit) {
      const message = limit === 1 ? strings.onlyOne : strings.tooMany(limit);

      rejected.push({ file, reason: 'count', message });
    } else if (!matchesAccept(file, accept)) {
      rejected.push({ file, reason: 'type', message: strings.badType(file.name) });
    } else if (maxSize !== undefined && file.size > maxSize) {
      rejected.push({
        file,
        reason: 'size',
        message: strings.tooBig(file.name, formatBytes(maxSize, text)),
      });
    } else {
      accepted.push(file);
    }
  }

  return { accepted, rejected };
}

/**
 * Имя для обрезки посередине: голова режется многоточием, хвост — последние знаки имени с
 * расширением — виден всегда. «очень-длинный-отчёт-за-март.pdf» → «очень-длин…за-март.pdf».
 */
export function splitFileName(name: string, tailChars = 6): { head: string; tail: string } {
  const extension = extensionOf(name);
  const base = extension ? name.slice(0, -extension.length) : name;

  if (base.length <= tailChars) return { head: '', tail: name };

  return {
    head: base.slice(0, -tailChars),
    tail: base.slice(-tailChars) + name.slice(base.length),
  };
}

const codeExtensions = new Set([
  '.js',
  '.ts',
  '.tsx',
  '.jsx',
  '.rs',
  '.py',
  '.json',
  '.css',
  '.html',
  '.sh',
  '.toml',
  '.yaml',
  '.yml',
]);
const archiveExtensions = new Set(['.zip', '.rar', '.7z', '.tar', '.gz', '.tgz']);

/** Вид файла для иконки: по MIME, а где MIME пустой или общий — по расширению */
export function fileKind(file: Pick<FileLike, 'name' | 'type'>): FileKind {
  const type = file.type.toLowerCase();
  const extension = extensionOf(file.name);

  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  if (type === 'application/pdf' || extension === '.pdf') return 'pdf';
  if (archiveExtensions.has(extension) || /zip|rar|7z|tar|gzip/.test(type)) return 'archive';
  if (codeExtensions.has(extension)) return 'code';
  if (type.startsWith('text/') || extension === '.txt' || extension === '.md') return 'text';

  return 'file';
}

export type DragVerdict = 'accept' | 'reject';

/**
 * Тянут ли файлы (а не текст или ссылку) и подойдут ли они — насколько видно до броска: число и MIME.
 * null — тянут не файлы, зона и слой не реагируют. Имён и размеров браузер до броска не показывает
 */
export function readDraggedFiles(
  dataTransfer: Pick<DataTransfer, 'items'> | null | undefined,
  rules: FileRules,
): DragVerdict | null {
  const items = Array.from(dataTransfer?.items ?? []).filter((item) => item.kind === 'file');

  if (items.length === 0) return null;

  if (!rules.multiple && items.length > 1) return 'reject';

  if (rules.multiple && rules.maxFiles !== undefined && items.length > rules.maxFiles)
    return 'reject';

  return acceptsDraggedTypes(
    items.map((item) => item.type),
    rules.accept,
  ) === false
    ? 'reject'
    : 'accept';
}

/** Подпись с лимитами: «до 10 МБ · не больше 5 файлов»; без лимитов — undefined */
export function describeFileRules(
  { maxSize, multiple, maxFiles }: FileRules,
  text: Required<FileTextOptions>,
): string | undefined {
  const parts = [
    maxSize !== undefined && text.strings.maxSize(formatBytes(maxSize, text)),
    multiple && maxFiles !== undefined && text.strings.maxFiles(maxFiles),
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' · ') : undefined;
}
