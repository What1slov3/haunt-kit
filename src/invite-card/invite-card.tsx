import type { ComponentPropsWithRef, ReactNode } from 'react';

import { Link2Off, TimerOff } from 'lucide-react';

import { Avatar } from '../avatar/avatar';
import { Button } from '../button/button';
import { Emblem } from '../emblem/emblem';
import { Icon } from '../icon/icon';
import { cx } from '../lib/cx';
import { useUiLocale, useUiStrings } from '../strings/ui-strings-context';
import { Timestamp } from '../timestamp/timestamp';
import type { TimestampInput } from '../timestamp/timestamp-format';

import styles from './invite-card.module.css';

export type InviteState = 'valid' | 'joined' | 'expired' | 'invalid';

export interface InviteCardProps extends Omit<ComponentPropsWithRef<'div'>, 'title'> {
  /** Имя пространства */
  name: string;
  /** Картинка пространства; без неё — эмблема или инициалы */
  iconSrc?: string;
  /** Без картинки — процедурная `Emblem` по `seed` (или имени) вместо инициалов */
  emblem?: boolean;
  seed?: string;
  /** Кто пригласил */
  inviter?: string;
  online?: number;
  members?: number;
  description?: ReactNode;
  /** valid — можно принять; joined — уже участник; expired / invalid — принять нельзя */
  state?: InviteState;
  /** Когда истекает — относительное время у действующего */
  expiresAt?: TimestampInput;
  /** Принятие идёт: кнопка со спиннером */
  pending?: boolean;
  onAccept?: () => void;
  /** «Перейти» у того, кто уже участник */
  onOpen?: () => void;
  /** Локаль чисел и времени; по умолчанию — из UiStringsProvider */
  locale?: string;
}

/**
 * Приглашение в пространство в ленте: эмблема или аватар, имя, «в сети» и участники, «Принять».
 * Уже участник — «Перейти»; истёкшее и недействительное — погашены, с причиной и без кнопки.
 */
export function InviteCard({
  name,
  iconSrc,
  emblem,
  seed,
  inviter,
  online,
  members,
  description,
  state = 'valid',
  expiresAt,
  pending,
  onAccept,
  onOpen,
  locale: localeProp,
  className,
  ...rest
}: InviteCardProps) {
  const text = useUiStrings().inviteCard;
  const locale = useUiLocale(localeProp);
  const broken = state === 'expired' || state === 'invalid';

  let icon: ReactNode;

  if (broken) {
    icon = (
      <span className={styles.brokenIcon}>
        <Icon icon={state === 'expired' ? TimerOff : Link2Off} size="lg" />
      </span>
    );
  } else if (!iconSrc && emblem) {
    icon = (
      <span className={styles.emblem}>
        <Emblem seed={seed ?? name} size={48} />
      </span>
    );
  } else {
    icon = <Avatar name={name} src={iconSrc} size="xl" shape="rounded" className={styles.avatar} />;
  }

  return (
    <div className={cx(styles.card, className)} data-state={state} {...rest}>
      <span className={styles.overline}>{inviter ? text.invitedBy(inviter) : text.title}</span>

      <div className={styles.row}>
        {icon}

        <div className={styles.body}>
          <span className={styles.name}>
            {broken ? (state === 'expired' ? text.expired : text.invalid) : name}
          </span>

          {!broken && (online !== undefined || members !== undefined) && (
            <span className={styles.stats}>
              {online !== undefined && (
                <span className={styles.stat}>
                  <span className={cx(styles.dot, styles.online)} aria-hidden />
                  {text.online(online)}
                </span>
              )}

              {members !== undefined && (
                <span className={styles.stat}>
                  <span className={styles.dot} aria-hidden />
                  {text.members(members)}
                </span>
              )}
            </span>
          )}

          {broken && <span className={styles.stats}>{name}</span>}
        </div>

        {state === 'valid' && onAccept && (
          <Button variant="accent" size="md" loading={pending} onClick={onAccept}>
            {text.accept}
          </Button>
        )}

        {state === 'joined' && (
          <Button variant="secondary" size="md" onClick={onOpen} disabled={!onOpen}>
            {onOpen ? text.open : text.joined}
          </Button>
        )}
      </div>

      {!broken && description && <p className={styles.description}>{description}</p>}

      {state === 'valid' && expiresAt !== undefined && (
        <span className={styles.expires}>
          {text.expires} <Timestamp date={expiresAt} locale={locale} live tooltip />
        </span>
      )}
    </div>
  );
}
