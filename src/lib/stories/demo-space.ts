import type { ProfileCardProps } from '@haunt/ui';

/*
 * Демо-пространство для историй шапок и лейаутов: одно и то же пространство, места и люди, чтобы
 * лента, чат, документ и настройки выглядели частями одного продукта.
 */

export const demoSpace = {
  name: 'Холмы',
  address: 'haunt.chat/s/hills',
  description:
    'Вечерние созвоны, походы по выходным и доска идей. Новичкам — в #знакомство, правила — в закрепе.',
  members: 1204,
  online: 48,
  tags: ['походы', 'созвоны', 'по-русски'],
  color: '#2bb673',
};

export const demoPeople = [
  { name: 'Мария Орлова', status: 'online' as const },
  { name: 'Иван Лебедев', status: 'online' as const },
  { name: 'Аня', status: 'idle' as const },
  { name: 'Лев' },
];

export const maria: Omit<ProfileCardProps, 'variant'> = {
  name: 'Мария Орлова',
  handle: 'maria',
  status: 'online',
  subtitle: 'она · в Haunt с марта',
  roles: [
    { name: 'Основатель', color: '#f5a524' },
    { name: 'Дизайн', color: '#7c5cff' },
  ],
};
