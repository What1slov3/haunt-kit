import { useState, type KeyboardEvent, type ReactNode } from 'react';

import { useUiStrings } from '../strings/ui-strings-context';

import styles from './markdown.module.css';

/**
 * `||спойлер||`: скрыт до клика, Enter или пробела. Скрытое содержимое `inert` — ссылки и упоминания
 * внутри не ловят фокус и клик, скринридер их не читает. После раскрытия `tabIndex={-1}`: фокус остаётся
 * на месте, а не падает на `<body>`, но в порядок Tab элемент больше не входит.
 */
export function Spoiler({ children }: { children?: ReactNode }) {
  const strings = useUiStrings();
  const [revealed, setRevealed] = useState(false);

  const onKeyDown = (event: KeyboardEvent) => {
    if (revealed || (event.key !== 'Enter' && event.key !== ' ')) return;

    event.preventDefault();
    setRevealed(true);
  };

  return (
    <span
      className={styles.spoiler}
      role={revealed ? undefined : 'button'}
      tabIndex={revealed ? -1 : 0}
      aria-label={revealed ? undefined : strings.markdown.spoiler}
      data-revealed={revealed || undefined}
      onClick={() => setRevealed(true)}
      onKeyDown={onKeyDown}
    >
      <span
        className={styles.spoilerContent}
        inert={!revealed}
        aria-hidden={!revealed || undefined}
      >
        {children}
      </span>
    </span>
  );
}
