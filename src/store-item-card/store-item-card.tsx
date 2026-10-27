import type { ComponentPropsWithRef, CSSProperties, ReactNode } from 'react';

import { Check, Coins, Gift, Lock, Shirt } from 'lucide-react';
import { VisuallyHidden } from 'radix-ui';

import { Avatar } from '../avatar/avatar';
import { Badge } from '../badge/badge';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { cx } from '../lib/cx';
import { Progress } from '../progress/progress';
import { useUiLocale, useUiStrings } from '../strings/ui-strings-context';

import styles from './store-item-card.module.css';

export type StoreItemState = 'available' | 'owned' | 'equipped' | 'unavailable';

/** purchase — за цену, earn — за выполненное условие (вклад, сезон, достижение) */
export type StoreItemAcquisition = 'purchase' | 'earn';

export interface StoreItemCardProps extends Omit<ComponentPropsWithRef<'div'>, 'title'> {
  /** Название вещи: «Неон», «След кометы», «Мотив входа» */
  name: string;
  /**
   * Цвет вещи: кромка карточки, точка у названия, имя в превью по умолчанию. Без него — акцент
   * пространства (вещь не про цвет: звук, рамка)
   */
  roleColor?: string;
  /** Второй цвет — градиент точки и имени в превью по умолчанию */
  roleColor2?: string;
  /**
   * Куда надевается: «имя в ленте», «след», «аура профиля», «рамка аватара», «звук входа». Метка
   * рядом с названием; без неё — ничего
   */
  kind?: ReactNode;
  /**
   * Своё превью — живой кусок интерфейса с применённой вещью: строка ленты со следом, ProfileCard с
   * аурой, аватар в рамке, кнопка «послушать». Без него — строка сообщения с именем в цвете вещи
   */
  preview?: ReactNode;
  /** Подпись над превью; по умолчанию «Так выглядит имя» */
  previewLabel?: ReactNode;
  /** Как получить: за цену (по умолчанию) или за условие */
  acquisition?: StoreItemAcquisition;
  /** Цена — для `acquisition="purchase"` */
  price?: number;
  /** Знак валюты перед ценой; по умолчанию — монеты */
  currency?: ReactNode;
  /** Условие для `acquisition="earn"`: «Пять страниц в лоре», «Провести три вечера» */
  requirement?: ReactNode;
  /** Насколько выполнено условие, 0…1; 1 — можно забрать (`onClaim`) */
  progress?: number;
  /** available — можно получить, owned — есть, equipped — надето, unavailable — нельзя */
  state?: StoreItemState;
  /** Баланс покупателя: цена выше — кнопка выключена, «не хватает средств» */
  balance?: number;
  description?: ReactNode;
  /** Почему недоступно: «с 10 уровня» */
  unavailableReason?: ReactNode;
  /** Имя в превью по умолчанию — обычно смотрящего: «так будет выглядеть твоё имя» */
  previewName?: string;
  previewAvatarSrc?: string;
  /** Метка в углу: «новое», редкость, «до 31 октября» */
  badge?: ReactNode;
  /** Действие идёт: кнопка со спиннером */
  pending?: boolean;
  onBuy?: () => void;
  /** Забрать заработанное — когда `progress` дошёл до 1 */
  onClaim?: () => void;
  onEquip?: () => void;
  onUnequip?: () => void;
  /** Подарить другому: кнопка рядом с основным действием */
  onGift?: () => void;
  /** Примерить: экран показывает вещь на настоящем интерфейсе; `trying` — примерка идёт */
  onTry?: () => void;
  trying?: boolean;
  /** Локаль цены; по умолчанию — из UiStringsProvider */
  locale?: string;
}

/**
 * Вещь, которой человек выражает себя в сообществе: имя, след в ленте, аура профиля, рамка аватара,
 * звук входа. Превью — живой кусок интерфейса с применённой вещью (свой `preview` или строка сообщения с
 * именем в цвете вещи), метка «куда надевается» (`kind`), способ получения — за цену или за условие с
 * прогрессом, действие по состоянию: «купить» / «забрать» → «надеть» → «снять»; рядом — «подарить» и
 * «примерить». Деньги, условия и права — у экрана, карточка только показывает. Сама вещь — данные:
 * значения ручек косметики (`--trail-paint`, `--aura-paint`…) и звук, а не свой CSS.
 */
