import type { Meta, StoryObj } from '@storybook/react-vite';
import { Settings } from 'lucide-react';
import { expect, userEvent, within } from 'storybook/test';

import { Button, Icon, IconButton, Tooltip } from '@haunt/ui';

import { expectGone, expectVisible, screen } from '../lib/stories/play-helpers';

const meta = {
  title: 'Всплывающее/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  args: {
    content: 'Подсказка по наведению и фокусу',
    children: <Button>Наведи</Button>,
    side: 'top',
    align: 'center',
  },
  argTypes: {
    children: { control: false },
    content: { control: 'text' },
    open: { control: 'boolean' },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '48px 96px' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Подсказка по наведению и фокусу. Провайдер (общая задержка 400 мс) — в `ThemeProvider`. Гаснет сразу, как курсор ушёл с триггера: внутри нет ничего кликабельного. Триггер должен принимать ref.',
      },
    },
  },
} satisfies Meta<typeof Tooltip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithShortcut: Story = {
  args: {
    content: 'Настройки',
    shortcut: 'Ctrl+,',
    children: (
      <IconButton label="Настройки">
        <Icon icon={Settings} />
      </IconButton>
    ),
  },
};

export const Open: Story = {
  args: { defaultOpen: true },
  parameters: { docs: { story: { inline: false, height: '140px' } } },
};

export const Sides: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
      {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
        <Tooltip key={side} content={side} side={side} defaultOpen>
          <Button size="sm">{side}</Button>
        </Tooltip>
      ))}
    </div>
  ),
  parameters: { docs: { story: { inline: false, height: '160px' } } },
};

export const LongContent: Story = {
  args: {
    defaultOpen: true,
    content:
      'Длинная подсказка переносится по словам и не уходит за край экрана: ширина ограничена в стилях',
  },
  parameters: { docs: { story: { inline: false, height: '180px' } } },
};

export const ShowsOnHover: Story = {
  name: 'Появляется по наведению, гаснет при уходе',
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('button', { name: 'Наведи' });

    await userEvent.hover(trigger);
    await expectVisible(await screen().findByRole('tooltip'));

    await userEvent.unhover(trigger);
    await expectGone(() => screen().queryByRole('tooltip'));
  },
};

export const ShowsOnFocus: Story = {
  name: 'Появляется по фокусу, гаснет при потере',
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('button', { name: 'Наведи' });

    await userEvent.tab();
    await expect(trigger).toHaveFocus();
    await expectVisible(await screen().findByRole('tooltip'));

    await userEvent.tab();
    await expectGone(() => screen().queryByRole('tooltip'));
  },
};
