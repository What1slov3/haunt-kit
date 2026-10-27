import type { Meta, StoryObj } from '@storybook/react-vite';
import { Bold, ChevronDown, Code, Italic, Send } from 'lucide-react';
import { expect, userEvent, within } from 'storybook/test';

import { Button, ButtonGroup, DropdownMenu, Icon, IconButton } from '@haunt/ui';

import { expectVisible, pressEscape, screen } from '../lib/stories/play-helpers';

const meta = {
  title: 'Кнопки/ButtonGroup',
  component: ButtonGroup,
  tags: ['autodocs'],
  args: { label: 'Форматирование' },
  argTypes: { children: { control: false } },
  parameters: {
    docs: {
      description: {
        component:
          'Группа `Button` / `IconButton` одного размера. Склеенная (по умолчанию) — общая рамка, скругление только по краям, у залитых — тонкий разделитель; так собирается кнопка с меню. `attached={false}` — обычный ряд.',
      },
    },
  },
} satisfies Meta<typeof ButtonGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Attached: Story = {
  render: (args) => (
    <ButtonGroup {...args}>
      <IconButton label="Жирный" variant="secondary">
        <Icon icon={Bold} />
      </IconButton>

      <IconButton label="Курсив" variant="secondary">
        <Icon icon={Italic} />
      </IconButton>

      <IconButton label="Код" variant="secondary">
        <Icon icon={Code} />
      </IconButton>
    </ButtonGroup>
  ),
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('group', { name: 'Форматирование' }),
    ).toBeVisible();
  },
};

/** Кнопка с меню: основное действие + выбор варианта */
export const Split: Story = {
  args: { label: 'Отправка' },
  render: (args) => (
    <ButtonGroup {...args}>
      <Button variant="accent" iconStart={<Icon icon={Send} size="sm" />}>
        Отправить
      </Button>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <IconButton label="Варианты отправки" variant="accent">
            <Icon icon={ChevronDown} />
          </IconButton>
        </DropdownMenu.Trigger>

        <DropdownMenu.Content align="end">
          <DropdownMenu.Item>Отправить позже</DropdownMenu.Item>
          <DropdownMenu.Item>Отправить без звука</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </ButtonGroup>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Варианты отправки' }));
    await expectVisible(await screen().findByRole('menuitem', { name: 'Отправить позже' }));

    await pressEscape();
  },
};

export const Secondary: Story = {
  args: { label: 'Вид' },
  render: (args) => (
    <ButtonGroup {...args}>
      <Button>День</Button>
      <Button>Неделя</Button>
      <Button>Месяц</Button>
    </ButtonGroup>
  ),
};

export const Spaced: Story = {
  args: { label: 'Действия', attached: false },
  render: (args) => (
    <ButtonGroup {...args}>
      <Button variant="ghost">Отмена</Button>
      <Button variant="accent">Сохранить</Button>
    </ButtonGroup>
  ),
};
