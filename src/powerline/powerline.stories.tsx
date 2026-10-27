import type { Meta, StoryObj } from '@storybook/react-vite';
import { Clock, FolderGit2, GitBranch, Wifi } from 'lucide-react';
import { expect, within } from 'storybook/test';

import { Icon, Powerline, Stack, type PowerlineSegment } from '@haunt/ui';

const prompt: PowerlineSegment[] = [
  { id: 'user', content: 'maria@haunt', tone: 'accent' },
  {
    id: 'path',
    content: '~/spaces/design',
    tone: 'neutral',
    icon: <Icon icon={FolderGit2} size="xs" />,
  },
  { id: 'branch', content: 'main ✓', tone: 'success', icon: <Icon icon={GitBranch} size="xs" /> },
];

const status: PowerlineSegment[] = [
  { id: 'net', content: '42 ms', tone: 'muted', icon: <Icon icon={Wifi} size="xs" /> },
  { id: 'warn', content: '2 предупреждения', tone: 'warning' },
  { id: 'time', content: '14:02', tone: 'info', icon: <Icon icon={Clock} size="xs" /> },
];

const meta = {
  title: 'TUI/Powerline',
  component: Powerline,
  tags: ['autodocs'],
  args: { segments: prompt, 'aria-label': 'Промпт' },
  argTypes: { segments: { control: false } },
  parameters: {
    docs: {
      description: {
        component:
          'Сегменты статуса со стрелками-разделителями, как в shell-промпте. Строка TUI в клетках моно-сетки; разделитель — настоящий знак Powerline (U+E0B0, U+E0B4, U+E0BC) из шрифта глифов кита цвета своего сегмента на заливке соседа: Nerd Font не нужен. Формы — `arrow`, `round`, `slant`; `direction="left"` — правый промпт. Цвета — из токенов: `accent`, `neutral`, `muted`, статусы — заливки `*-strong` с белым текстом. Без TUI — отдельные плашки без стрелок.',
      },
    },
  },
} satisfies Meta<typeof Powerline>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const group = within(canvasElement).getByRole('group', { name: 'Промпт' });
    const [, separator, second] = [...group.children] as HTMLElement[];

    // Разделитель — знак цвета первого сегмента на заливке второго
    await expect(separator).toHaveTextContent('\ue0b0');
    await expect(getComputedStyle(separator as HTMLElement).backgroundColor).toBe(
      getComputedStyle(second as HTMLElement).backgroundColor,
    );
  },
};

export const Shapes: Story = {
  name: 'Формы',
  render: (args) => (
    <Stack gap={2} align="start">
      <Powerline {...args} shape="arrow" />
      <Powerline {...args} shape="round" />
      <Powerline {...args} shape="slant" />
    </Stack>
  ),
};

export const RightPrompt: Story = {
  name: 'Правый промпт',
  args: { segments: status, direction: 'left', 'aria-label': 'Статус' },
};

export const Small: Story = {
  name: 'Маленький',
  args: { size: 'sm' },
};

export const TuiOff: Story = {
  name: 'Без TUI',
  globals: { tui: 'off' },
};