export function StoreItemCard({
  name,
  roleColor,
  roleColor2,
  kind,
  preview,
  previewLabel,
  acquisition = 'purchase',
  price,
  currency,
  requirement,
  progress,
  state = 'available',
  balance,
  description,
  unavailableReason,
  previewName,
  previewAvatarSrc,
  badge,
  pending,
  onBuy,
  onClaim,
  onEquip,
  onUnequip,
  onGift,
  onTry,
  trying = false,
  locale: localeProp,
  className,
  style,
  ...rest
}: StoreItemCardProps) {
  const text = useUiStrings().storeItemCard;
  const locale = useUiLocale(localeProp);
  const earn = acquisition === 'earn';
  const short =
    !earn &&
    state === 'available' &&
    balance !== undefined &&
    price !== undefined &&
    balance < price;
  const ratio = Math.min(1, Math.max(0, progress ?? 0));
  const percent = Math.round(ratio * 100);
  const ready = earn && ratio >= 1;
  // Условие ещё не выполнено: ни цены, ни действия — подвал не рисуется, прогресс выше говорит всё
  const footerEmpty = earn && state === 'available' && !ready;
  const shownName = previewName ?? name;
  const colors = {
    '--role-color': roleColor ?? 'var(--accent)',
    '--role-color-2': roleColor2 ?? roleColor ?? 'var(--accent-2)',
  } as CSSProperties;

  const extras = (onTry || onGift) && state !== 'unavailable' && (
    <span className={styles.extras}>
      {onTry && (
        <Button
          size="sm"
          variant="ghost"
          iconStart={<Icon icon={Shirt} size="xs" />}
          aria-pressed={trying}
          onClick={onTry}
        >
          {trying ? text.tryOff : text.tryOn}
        </Button>
      )}

      {onGift && (
        <Button
          size="sm"
          variant="ghost"
          iconStart={<Icon icon={Gift} size="xs" />}
          onClick={onGift}
        >
          {text.gift}
        </Button>
      )}
    </span>
  );

  return (
    <div
      className={cx(styles.card, className)}
      data-state={state}
      data-acquisition={acquisition}
      data-trying={trying || undefined}
      data-gradient={roleColor2 ? true : undefined}
      style={{ ...colors, ...style }}
      {...rest}
    >
      <div className={styles.preview}>
        <span className={styles.previewLabel}>{previewLabel ?? text.preview}</span>

        {preview ?? (
          <div className={styles.message}>
            <Avatar name={shownName} src={previewAvatarSrc} size="md" />

            <div className={styles.messageBody}>
              <span className={styles.roleName}>{shownName}</span>

              <span className={styles.messageText}>{text.previewText}</span>
            </div>
          </div>
        )}

        {badge && <span className={styles.corner}>{badge}</span>}
      </div>

      <div className={styles.body}>
        <div className={styles.title}>
          <span className={styles.dot} aria-hidden />

          <span className={styles.name}>{name}</span>

          {kind && <span className={styles.kind}>{kind}</span>}
        </div>

        {description && <p className={styles.description}>{description}</p>}

        {state === 'unavailable' && unavailableReason && (
          <p className={styles.reason}>
            <Icon icon={Lock} size="xs" />
            {unavailableReason}
          </p>
        )}

        {earn && state === 'available' && (requirement || progress !== undefined) && (
          <div className={styles.requirement}>
            {requirement && <span className={styles.requirementText}>{requirement}</span>}

            {progress !== undefined && (
              <span className={styles.progressRow}>
                <Progress
                  value={percent}
                  size="sm"
                  tone={ready ? 'success' : 'accent'}
                  label={text.progress(percent)}
                  className={styles.progress}
                />

                <span className={styles.percent} aria-hidden>
                  {percent}%
                </span>
              </span>
            )}
          </div>
        )}

        {!footerEmpty && (
          <div className={styles.footer}>
            {!earn && price !== undefined ? (
              <span className={styles.price}>
                <span className={styles.currency} aria-hidden>
                  {currency ?? <Icon icon={Coins} size="sm" />}
                </span>

                <span aria-hidden>{price.toLocaleString(locale)}</span>

                <VisuallyHidden.Root>{text.price(price)}</VisuallyHidden.Root>
              </span>
            ) : (
              // Держит действие справа, когда цены нет: вещь за условие
              <span />
            )}

            <span className={styles.actions}>
              {state === 'available' && !earn && (
                <Button
                  size="sm"
                  variant="accent"
                  loading={pending}
                  disabled={short}
                  onClick={onBuy}
                >
                  {short ? text.notEnough : text.buy}
                </Button>
              )}

              {state === 'available' && ready && (
                <Button size="sm" variant="accent" loading={pending} onClick={onClaim}>
                  {text.claim}
                </Button>
              )}

              {state === 'owned' && (
                <>
                  <Badge tone="neutral" size="sm">
                    {text.owned}
                  </Badge>

                  {onEquip && (
                    <Button size="sm" variant="secondary" loading={pending} onClick={onEquip}>
                      {text.equip}
                    </Button>
                  )}
                </>
              )}

              {state === 'equipped' && (
                <>
                  <Badge tone="success" size="sm">
                    <Icon icon={Check} size="xs" />
                    {text.equipped}
                  </Badge>

                  {onUnequip && (
                    <Button size="sm" variant="ghost" loading={pending} onClick={onUnequip}>
                      {text.unequip}
                    </Button>
                  )}
                </>
              )}

              {state === 'unavailable' && (
                <Badge tone="neutral" size="sm">
                  {text.unavailable}
                </Badge>
              )}
            </span>
          </div>
        )}

        {extras}
      </div>
    </div>
  );
}
