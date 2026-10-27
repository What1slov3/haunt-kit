import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Stack, Stat, Switcher, Text } from '@haunt/ui';

const meta = {
  title: 'Раскладка/Switcher',
  component: Switcher,
  tags: ['autodocs'],
  args: { threshold: '30rem', gap: 3 },
  argTypes: { children: { control: false } },
  parameters: {
    docs: {
      description: {
        component:
          'Ряд, который становится столбцом: все дети рядом поровну, пока контейнер шире `threshold`, иначе — все друг под другом, без промежуточной «лесенки» 2 + 1. Для карточек статистики, пар кнопок, тарифов. Решает ширина контейнера, не окна; приём «Switcher» из Every Layout.',
      },
    },
  },
  render: (args) => (
    <Stack gap={4}>
      {[640, 360].map((width) => (
        <Stack key={width} gap={1}>
          <Text size="sm" tone="muted" mono>
            {width} px
          </Text>

          <Switcher {...args} style={{ width }} data-width={width}>
            <Stat label="Участники" value="1 204" />
            <Stat label="В сети" value="48" />
            <Stat label="Сообщений за день" value="3 117" />
          </Switcher>
        </Stack>
      ))}
    </Stack>
  ),
} satisfies Meta<typeof Switcher>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const tops = (width: number) =>
      ['Участники', 'В сети', 'Сообщений за день'].map(
        (label) =>
          within(canvasElement.querySelector<HTMLElement>(`[data-width="${width}"]`)!)
            .getByText(label)
            .getBoundingClientRect().top,
      );
    const wide = tops(640);
    const narrow = tops(360);

    await expect(new Set(wide).size).toBe(1);
    await expect(new Set(narrow).size).toBe(3);
  },
};
