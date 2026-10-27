/**
 * Домен для подписи превью: без схемы, `www.` и пути — «github.com», а не «https://www.github.com/…».
 * Битый адрес возвращается как есть: превью строит сервер, и подпись не должна пропадать из-за опечатки.
 * Кириллический домен остаётся в punycode, как его отдаёт URL: так не подменить домен похожими буквами
 */
export function linkDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return url;
  }
}
