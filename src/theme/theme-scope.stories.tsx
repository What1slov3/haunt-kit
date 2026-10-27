import type { Meta, StoryObj } from '@storybook/react-vite';
import { Bell, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import {
  AmbientBackground,
  Avatar,
  Badge,
  Button,
  Chip,
  DropdownMenu,
  Grid,
  Heading,
  Icon,
  IconButton,
  Inline,
  Input,
  Stack,
  Surface,
  Switch,
  Text,
  ThemeScope,
  type Theme,
} from '@haunt/ui';

import { expectVisible, screen } from '../lib/stories/play-helpers';

/** Фрейм экрана в заданной теме — тот же, что на витрине «Обе темы рядом» */
function ThemeFrame({ theme }: { theme: Theme }) {
  return (
    <ThemeScope
      theme={theme}
      style={{
        position: 'relative',
        isolation: 'isolate',
        overflow: 'hidden',
        padding: 'var(--space-4)',
        background: 'var(--bg)',
        color: 'var(--text)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <AmbientBackground fixed={false} intensity="low" noise={false} reaction="off" />

      <Stack gap={3}>
        <Inline justify="between">
          <Heading level={3} size="lg">
            {theme === 'dark' ? 'Тёмная' : 'Светлая'}
          </Heading>

          <Badge tone={theme === 'dark' ? 'accent' : 'neutral'}>
            {theme === 'dark' ? 'основная' : 'вторичная'}
          </Badge>
        </Inline>

        <Surface level={2} panel p={3}>
          <Stack gap={2}>
            <Inline gap={2}>
              <Avatar name="Мария Орлова" status="online" />

              <Stack gap={0} grow>
                <Text weight="semibold">Мария Орлова</Text>

                <Text size="sm" tone="muted">
                  печатает…
                </Text>
              </Stack>

              <IconButton label="Уведомления" variant="secondary" size="sm">
                <Icon icon={Bell} size="sm" />
              </IconButton>

              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <IconButton label={`Ещё (${theme})`} variant="secondary" size="sm">
                    <Icon icon={MoreHorizontal} size="sm" />
                  </IconButton>
                </DropdownMenu.Trigger>

                <DropdownMenu.Content align="end">
                  <DropdownMenu.Item icon={<Icon icon={Pencil} size="sm" />}>
                    Переименовать
                  </DropdownMenu.Item>

                  <DropdownMenu.Item icon={<Icon icon={Trash2} size="sm" />} danger>
                    Удалить
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            </Inline>

            <Inline gap={1} wrap>
              <Chip selected icon="🔥" count={12} size="sm" />
              <Chip icon="👀" count={3} size="sm" />
            </Inline>
          </Stack>
        </Surface>

        <Input placeholder="Написать сообщение" fullWidth />

        <Inline gap={2} wrap>
          <Button variant="primary">Основная</Button>
          <Button variant="accent">Акцент</Button>
          <Button variant="secondary">Вторичная</Button>
          <Button variant="ghost">Призрак</Button>
        </Inline>

        <Switch label="Уведомления" defaultChecked />
      </Stack>
    </ThemeScope>
  );
}

const meta = {
  title: 'Тема/ThemeScope',
  component: ThemeScope,
  tags: ['autodocs'],
  args: { theme: 'light' },
  argTypes: {
    theme: { control: 'inline-radio', options: ['dark', 'light'] },
    children: { control: false },
  },
  render: (args) => (
    <div style={{ maxWidth: 420 }}>
      <ThemeFrame theme={args.theme} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        component:
          'Контейнер с другой темой: ставит `data-theme` на себя и заводит хост для порталов, чтобы меню и подсказки внутри были в той же теме. Тема всего Storybook — в тулбаре; здесь — тема одного куска экрана.',
      },
    },
  },
} satisfies Meta<typeof ThemeScope>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Light: Story = {};

export const Dark: Story = {
  args: { theme: 'dark' },
};

export const SideBySide: Story = {
  render: () => (
    <Grid minColumnWidth="340px" gap={4}>
      <ThemeFrame theme="dark" />
      <ThemeFrame theme="light" />
    </Grid>
  ),
};

export const PortalInheritsTheme: Story = {
  name: 'Меню внутри в той же теме',
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Ещё (light)' }));

    const menu = await screen().findByRole('menu');

    await expectVisible(menu);
    await waitFor(() =>
      expect(menu.closest('[data-theme]')).toHaveAttribute('data-theme', 'light'),
    );
  },
};
