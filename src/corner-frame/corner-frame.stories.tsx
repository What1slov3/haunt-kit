import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Avatar, Button, CornerFrame, Emblem, Inline, Text } from '@haunt/ui';

const meta = {
  title: 'Сигнал/CornerFrame',
  component: CornerFrame,
  tags: ['autodocs'],
  args: {
    tone: 'accent',
    inline: true,
    children: <Emblem seed="night-raid" size={64} label="Эмблема «Ночной рейд»" />,
  },
  argTypes: { children: { control: false } },
  parameters: {
    docs: {
      description: {
        component:
          'Рамка из одних засечек по углам — прицел, кадрирование. При наведении и фокусе внутри засечки «наводятся»: сходятся к углам (`transform`), светятся по `--fx-glow`. `active` — навестись принудительно (выбранная плитка), `interactive={false}` — стоять. Длина засечки — `--frame-tick`.',
      },
    },
  },
} satisfies Meta<typeof CornerFrame>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Active: Story = {
  args: { active: true },
};

export const Neutral: Story = {
  args: { tone: 'default' },
};

export const AroundContent: Story = {
  name: 'Вокруг содержимого',
  render: (args) => (
    <Inline gap={6} align="center">
      <CornerFrame {...args}>
        <Avatar name="Вагнер" size="lg" />
      </CornerFrame>

      <CornerFrame {...args}>
        <Button variant="secondary">Фокус внутри</Button>
      </CornerFrame>

      <CornerFrame {...args} inline={false} style={{ width: 220 }}>
        <Text mono size="sm">
          TARGET LOCK · 0042
        </Text>
      </CornerFrame>
    </Inline>
  ),
};

// userEvent шлёт синтетические события — CSS :hover от них не включается, а фокус настоящий:
// :focus-within наводит засечки тем же правилом, что и наведение
export const LocksOnFocusWithin: Story = {
  name: 'Наводится при фокусе внутри',
  args: { children: <Button variant="secondary">Цель</Button> },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Цель' });
    const tick = button.parentElement?.querySelector('[data-corner="tl"]') as HTMLElement;

    await expect(getComputedStyle(tick).transform).not.toBe('none');
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await waitFor(() => expect(getComputedStyle(tick).transform).toBe('none'));
  },
};
