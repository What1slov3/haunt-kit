import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { Bleed, Stack, Surface, Text } from '@haunt/ui';

import { photos } from '../lib/stories/demo-photos';

const meta = {
  title: 'Раскладка/Bleed',
  component: Bleed,
  tags: ['autodocs'],
  args: { x: 4, top: 4 },
  argTypes: { children: { control: false } },
  parameters: {
    docs: {
      description: {
        component:
          'Выйти за поле родителя: обложка во всю ширину карточки, картинка в посте до краёв колонки. `x` / `y` / `top` / `bottom` / `start` / `end` — на сколько шагов шкалы выйти, обычно ровно на поле родителя. Текст внутри вернуть на место — обычным `px` у самого Bleed.',
      },
    },
  },
  render: (args) => (
    <Surface level={2} border style={{ width: 360, padding: 'var(--space-4)', overflow: 'hidden' }}>
      <Stack gap={3}>
        <Bleed {...args}>
          <img
            src={photos.ridge.src}
            alt="Горная гряда"
            style={{ display: 'block', width: '100%' }}
          />
        </Bleed>

        <Text weight="semibold">Поход в субботу</Text>

        <Text size="sm" tone="muted">
          Обложка — до краёв карточки, текст — с полями карточки.
        </Text>
      </Stack>
    </Surface>
  ),
} satisfies Meta<typeof Bleed>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const card = canvasElement.firstElementChild as HTMLElement;
    const image = canvasElement.querySelector('img')!;

    await expect(Math.round(image.getBoundingClientRect().width)).toBe(
      Math.round(card.getBoundingClientRect().width - 2),
    );
  },
};
