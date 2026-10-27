import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import {
  Badge,
  Button,
  DropdownMenu,
  Heading,
  Inline,
  SignalScope,
  signalAccents,
  signalFonts,
  Stack,
  Text,
  ThemeScope,
} from '@haunt/ui';

import { expectGone, expectVisible, pressEscape, screen } from '../lib/stories/play-helpers';

function Sample() {
  return (
    <Stack gap={3}>
      <Heading level={3}>Ночной рейд 07</Heading>

      <Text tone="muted">Сбор в 21:00 у южного шлюза.</Text>

      <Inline gap={2}>
        <Button variant="accent">Пойду</Button>
        <Button variant="secondary">Позже</Button>
        <Badge tone="accent">live</Badge>
      </Inline>
    </Stack>
  );
}

const meta = {
  title: 'Сигнал/SignalScope',
  component: SignalScope,
  tags: ['autodocs'],
  args: { font: 'archivo', accent: 'lime', children: <Sample /> },
  argTypes: {
    font: { control: 'select', options: signalFonts },
    accent: { control: 'select', options: signalAccents },
    children: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Контейнер в стиле «сигнал»: `data-style="signal"`, шрифт (`data-signal-font`) и кислотный акцент (`data-signal-accent`). Всплывающее внутри порталится в хост с теми же атрибутами — меню и подсказки не теряют стиль. Нужен импорт `@haunt/ui/signal` один раз в приложении.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 480 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SignalScope>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { style: { padding: 16, background: 'var(--bg)' } },
};

export const Paper: Story = {
  name: 'Бумага (светлая тема)',
  render: (args) => (
    <ThemeScope theme="light">
      <SignalScope {...args} style={{ padding: 16, background: 'var(--bg)' }} />
    </ThemeScope>
  ),
};

export const Accents: Story = {
  name: 'Акценты',
  render: (args) => (
    <Stack gap={2}>
      {signalAccents.map((accent) => (
        <SignalScope
          key={accent}
          {...args}
          accent={accent}
          style={{ padding: 12, background: 'var(--bg)' }}
        />
      ))}
    </Stack>
  ),
};

export const PortalsKeepStyle: Story = {
  name: 'Меню внутри — в том же стиле',
  render: (args) => (
    <SignalScope {...args} style={{ padding: 16, background: 'var(--bg)' }}>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button variant="secondary">Меню</Button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Content>
          <DropdownMenu.Label>Событие</DropdownMenu.Label>
          <DropdownMenu.Item>Пойду</DropdownMenu.Item>
          <DropdownMenu.Item>Позже</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </SignalScope>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Меню' }));

    const menu = await screen().findByRole('menu');

    await expectVisible(menu);
    await expect(menu.closest('[data-style="signal"]')).not.toBeNull();
    await pressEscape();
    await expectGone(() => screen().queryByRole('menu'));
  },
};
