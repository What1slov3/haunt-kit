import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Avatar, Badge, IconButton, Icon, Inline, Layer, LayerItem, Text } from '@haunt/ui';
import { Maximize2 } from 'lucide-react';

import { photos } from '../lib/stories/demo-photos';

const meta = {
  title: 'Раскладка/Layer',
  component: Layer,
  subcomponents: { LayerItem },
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Слои друг над другом: все дети в одной ячейке сетки, размер — по самому большому, наложение — в порядке разметки. Значок на аватаре, подпись на обложке, кнопка в углу превью — без `position: absolute` и подбора отступов. `LayerItem place` — где встать: угол, край, центр или `fill` (по умолчанию); `offset` — отступ от края.',
      },
    },
  },
  render: () => (
    <Inline gap={6} align="center">
      <Layer>
        <Avatar name="Мария Орлова" size="xl" shape="rounded" />

        <LayerItem place="bottom-end" style={{ margin: -4 }}>
          <Badge size="sm" tone="accent" variant="solid">
            12
          </Badge>
        </LayerItem>
      </Layer>

      <Layer style={{ width: 360, borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <img
          src={photos.city.src}
          alt="Закат над городом"
          style={{ display: 'block', width: '100%' }}
        />

        <LayerItem
          place="bottom"
          style={{
            padding: 'var(--space-3)',
            background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.7))',
            width: '100%',
          }}
        >
          <Text weight="semibold" style={{ color: '#fff' }}>
            Кино в пятницу
          </Text>
        </LayerItem>

        <LayerItem place="top-end" offset={2}>
          <IconButton label="Во весь экран" size="sm" variant="secondary">
            <Icon icon={Maximize2} size="sm" />
          </IconButton>
        </LayerItem>
      </Layer>
    </Inline>
  ),
} satisfies Meta<typeof Layer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const image = canvas.getByRole('img', { name: 'Закат над городом' }).getBoundingClientRect();
    const button = canvas.getByRole('button', { name: 'Во весь экран' }).getBoundingClientRect();

    // Кнопка — в правом верхнем углу картинки, с отступом
    await expect(button.top).toBeGreaterThan(image.top);
    await expect(button.right).toBeLessThan(image.right);
    await expect(button.top - image.top).toBeLessThan(16);
  },
};
