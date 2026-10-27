import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Button, Inline, LevelBadge, levelFromTotal, Stack, XpBar } from '@haunt/ui';

const meta = {
  title: 'Сообщество/XpBar',
  component: XpBar,
  subcomponents: { LevelBadge },
  tags: ['autodocs'],
  args: { level: 12, xp: 1240, xpToNext: 2000 },
  decorators: [
    (Story) => (
      <div style={{ width: 360, paddingTop: 48 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Опыт до следующего уровня: `LevelBadge` (шестигранник цвета акцента), числа перекатываются (`NumberTicker`), полоса — `progressbar`, только transform. Повышение уровня (проп `level` вырос): полоса набегает заново, значок вспыхивает, из него — локальное `Confetti` из `fx/effects`, скринридер слышит «Новый уровень». `data-effects="off"` и reduced-motion — без конфетти и вспышки. Кривую уровней задаёт приложение: `levelFromTotal(total, requirement)`.',
      },
    },
  },
} satisfies Meta<typeof XpBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const bar = within(canvasElement).getByRole('progressbar', { name: 'Опыт' });

    await expect(bar).toHaveAttribute('aria-valuenow', '1240');
    // Разряды — неразрывным пробелом (toLocaleString), поэтому \s, а не обычный пробел
    await expect(bar.getAttribute('aria-valuetext')).toMatch(/^1\s240 из 2\s000 опыта$/);
    await expect(
      within(canvasElement).getByRole('img', { name: 'Уровень 12' }),
    ).toBeInTheDocument();
  },
};

export const Small: Story = { name: 'Малая', args: { size: 'sm' } };

export const WithoutBadge: Story = {
  name: 'Без значка',
  args: { showLevel: false, label: 'До 13 уровня' },
};

export const MaxLevel: Story = {
  name: 'Последний уровень',
  args: { level: 50, xp: 0, xpToNext: 0 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('progressbar')).toHaveAttribute(
      'aria-valuetext',
      'Максимальный уровень',
    );
  },
};

const requirement = (level: number) => 400 + level * 100;

/** Опыт копится кнопкой: уровень считает levelFromTotal, полоса ничего не знает о кривой */
function Grind() {
  const [total, setTotal] = useState(1300);
  const progress = levelFromTotal(total, requirement);

  return (
    <Stack gap={3}>
      <XpBar {...progress} />

      <Inline gap={2}>
        <Button size="sm" onClick={() => setTotal((value) => value + 150)}>
          +150 опыта
        </Button>
      </Inline>
    </Stack>
  );
}

export const LevelUp: Story = {
  name: 'Повышение уровня',
  render: () => <Grind />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1300 = 500 + 600 + 200: третий уровень, 200 из 700
    await expect(canvas.getByRole('img', { name: 'Уровень 3' })).toBeInTheDocument();

    for (let i = 0; i < 4; i++)
      await userEvent.click(canvas.getByRole('button', { name: '+150 опыта' }));

    await waitFor(() =>
      expect(canvas.getByRole('img', { name: 'Уровень 4' })).toHaveAttribute('data-pop', '1'),
    );
    await expect(canvas.getByRole('status')).toHaveTextContent('Новый уровень: 4');
  },
};

export const Badges: Story = {
  name: 'LevelBadge: размеры',
  render: () => (
    <Inline gap={3} align="center">
      <LevelBadge level={3} size="sm" />
      <LevelBadge level={12} />
      <LevelBadge level={42} size="lg" />
      <LevelBadge level={128} size="lg" prefix="" />
    </Inline>
  ),
};
