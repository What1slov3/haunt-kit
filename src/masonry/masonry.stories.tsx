import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';

import { Masonry, Stack, Text } from '@haunt/ui';

import { photoList } from '../lib/stories/demo-photos';

/** Плитки разной высоты: фотографии своих пропорций (квадрат, горизонт, вертикаль) и подписи разной длины */
const tiles = [...photoList, ...photoList.slice(0, 3)].map((photo, index) => ({
  id: index,
  src: photo.src,
  alt: photo.alt,
  caption: index % 3 === 0 ? `${photo.alt} — снимок из подборки на выходные` : photo.alt,
}));

const meta = {
  title: 'Раскладка/Masonry',
  component: Masonry,
  tags: ['autodocs'],
  args: { minColumnWidth: 180, gap: 3, children: null },
  argTypes: { children: { control: false } },
  parameters: {
    docs: {
      description: {
        component:
          'Галерея плиток разной высоты без дыр: каждая плитка встаёт в самую короткую колонку (`masonryLayout` — чистая функция). Колонок — сколько влезет при `minColumnWidth` (или ровно `columns`); высоты пересчитываются, когда меняется контейнер или плитка (догрузилась картинка). Порядок в разметке — порядок чтения: верх раскладки идёт слева направо, в отличие от CSS columns. До первого расчёта и без JavaScript — обычная сетка.',
      },
    },
  },
  render: (args) => (
    <div style={{ width: 720 }}>
      <Masonry {...args}>
        {tiles.map((tile) => (
          <Stack
            key={tile.id}
            gap={1.5}
            style={{
              padding: 'var(--space-2)',
              background: 'var(--surface-2)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <img
              src={tile.src}
              alt={tile.alt}
              style={{ display: 'block', width: '100%', borderRadius: 'var(--radius-md)' }}
            />

            <Text size="sm">{tile.caption}</Text>
          </Stack>
        ))}
      </Masonry>
    </div>
  ),
} satisfies Meta<typeof Masonry>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector<HTMLElement>('[style*="--masonry-gap"]')!;

    await waitFor(() => expect(root).toHaveAttribute('data-ready'));

    const tops = [...root.children].map((tile) => Math.round(tile.getBoundingClientRect().top));

    // Первый ряд — первые плитки разметки, слева направо на одной высоте
    await expect(tops[0]).toBe(tops[1]);
    await expect(tops[1]).toBe(tops[2]);
    await expect(root.offsetHeight).toBeGreaterThan(0);
  },
};

export const FixedColumns: Story = {
  name: 'Ровно две колонки',
  args: { columns: 2 },
};
