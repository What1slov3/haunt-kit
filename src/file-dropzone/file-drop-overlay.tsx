import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { Upload } from 'lucide-react';

import { Icon } from '../icon/icon';
import { useUiLocale, useUiStrings } from '../strings/ui-strings-context';
import { usePortalContainer } from '../theme/portal-container';
import { toast } from '../toast/toast-store';

import styles from './file-drop-overlay.module.css';
import {
  describeFileRules,
  readDraggedFiles,
  validateFiles,
  type DragVerdict,
  type FileRejection,
  type FileRules,
} from './files';
import { isFileDrag } from './use-prevent-window-drop';

export interface FileDropOverlayProps extends FileRules {
  /** Принятые файлы — после проверки accept, maxSize и числа */
  onFiles: (files: File[]) => void;
  /** Отклонённые — с причиной и текстом; без обработчика причина показывается тостом */
  onReject?: (rejections: FileRejection[]) => void;
  /** Куда уйдут файлы: «Загрузить в #общий»; по умолчанию — «Отпустите, чтобы загрузить» */
  title?: ReactNode;
  /** Строка под заголовком; по умолчанию — лимиты размера и числа */
  description?: ReactNode;
  icon?: ReactNode;
  /** Не слушать окно: экран сейчас не принимает файлы (диалог, только чтение) */
  disabled?: boolean;
}

/**
 * Зона на весь экран: пока над окном тянут файлы, поверх приложения встаёт слой «отпустите, чтобы
 * загрузить», и бросить можно куда угодно. Слушает окно, а не свой прямоугольник; один на экран, рядом с
 * композером или списком файлов. Слой не ловит указатель: встроенная `FileDropzone` на том же экране
 * по-прежнему принимает бросок сама — слой видит, что событие уже взяли, и файлы второй раз не берёт.
 * Брошенный мимо файл браузер не откроет вместо приложения: `usePreventWindowDrop` рядом не нужен.
 * Клавиатуре и экранным чтецам слой не нужен — у них кнопка выбора файла (`FileDropzone`, вложения).
 */
export function FileDropOverlay({
  onFiles,
  onReject,
  accept,
  maxSize,
  multiple,
  maxFiles,
  title,
  description,
  icon,
  disabled = false,
}: FileDropOverlayProps) {
  const strings = useUiStrings();
  const locale = useUiLocale();
  const container = usePortalContainer();
  const [verdict, setVerdict] = useState<DragVerdict | null>(null);
  const text = { strings: strings.fileDropzone, locale };
  const rules = { accept, maxSize, multiple, maxFiles };
  // Свежие правила, тексты и обработчики для слушателей окна: они вешаются один раз, а пропсы меняются
  const latest = useRef({ rules, text, onFiles, onReject });

  useEffect(() => {
    latest.current = { rules, text, onFiles, onReject };
  });

  useEffect(() => {
    if (disabled) return;

    // dragenter и dragleave приходят от каждого элемента под курсором — считаем вложенность, иначе слой мигал бы
    let depth = 0;

    const reset = () => {
      depth = 0;
      setVerdict(null);
    };

    const onDragEnter = (event: DragEvent) => {
      if (!isFileDrag(event)) return;

      depth += 1;
      setVerdict(readDraggedFiles(event.dataTransfer, latest.current.rules));
    };

    const onDragLeave = (event: DragEvent) => {
      if (!isFileDrag(event) || depth === 0) return;

      depth -= 1;

      if (depth === 0) setVerdict(null);
    };

    const onDragOver = (event: DragEvent) => {
      if (!isFileDrag(event)) return;

      // Встроенная зона под курсором уже разрешила бросок и выставила свой dropEffect — её не трогаем
      const handled = event.defaultPrevented;

      // Без preventDefault браузер не разрешит бросок и откроет файл сам
      event.preventDefault();

      if (handled || !event.dataTransfer) return;

      event.dataTransfer.dropEffect =
        readDraggedFiles(event.dataTransfer, latest.current.rules) === 'reject' ? 'none' : 'copy';
    };

    const onDrop = (event: DragEvent) => {
      if (!isFileDrag(event)) return;

      // Бросили на встроенную зону — она уже взяла файлы и погасила событие
      const taken = event.defaultPrevented;

      event.preventDefault();
      reset();

      if (taken) return;

      const { rules: current, text: texts, onFiles: take, onReject: reject } = latest.current;
      const files = Array.from(event.dataTransfer?.files ?? []);
      const { accepted, rejected } = validateFiles(files, current, texts);

      if (accepted.length > 0) take(accepted);

      if (rejected.length === 0) return;

      if (reject) {
        reject(rejected);

        return;
      }

      const [first, ...rest] = rejected.map((rejection) => rejection.message);

      toast.error(first!, { description: rest.length > 0 ? rest.join('\n') : undefined });
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    // Перетаскивание отменили (Esc) или увели в другое окно — слой не должен остаться висеть
    window.addEventListener('dragend', reset);
    window.addEventListener('blur', reset);

    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
      window.removeEventListener('dragend', reset);
      window.removeEventListener('blur', reset);
      setVerdict(null);
    };
  }, [disabled]);

  if (!verdict || typeof document === 'undefined') return null;

  const reject = verdict === 'reject';
  const heading = reject
    ? strings.fileDropOverlay.reject
    : (title ?? (multiple ? strings.fileDropOverlay.titleMultiple : strings.fileDropOverlay.title));
  const hint = description ?? describeFileRules(rules, text);

  return createPortal(
    <div className={styles.root} data-drag={verdict} role="status" aria-live="polite">
      <div className={styles.frame}>
        <span className={styles.icon}>{icon ?? <Icon icon={Upload} size="xl" />}</span>

        <span className={styles.title}>{heading}</span>

        {hint && !reject && <span className={styles.description}>{hint}</span>}
      </div>
    </div>,
    container ?? document.body,
  );
}
