export type EmojiCategoryId =
  | 'smileys'
  | 'people'
  | 'nature'
  | 'food'
  | 'activities'
  | 'travel'
  | 'objects'
  | 'symbols'
  | 'flags';

export interface EmojiItem {
  /** Сам символ, может быть последовательностью с ZWJ */
  char: string;
  /** Шорткод без двоеточий: `smile` → `:smile:` */
  shortcode: string;
  /** Название по-русски — подпись в предпросмотре и для скринридера */
  name: string;
  /** Ключевые слова для поиска, русские и английские */
  keywords: readonly string[];
}

export interface EmojiCategory {
  id: EmojiCategoryId;
  label: string;
  emojis: EmojiItem[];
}
