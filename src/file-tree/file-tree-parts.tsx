import type { ComponentPropsWithRef, ReactNode } from 'react';

import { File, Folder, FolderOpen } from 'lucide-react';
import { Collapsible as RadixCollapsible } from 'radix-ui';

import { Icon } from '../icon/icon';
import { cx } from '../lib/cx';

import styles from './file-tree.module.css';

export type FileTreeRootProps = ComponentPropsWithRef<'ul'>;

/** Корень дерева: список верхнего уровня в рамке */
export function FileTreeRoot({ className, ...rest }: FileTreeRootProps) {
  return <ul className={cx(styles.root, className)} {...rest} />;
}

export interface FileTreeFolderProps extends Omit<
  ComponentPropsWithRef<typeof RadixCollapsible.Root>,
  'asChild'
> {
  name: ReactNode;
  /** Иконка вместо папки */
  icon?: ReactNode;
}

/** Папка: строка-кнопка сворачивает вложенный список; вложенность видна направляющей слева */
export function FileTreeFolder({ name, icon, className, children, ...rest }: FileTreeFolderProps) {
  return (
    <RadixCollapsible.Root asChild {...rest}>
      <li className={cx(styles.folder, className)}>
        <RadixCollapsible.Trigger className={styles.row}>
          <span className={styles.icon}>
            {icon ?? (
              <>
                <Icon icon={Folder} size="md" className={styles.closedIcon} />
                <Icon icon={FolderOpen} size="md" className={styles.openIcon} />
              </>
            )}
          </span>

          <span className={styles.name}>{name}</span>
        </RadixCollapsible.Trigger>

        <RadixCollapsible.Content className={styles.content}>
          <ul className={styles.children}>{children}</ul>
        </RadixCollapsible.Content>
      </li>
    </RadixCollapsible.Root>
  );
}

export interface FileTreeFileProps extends ComponentPropsWithRef<'li'> {
  name: ReactNode;
  /** Иконка вместо файла */
  icon?: ReactNode;
  /** Текущий файл — тон акцента, как активный пункт сайдбара */
  active?: boolean;
  /** Справа: размер, бейдж, время */
  meta?: ReactNode;
}

export function FileTreeFile({ name, icon, active, meta, className, ...rest }: FileTreeFileProps) {
  return (
    <li
      className={cx(styles.file, className)}
      data-active={active || undefined}
      aria-current={active ? 'true' : undefined}
      {...rest}
    >
      <span className={styles.row}>
        <span className={styles.icon}>{icon ?? <Icon icon={File} size="md" />}</span>

        <span className={styles.name}>{name}</span>

        {meta && <span className={styles.meta}>{meta}</span>}
      </span>
    </li>
  );
}

FileTreeRoot.displayName = 'FileTree.Root';
FileTreeFolder.displayName = 'FileTree.Folder';
FileTreeFile.displayName = 'FileTree.File';
