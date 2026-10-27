import type { Meta, StoryObj } from '@storybook/react-vite';
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, Underline } from 'lucide-react';
import { expect, userEvent, within } from 'storybook/test';

import { Icon, ToggleGroup } from '@haunt/ui';

const meta = {
  title: 'Кнопки/ToggleGroup',
  component: ToggleGroup.Root,
  subcomponents: { 'ToggleGroup.Item': ToggleGroup.Item },
  tags: ['autodocs'],
  args: {
    type: 'single',
    defaultValue: 'all',
    size: 'md',
    'aria-label': 'Фильтр',
  },
  argTypes: {
    type: {
      control: 'inline-radio',
      options: ['single', 'multiple'],
      description: 'single — один активный пункт, multiple — несколько',
    },
  },
  render: (args) => (
    <ToggleGroup.Root {...args}>
      <ToggleGroup.Item value="all">Все</ToggleGroup.Item>
      <ToggleGroup.Item value="unread">Непрочитанные</ToggleGroup.Item>
      <ToggleGroup.Item value="mentions">Упоминания</ToggleGroup.Item>
    </ToggleGroup.Root>
  ),
  parameters: {
    docs: {
      description: {
        component:
          'Группа переключателей — компактный сегмент для режимов отображения (для навигации по содержимому — `Tabs`). Стрелки двигают фокус между пунктами, пробел и Enter выбирают.',
      },
    },
  },
} satisfies Meta<typeof ToggleGroup.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

const item = (canvas: HTMLElement, name: string) => within(canvas).getByRole('radio', { name });

export const Single: Story = {
  name: 'Один выбранный',
  play: async ({ canvasElement }) => {
    await expect(item(canvasElement, 'Все')).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(item(canvasElement, 'Непрочитанные'));

    await expect(item(canvasElement, 'Непрочитанные')).toHaveAttribute('aria-checked', 'true');
    await expect(item(canvasElement, 'Все')).toHaveAttribute('aria-checked', 'false');
  },
};

export const KeyboardNavigation: Story = {
  name: 'Стрелки двигают фокус',
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await expect(item(canvasElement, 'Все')).toHaveFocus();

    await userEvent.keyboard('{ArrowRight}');
    await expect(item(canvasElement, 'Непрочитанные')).toHaveFocus();

    await userEvent.keyboard('{ArrowRight}');
    await userEvent.keyboard(' ');
    await expect(item(canvasElement, 'Упоминания')).toHaveAttribute('aria-checked', 'true');

    // Фокус ходит по кругу: с последнего пункта — на первый
    await userEvent.keyboard('{ArrowRight}');
    await expect(item(canvasElement, 'Все')).toHaveFocus();
  },
};

export const Small: Story = {
  args: { size: 'sm' },
};

export const IconsOnly: Story = {
  args: { defaultValue: 'left', 'aria-label': 'Выравнивание' },
  render: (args) => (
    <ToggleGroup.Root {...args}>
      <ToggleGroup.Item value="left" label="По левому краю">
        <Icon icon={AlignLeft} size="sm" />
      </ToggleGroup.Item>

      <ToggleGroup.Item value="center" label="По центру">
        <Icon icon={AlignCenter} size="sm" />
      </ToggleGroup.Item>

      <ToggleGroup.Item value="right" label="По правому краю">
        <Icon icon={AlignRight} size="sm" />
      </ToggleGroup.Item>
    </ToggleGroup.Root>
  ),
};

export const Multiple: Story = {
  args: { type: 'multiple', defaultValue: ['bold'], 'aria-label': 'Начертание' },
  render: (args) => (
    <ToggleGroup.Root {...args}>
      <ToggleGroup.Item value="bold" label="Жирный">
        <Icon icon={Bold} size="sm" />
      </ToggleGroup.Item>

      <ToggleGroup.Item value="italic" label="Курсив">
        <Icon icon={Italic} size="sm" />
      </ToggleGroup.Item>

      <ToggleGroup.Item value="underline" label="Подчёркнутый">
        <Icon icon={Underline} size="sm" />
      </ToggleGroup.Item>
    </ToggleGroup.Root>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Курсив' }));

    await expect(canvas.getByRole('button', { name: 'Жирный' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(canvas.getByRole('button', { name: 'Курсив' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  },
};

export const DisabledItem: Story = {
  render: (args) => (
    <ToggleGroup.Root {...args}>
      <ToggleGroup.Item value="all">Все</ToggleGroup.Item>
      <ToggleGroup.Item value="archive" disabled>
        Архив
      </ToggleGroup.Item>
    </ToggleGroup.Root>
  ),
};
