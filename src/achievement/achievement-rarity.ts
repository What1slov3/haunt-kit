/** Редкость награды: от неё цвет, свечение и блик значка */
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

export const ACHIEVEMENT_RARITIES: readonly AchievementRarity[] = [
  'common',
  'rare',
  'epic',
  'legendary',
];
