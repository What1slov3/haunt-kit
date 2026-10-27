import type { ComponentPropsWithRef, ReactNode } from 'react';

import { Activity, Hash, Library, MonitorPlay, Radio, type LucideIcon } from 'lucide-react';

import { AvatarGroup, type AvatarGroupItem } from '../avatar-group/avatar-group';
import { Icon } from '../icon/icon';
import { cx } from '../lib/cx';
import { Popover } from '../popover/popover';
import { Spacer } from '../spacer/spacer';
import { useUiStrings } from '../strings/ui-strings-context';

import styles from './place-header.module.css';

/** Главная возможность места — как в модели данных: поток, сцена, экран, полка, только импульсы */
export type PlaceKind = 'stream' | 'scene' | 'screen' | 'shelf' | 'impulses';

const KIND_ICONS: Record<PlaceKind, LucideIcon> = {
  stream: Hash,
  scene: Radio,
  screen: MonitorPlay,
  shelf: Library,
  impulses: Activity,
};

export interface PlaceLive {
  /** Сколько людей в живой сессии места */
  count: number;
  /** Кого показать аватарами — первые трое */
  people?: readonly AvatarGroupItem[];
  /** Войти в сессию; без него индикатор — просто подпись */
  onJoin?: () => void;
}

export interface PlaceHeaderProps extends Omit<ComponentPropsWithRef<'header'>, 'title'> {
  name: string;
  kind?: PlaceKind;
  /** Свой знак вместо значка по `kind` */
  icon?: ReactNode;
  /** Тема места: в строке обрезается, целиком — по клику */
  topic?: ReactNode;
  /** Живая сессия — сцена или экран, где сейчас кто-то есть */
  live?: PlaceLive;
  /** Поиск, закреплённые, участники */
  actions?: ReactNode;
}

/**
 * Шапка места — полоса над лентой, для слота `header` у AppShell: значок по главной возможности места,
 * имя, тема в одну строку (целиком — в поповере по клику) и индикатор живой сессии («3 в эфире» с
 * аватарами; с `onJoin` — кнопка войти). Справа — действия экрана.
 */
export function PlaceHeader({
  name,
  kind = 'stream',
  icon,
  topic,
  live,
  actions,
  className,
  ...rest
}: PlaceHeaderProps) {
  const strings = useUiStrings().placeHeader;
  const liveContent = live && (
    <>
      <span className={styles.liveDot} aria-hidden />

      {live.people && live.people.length > 0 && (
        <AvatarGroup items={[...live.people]} max={3} size="xs" />
      )}

      <span>{strings.live(live.count)}</span>
    </>
  );

  return (
    <header className={cx(styles.root, className)} {...rest}>
      <span className={styles.icon} aria-hidden>
        {icon ?? <Icon icon={KIND_ICONS[kind]} size="sm" />}
      </span>

      <h1 className={styles.name}>{name}</h1>

      {topic && (
        <Popover.Root>
          <Popover.Trigger className={styles.topic} aria-label={strings.topic}>
            <span className={styles.topicText}>{topic}</span>
          </Popover.Trigger>

          <Popover.Content align="start" className={styles.topicFull}>
            {topic}
          </Popover.Content>
        </Popover.Root>
      )}

      <Spacer />

      {live &&
        (live.onJoin ? (
          <button type="button" className={styles.live} onClick={live.onJoin}>
            {liveContent}
          </button>
        ) : (
          <span className={styles.live}>{liveContent}</span>
        ))}

      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
