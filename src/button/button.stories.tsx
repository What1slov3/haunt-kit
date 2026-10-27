import type { Meta, StoryObj } from '@storybook/react-vite';
import { Send, UserPlus } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Button, Icon, Inline } from '@haunt/ui';

const meta = {
  title: 'Кнопки/Button',
  component: Button,
  tags: ['autodocs'],
  args: {
    children: 'Отправить',
    variant: 'secondary',
    size: 'md',
    onClick: fn(),
  },
  argTypes: {
    iconStart: { control: false },
    iconEnd: { control: false },
    asChild: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Кнопка с текстом. 24 / 28 / 32 px — та же шкала, что у полей. `primary` — светлая инверсия, `accent` — цвет пространства. Нажатие вдавливает сразу, отпускание возвращает мягко; под курсором внутри кнопки — прожектор (уровень эффектов). Дополнения: `arrow`, `shortcut`, `count`, `holdToConfirm`; группа — `ButtonGroup`. `loading` блокирует кнопку и не меняет её ширину.',
      },
    },
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { variant: 'primary', children: 'Основная' },
};

export const Accent: Story = {
  args: { variant: 'accent', children: 'Акцентная' },
};

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Вторичная' },
};

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'Призрачная' },
};

export const Danger: Story = {
  args: { variant: 'danger', children: 'Удалить' },
};

export const Sizes: Story = {
  render: (args) => (
    <Inline gap={2}>
      <Button {...args} size="sm">
        Маленькая 24
      </Button>

      <Button {...args} size="md">
        Средняя 28
      </Button>

      <Button {...args} size="lg">
        Большая 32
      </Button>
    </Inline>
  ),
};

export const WithIcons: Story = {
  render: (args) => (
    <Inline gap={2}>
      <Button {...args} variant="accent" iconStart={<Icon icon={Send} size="sm" />}>
        Отправить
      </Button>

      <Button {...args} iconEnd={<Icon icon={UserPlus} size="sm" />}>
        Пригласить
      </Button>
    </Inline>
  ),
};

/** Стрелка сдвигается вперёд на наведении — для «продолжить», «открыть», «к документации» */
export const Arrow: Story = {
  args: { variant: 'primary', arrow: true, children: 'Начать' },
};

/** Подсказка сочетания — только подпись, клавиши слушает экран */
export const Shortcut: Story = {
  render: (args) => (
    <Inline gap={2}>
      <Button {...args} variant="accent" shortcut="Ctrl+Enter">
        Отправить
      </Button>

      <Button {...args} shortcut="Esc">
        Отмена
      </Button>

      <Button {...args} size="sm" variant="ghost" shortcut="Ctrl+K">
        Поиск
      </Button>
    </Inline>
  ),
};

export const Count: Story = {
  render: (args) => (
    <Inline gap={2}>
      <Button {...args} variant="ghost" count={12}>
        Участники
      </Button>

      <Button {...args} variant="accent" count={3}>
        Упоминания
      </Button>
    </Inline>
  ),
};

/**
 * Подтверждение удержанием для необратимого: заливка идёт слева направо, отпустили раньше — откат.
 * Клавиатурой — удерживать Space или Enter
 */
export const HoldToConfirm: Story = {
  args: {
    variant: 'danger',
    holdToConfirm: 400,
    onConfirm: fn(),
    children: 'Удалить канал',
  },
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: /Удалить канал/ });

    // Короткое нажатие — не подтверждение
    await userEvent.click(button);
    await expect(args.onConfirm).not.toHaveBeenCalled();

    await userEvent.pointer({ keys: '[MouseLeft>]', target: button });
    await new Promise((resolve) => setTimeout(resolve, 500));
    await userEvent.pointer({ keys: '[/MouseLeft]', target: button });

    await expect(args.onConfirm).toHaveBeenCalledOnce();
  },
};

/** С иконкой спиннер встаёт на её место, текст остаётся — видно, что именно грузится */
export const LoadingWithIcon: Story = {
  args: {
    variant: 'accent',
    loading: true,
    iconStart: <Icon icon={Send} size="sm" />,
    children: 'Отправляем',
  },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: /Отправляем/ });

    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute('data-loading', 'inline');
  },
};

export const Loading: Story = {
  args: { variant: 'primary', loading: true, children: 'Сохраняем' },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: /Сохраняем/ });

    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute('aria-busy', 'true');
  },
};

export const Disabled: Story = {
  args: { disabled: true, children: 'Выключена' },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Выключена' });

    await expect(button).toBeDisabled();
    // Выключенная кнопка не ловит курсор вовсе: ни подсветки при наведении, ни нажатия
    await expect(button).toHaveStyle({ pointerEvents: 'none' });
  },
};

export const Clickable: Story = {
  args: { variant: 'accent', children: 'Нажми' },
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Нажми' }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};

/** asChild — стили кнопки на ребёнке: ссылка выглядит кнопкой, но остаётся `<a>` */
export const AsLink: Story = {
  args: {
    asChild: true,
    children: <a href="#as-link">Ссылка как кнопка</a>,
  },
};

export const LongText: Story = {
  args: {
    fullWidth: true,
    children: 'Пригласить всех участников голосового канала в новое пространство',
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 240 }}>
        <Story />
      </div>
    ),
  ],
};
