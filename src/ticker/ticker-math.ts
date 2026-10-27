/*
 * Бегущая строка — две одинаковые группы подряд, дорожка едет на половину своей ширины и начинается
 * заново: шва не видно, потому что вторая группа в этот момент стоит ровно там, где была первая. Группа
 * должна быть не уже окна, иначе справа видна пустота, — поэтому набор пунктов в группе повторяется.
 */

/** Сколько раз повторить набор пунктов в группе, чтобы она была не уже окна */
export function tickerRepeats(viewportWidth: number, contentWidth: number): number {
  if (!(contentWidth > 0) || !(viewportWidth > 0)) return 1;

  return Math.max(1, Math.ceil(viewportWidth / contentWidth));
}

/** Длительность прохода группы в секундах при скорости speed px/с; не быстрее 2 с — иначе мельтешит */
export function tickerDuration(groupWidth: number, speed: number): number {
  if (!(groupWidth > 0) || !(speed > 0)) return 0;

  return Math.max(2, groupWidth / speed);
}
