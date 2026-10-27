import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { Avatar, Inline, Stack, Surface, Text } from '@haunt/ui';
import { Glow } from '@haunt/ui/fx';

const meta = {
  title: 'Эффекты/Glow',
  component: Glow,
  tags: ['autodocs'],
  args: {
    color: '--accent',
    radius: 'full',
    spread: 4,
    blur: 12,
    strength: 0.7,
    pulse: false,
    active: true,
  },
  argTypes: {
    color: { control: 'text' },
    radius: { control: 'select', options: ['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', 'full'] },
    spread: { control: { type: 'range', min: 0, max: 16, step: 1 } },
    blur: { control: { type: 'range', min: 2, max: 40, step: 1 } },
    strength: { control: { type: 'range', min: 0, max: 1, step: 0.05 } },
  },
  render: (args) => (
    <Glow {...args}>
      <Avatar name="Мира" size="xl" />
    </Glow>
  ),
  parameters: {
    docs: {
      description: {
        component:
          'Мягкое свечение вокруг ребёнка из `@haunt/ui/fx` — цвет роли или акцента у аватара, карточки. Слой за ребёнком повторяет его форму: радиус + вынос `spread` (концентрично, решение 9), размытие — `filter: blur`. `pulse` — медленное дыхание (opacity и transform). Сила — `strength × --fx-glow`: при «эффекты: без» свечения нет, как у кнопки `accent`; reduced-motion — свечение стоит.',
      },
    },
  },
} satisfies Meta<typeof Glow>;

export default meta;

type Story = StoryObj<typeof meta>;

const glowOpacity = (canvasElement: HTMLElement) =>
  Number(
    getComputedStyle(canvasElement.querySelector('[style*="--glow-color"]')!, '::before').opacity,
  );

export const Default: Story = {
  name: 'Свечение акцента',
  play: async ({ canvasElement }) => {
    await expect(glowOpacity(canvasElement)).toBeGreaterThan(0);
  },
};

const roles = [
  { name: 'Админ', color: 'oklch(0.72 0.17 25)' },
  { name: 'Модератор', color: 'oklch(0.78 0.14 160)' },
  { name: 'Гость', color: 'oklch(0.75 0.12 250)' },
];

export const RoleColors: Story = {
  name: 'Цвета ролей',
  render: (args) => (
    <Inline gap={6}>
      {roles.map((role) => (
        <Stack key={role.name} gap={2} align="center">
          <Glow {...args} color={role.color}>
            <Avatar name={role.name} size="lg" />
          </Glow>

          <Text size="sm" tone="muted">
            {role.name}
          </Text>
        </Stack>
      ))}
    </Inline>
  ),
};

export const Card: Story = {
  name: 'Вокруг карточки, с дыханием',
  args: { radius: '2xl', spread: 6, blur: 24, strength: 0.5, pulse: true, color: '--accent-2' },
  render: (args) => (
    <Glow {...args}>
      <Surface level={3} p={5} radius="2xl" border style={{ width: 260 }}>
        <Text>В эфире — 12 участников</Text>
      </Surface>
    </Glow>
  ),
};

export const EffectsOff: Story = {
  name: 'Эффекты выключены — без свечения',
  globals: { effects: 'off' },
  play: async ({ canvasElement }) => {
    await expect(glowOpacity(canvasElement)).toBe(0);
  },
};
