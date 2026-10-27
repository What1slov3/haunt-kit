import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { AspectRatio, Grid, Text } from '@haunt/ui';

import { ridgeScene } from '../lib/stories/demo-scenes';
import { photos } from '../lib/stories/demo-photos';

const meta = {
  title: 'Раскладка/AspectRatio',
  component: AspectRatio,
  tags: ['autodocs'],
  args: { ratio: 16 / 9 },
  argTypes: { children: { control: false } },
  decorators: [
    (Story) => (
      <div style={{ width: 360 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Блок с заданным соотношением сторон (Radix AspectRatio) в стилях кита: подложка `--surface-2` и тонкая рамка поверх содержимого (inset-тень, решение 9), скругление `radius` (по умолчанию `lg`). Картинка, видео и canvas внутри заполняют его (`object-fit: cover`). Место занято до загрузки — лента не прыгает.',
      },
    },
  },
} satisfies Meta<typeof AspectRatio>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Image: Story = {
  args: { children: <img src={photos.orb.src} alt="Шар над горизонтом" /> },
  play: async ({ canvasElement }) => {
    const box = within(canvasElement).getByRole('img').parentElement!.getBoundingClientRect();

    await expect(box.width / box.height).toBeCloseTo(16 / 9, 1);
  },
};

export const Square: Story = {
  name: 'Квадрат, обрезка cover',
  args: { ratio: 1, radius: '2xl', children: <img src={ridgeScene(720, 960)} alt="Хребет" /> },
};

export const Placeholder: Story = { name: 'Пусто — место занято', args: { ratio: 4 / 3 } };

export const Unframed: Story = {
  name: 'Без подложки',
  args: { framed: false, radius: 'none', children: <img src={photos.orb.src} alt="" /> },
};

export const Gallery: Story = {
  name: 'Сетка обложек',
  decorators: [
    (Story) => (
      <div style={{ width: 560 }}>
        <Story />
      </div>
    ),
  ],
  render: () => (
    <Grid columns={3} gap={3}>
      {[1, 4 / 3, 16 / 9].map((ratio) => (
        <div key={ratio}>
          <AspectRatio ratio={ratio}>
            <img src={photos.orb.src} alt="" />
          </AspectRatio>

          <Text size="xs" tone="subtle" mono>
            {ratio.toFixed(2)}
          </Text>
        </div>
      ))}
    </Grid>
  ),
};
