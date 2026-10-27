import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Kbd, StatusBar, Surface } from '@haunt/ui';

const meta = {
  title: 'Отображение/StatusBar',
  component: StatusBar,
  subcomponents: { 'StatusBar.Item': StatusBar.Item },
  tags: ['autodocs'],
  args: {
    children: (
      <>
        <StatusBar.Item icon={<Kbd size="sm">Ctrl+K</Kbd>}>поиск</StatusBar.Item>
        <StatusBar.Item icon={<Kbd size="sm">↑</Kbd>}>изменить последнее</StatusBar.Item>
        <StatusBar.Item tone="accent">#general</StatusBar.Item>
      </>
    ),
    end: (
      <>
        <StatusBar.Item tone="success" dot>
          4 в сети
        </StatusBar.Item>
        <StatusBar.Item>12:40</StatusBar.Item>
      </>
    ),
  },
  argTypes: {
    children: { control: false },
    end: { control: false },
  },
  decorators: [
    (Story) => (
      <Surface level={2} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: 80 }} />

        <Story />
      </Surface>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Строка состояния в духе TUI: моно, тонкая верхняя граница, подсказки клавиш. Кладётся внизу панели или окна; `end` прижат вправо. Моно и строка остаются и при `data-tui="off"` — это иерархия, а не декор.',
      },
    },
  },
} satisfies Meta<typeof StatusBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Tones: Story = {
  args: {
    children: (
      <>
        <StatusBar.Item>default</StatusBar.Item>
        <StatusBar.Item tone="accent">accent</StatusBar.Item>
        <StatusBar.Item tone="success">success</StatusBar.Item>
        <StatusBar.Item tone="warning">warning</StatusBar.Item>
        <StatusBar.Item tone="danger">danger</StatusBar.Item>
      </>
    ),
    end: undefined,
  },
};

export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 360 }}>
        <Story />
      </div>
    ),
  ],
};

function InteractiveBar() {
  const [offline, setOffline] = useState(false);

  return (
    <StatusBar
      end={
        <StatusBar.Item
          tone={offline ? 'warning' : 'success'}
          dot
          onClick={() => setOffline((value) => !value)}
        >
          {offline ? 'offline' : 'online'}
        </StatusBar.Item>
      }
    >
      <StatusBar.Item icon={<Kbd size="sm">Ctrl+K</Kbd>}>поиск</StatusBar.Item>
    </StatusBar>
  );
}

/** Пункт с `onClick` — кнопка: переключить статус, открыть панель задач */
export const Interactive: Story = {
  render: () => <InteractiveBar />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'online' }));

    await expect(canvas.getByRole('button', { name: 'offline' })).toBeInTheDocument();
  },
};
