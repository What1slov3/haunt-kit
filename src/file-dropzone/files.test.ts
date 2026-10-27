import { describe, expect, it } from 'vitest';

import { enStrings } from '../strings/en';
import { ruStrings } from '../strings/ru';

import {
  acceptsDraggedTypes,
  describeFileRules,
  fileKind,
  formatBytes,
  matchesAccept,
  readDraggedFiles,
  splitFileName,
  validateFiles,
  type FileLike,
} from './files';

const file = (name: string, type = '', size = 100): FileLike => ({ name, type, size });

describe('formatBytes', () => {
  it('подбирает единицу и точность', () => {
    expect(formatBytes(512)).toBe('512 Б');
    expect(formatBytes(1536)).toBe('1,5 КБ');
    expect(formatBytes(25 * 1024 * 1024)).toBe('25 МБ');
    expect(formatBytes(0)).toBe('0 Б');
  });

  it('берёт единицы и локаль из словаря', () => {
    expect(formatBytes(1536, { locale: 'en', strings: enStrings.fileDropzone })).toBe('1.5 KB');
  });
});

describe('matchesAccept', () => {
  it('без accept подходит всё', () => {
    expect(matchesAccept(file('a.exe'), '')).toBe(true);
  });

  it('понимает расширения, маски и точные типы', () => {
    expect(matchesAccept(file('Photo.PNG', 'image/png'), '.png')).toBe(true);
    expect(matchesAccept(file('clip.mp4', 'video/mp4'), 'image/*, video/*')).toBe(true);
    expect(matchesAccept(file('doc.pdf', 'application/pdf'), 'application/pdf')).toBe(true);
    expect(matchesAccept(file('doc.pdf', 'application/pdf'), 'image/*,.png')).toBe(false);
  });
});

describe('acceptsDraggedTypes', () => {
  it('по MIME отвечает заранее', () => {
    expect(acceptsDraggedTypes(['image/png'], 'image/*')).toBe(true);
    expect(acceptsDraggedTypes(['image/png', 'application/pdf'], 'image/*')).toBe(false);
  });

  it('при расширениях в accept или пустых типах — не знает', () => {
    expect(acceptsDraggedTypes(['image/png'], '.png')).toBeNull();
    expect(acceptsDraggedTypes([''], 'image/*')).toBeNull();
  });
});

describe('validateFiles', () => {
  it('без multiple принимает только первый файл', () => {
    const result = validateFiles([file('a.png'), file('b.png')], {});

    expect(result.accepted.map((item) => item.name)).toEqual(['a.png']);
    expect(result.rejected).toEqual([
      { file: file('b.png'), reason: 'count', message: 'Можно только один файл' },
    ]);
  });

  it('с maxFiles отклоняет всё сверх лимита', () => {
    const result = validateFiles([file('a'), file('b'), file('c')], {
      multiple: true,
      maxFiles: 2,
    });

    expect(result.accepted).toHaveLength(2);
    expect(result.rejected[0]?.message).toBe('Не больше 2 файлов');
  });

  it('проверяет формат и размер', () => {
    const result = validateFiles(
      [
        file('ok.png', 'image/png', 10),
        file('big.png', 'image/png', 5000),
        file('doc.pdf', 'application/pdf'),
      ],
      { accept: 'image/*', maxSize: 1024, multiple: true },
    );

    expect(result.accepted.map((item) => item.name)).toEqual(['ok.png']);
    expect(result.rejected.map((rejection) => [rejection.reason, rejection.message])).toEqual([
      ['size', '«big.png» больше 1 КБ'],
      ['type', '«doc.pdf» — неподходящий формат'],
    ]);
  });

  it('тексты — из переданного словаря', () => {
    const result = validateFiles(
      [file('a'), file('b'), file('c')],
      { multiple: true, maxFiles: 2 },
      { locale: 'en', strings: enStrings.fileDropzone },
    );

    expect(result.rejected[0]?.message).toBe('No more than 2 files');
  });
});

describe('splitFileName', () => {
  it('хвост — последние знаки имени и расширение', () => {
    expect(splitFileName('отчёт-за-март-2026.pdf')).toEqual({
      head: 'отчёт-за-мар',
      tail: 'т-2026.pdf',
    });
  });

  it('короткое имя целиком в хвосте — его не режут', () => {
    expect(splitFileName('a.png')).toEqual({ head: '', tail: 'a.png' });
  });

  it('без расширения режет по знакам имени', () => {
    expect(splitFileName('Makefile-backup', 4)).toEqual({ head: 'Makefile-ba', tail: 'ckup' });
  });
});

describe('fileKind', () => {
  it('по MIME и по расширению', () => {
    expect(fileKind(file('a.png', 'image/png'))).toBe('image');
    expect(fileKind(file('a.pdf'))).toBe('pdf');
    expect(fileKind(file('a.zip', 'application/zip'))).toBe('archive');
    expect(fileKind(file('main.rs'))).toBe('code');
    expect(fileKind(file('notes.md'))).toBe('text');
    expect(fileKind(file('blob.bin', 'application/octet-stream'))).toBe('file');
  });
});

describe('readDraggedFiles', () => {
  const items = (...types: string[]) => ({
    items: types.map((type) => ({ kind: 'file', type })) as unknown as DataTransferItemList,
  });

  it('тянут не файлы — null', () => {
    expect(
      readDraggedFiles(
        { items: [{ kind: 'string', type: 'text/plain' }] as unknown as DataTransferItemList },
        {},
      ),
    ).toBeNull();
    expect(readDraggedFiles(null, {})).toBeNull();
  });

  it('число и MIME видны до броска', () => {
    expect(readDraggedFiles(items('image/png'), { accept: 'image/*' })).toBe('accept');
    expect(readDraggedFiles(items('text/plain'), { accept: 'image/*' })).toBe('reject');
    expect(readDraggedFiles(items('image/png', 'image/png'), {})).toBe('reject');
    expect(readDraggedFiles(items('a', 'b', 'c'), { multiple: true, maxFiles: 2 })).toBe('reject');
  });
});

describe('describeFileRules', () => {
  it('лимиты размера и числа одной строкой; без лимитов — ничего', () => {
    const text = { strings: ruStrings.fileDropzone, locale: 'ru' };

    expect(describeFileRules({ maxSize: 8 * 1024 * 1024, multiple: true, maxFiles: 5 }, text)).toBe(
      'до 8 МБ · не больше 5 файлов',
    );
    expect(describeFileRules({}, text)).toBeUndefined();
  });
});
