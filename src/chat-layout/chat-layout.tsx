import type { ComponentPropsWithRef, CSSProperties, ReactNode } from 'react';

import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';

import styles from './chat-layout.module.css';

export interface ChatLayoutProps extends ComponentPropsWithRef<'div'> {
  /** Шапка места — `PlaceHeader` */
  header?: ReactNode;
  /** Лента — `VirtualList` или `ScrollArea` с сообщениями: прокрутку держит она, раскладка даёт ей высоту */
  children: ReactNode;
  /** Прижат к низу: `RichComposer` */
  composer?: ReactNode;
  /** Над композером по центру, поверх ленты: `JumpToLatest`, «печатает…» */
  overlay?: ReactNode;
  /** Панель справа: тред, закреплённые, поиск по месту */
  panel?: ReactNode;
  /** Ширина панели, px; по умолчанию 360 */
  panelWidth?: number;
  panelLabel?: string;
}

/**
 * Место-чат на всю высоту: шапка, лента между ней и композером, композер прижат к низу. Панель треда —
 * справа, а на узком месте (уже 720 px — смотрит ширина самой раскладки, не окна) ложится поверх ленты.
 * Раскладке нужна высота от родителя: в AppShell её даёт область содержимого.
 */
export function ChatLayout({
  header,
  children,
  composer,
  overlay,
  panel,
  panelWidth = 360,
  panelLabel,
  className,
  style,
  ...rest
}: ChatLayoutProps) {
  const strings = useUiStrings().chatLayout;

  return (
    <div
      className={cx(styles.root, className)}
      style={{ '--panel-width': `${panelWidth}px`, ...style } as CSSProperties}
      {...rest}
    >
      <main className={styles.main}>
        {header}

        <div className={styles.feed}>
          {children}

          {overlay && <div className={styles.overlay}>{overlay}</div>}
        </div>

        {composer && <div className={styles.composer}>{composer}</div>}
      </main>

      {panel && (
        <aside className={styles.panel} aria-label={panelLabel ?? strings.panel}>
          {panel}
        </aside>
      )}
    </div>
  );
}
