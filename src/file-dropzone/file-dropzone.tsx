import { useId, useRef, useState, type DragEvent, type ReactNode } from 'react';

import { Upload } from 'lucide-react';

import { useFieldControl } from '../field/field-context';
import { Icon } from '../icon/icon';
import { cx } from '../lib/cx';
import { useUiLocale, useUiStrings } from '../strings/ui-strings-context';

import styles from './file-dropzone.module.css';
import {
  describeFileRules,
  readDraggedFiles,
  validateFiles,
  type DragVerdict,
  type FileRejection,
  type FileRules,
} from './files';

export interface FileDropzoneProps extends FileRules {
  /** Принятые файлы — после проверки accept, maxSize и числа */
  onFiles: (files: File[]) => void;
  /** Отклонённые — с причиной и текстом; тексты и так показаны под зоной */
  onReject?: (rejections: FileRejection[]) => void;
  title?: ReactNode;
  /** Строка под заголовком; по умолчанию — лимиты размера и числа */
  description?: ReactNode;
  icon?: ReactNode;
  /** В одну строку — для узких панелей и аватара сообщества */
  compact?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  className?: string;
  'aria-describedby'?: string;
}

type DragState = 'idle' | DragVerdict;

/**
 * Зона для файлов: перетаскивание и клик (кнопка с системным выбором файла). Над зоной она живая —
 * рамка и подложка цвета акцента, иконка приподнимается; если по MIME видно, что файлы не подойдут,
 * — тон ошибки ещё до броска. Отклонённые файлы — списком под зоной до следующей попытки.
 */
export function FileDropzone({
  onFiles,
  onReject,
  accept,
  maxSize,
  multiple,
  maxFiles,
  title,
  description,
  icon,
  compact,
  disabled,
  invalid,
  id,
  className,
  'aria-describedby': ariaDescribedBy,
}: FileDropzoneProps) {
  const rules = { accept, maxSize, multiple, maxFiles };
  const strings = useUiStrings();
  const locale = useUiLocale();
  const text = { strings: strings.fileDropzone, locale };
  const control = useFieldControl({ id, invalid, 'aria-describedby': ariaDescribedBy });
  const errorsId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  // dragenter/dragleave приходят и от дочерних элементов — считаем вложенность, чтобы не мигать
  const dragDepth = useRef(0);
  const [drag, setDrag] = useState<DragState>('idle');
  const [errors, setErrors] = useState<string[]>([]);

  const describedBy = [control.props['aria-describedby'], errors.length > 0 ? errorsId : undefined]
    .filter(Boolean)
    .join(' ');

  const take = (files: File[]) => {
    if (files.length === 0) return;

    const { accepted, rejected } = validateFiles(files, rules, text);

    setErrors(rejected.map((rejection) => rejection.message));

    if (accepted.length > 0) onFiles(accepted);
    if (rejected.length > 0) onReject?.(rejected);
  };

  const onDragEnter = (event: DragEvent<HTMLDivElement>) => {
    const state = disabled ? null : readDraggedFiles(event.dataTransfer, rules);

    if (!state) return;

    event.preventDefault();
    dragDepth.current += 1;
    setDrag(state);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (disabled || dragDepth.current === 0) return;

    // Без preventDefault браузер не разрешит бросок и откроет файл сам
    event.preventDefault();
    event.dataTransfer.dropEffect = drag === 'reject' ? 'none' : 'copy';
  };

  const onDragLeave = () => {
    if (dragDepth.current === 0) return;

    dragDepth.current -= 1;

    if (dragDepth.current === 0) setDrag('idle');
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    if (disabled || dragDepth.current === 0) return;

    event.preventDefault();
    dragDepth.current = 0;
    setDrag('idle');
    take(Array.from(event.dataTransfer.files));
  };

  const hint = description ?? describeFileRules(rules, text);

  return (
    <div
      className={cx(styles.root, compact && styles.compact, className)}
      data-drag={drag === 'idle' ? undefined : drag}
      data-invalid={control.invalid || errors.length > 0 || undefined}
      data-disabled={disabled || undefined}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <button
        type="button"
        className={styles.zone}
        disabled={disabled}
        aria-describedby={describedBy || undefined}
        aria-invalid={control.invalid || errors.length > 0 || undefined}
        onClick={() => inputRef.current?.click()}
        id={control.props.id}
      >
        <span className={styles.icon}>{icon ?? <Icon icon={Upload} />}</span>

        <span className={styles.text}>
          <span className={styles.title}>
            {title ??
              (drag === 'reject'
                ? text.strings.reject
                : multiple
                  ? text.strings.titleMultiple
                  : text.strings.title)}
          </span>

          {hint && <span className={styles.description}>{hint}</span>}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        className={styles.input}
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          take(Array.from(event.target.files ?? []));
          // Тот же файл можно выбрать снова — иначе change не придёт
          event.target.value = '';
        }}
      />

      {errors.length > 0 && (
        <ul id={errorsId} className={styles.errors} role="alert">
          {errors.map((error, index) => (
            // Список заменяется целиком на каждую попытку — индекс стабилен в его пределах
            <li key={index} className={styles.error}>
              {error}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
