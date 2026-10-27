import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { Heading, Text } from '@haunt/ui';
import { Typewriter } from '@haunt/ui/fx';

const meta = {
  title: 'Эффекты/Typewriter',
  component: Typewriter,
  tags: ['autodocs'],
  args: {
    text: 'Добро пожаловать, путник. Здесь говорят тихо.',
    speed: 40,
    caret: 'always',
    caretShape: 'block',
    trigger: 'mount',
  },
  argTypes: {
    text: { control: 'text' },
    caret: { control: 'inline-radio', options: ['always', 'typing', 'none'] },
    caretShape: { control: 'inline-radio', options: ['block', 'bar'] },
    trigger: { control: 'inline-radio', options: ['mount', 'view'] },
    speed: { control: { type: 'range', min: 10, max: 150, step: 5 } },
  },
  render: (args) => (
    <Heading level={3}>
      <Typewriter {...args} />
    </Heading>
  ),
  parameters: {
    docs: {
      description: {
        component:
          'Печатная машинка из `@haunt/ui/fx` с кареткой кита (`Caret`). Время каждого символа считается заранее — после знаков препинания пауза, строка читается фразами. Несколько строк печатаются, стираются и сменяются (`loop` — по кругу). Ненапечатанный остаток стоит невидимым: печать не двигает соседей. Скринридер читает строку целиком. «Эффекты: без» и reduced-motion — сразу итог.',
      },
    },
  },
} satisfies Meta<typeof Typewriter>;

export default meta;

type Story = StoryObj<typeof meta>;

const root = (canvasElement: HTMLElement) =>
  canvasElement.querySelector('[data-phase]') as HTMLElement;

export const Default: Story = {
  name: 'Печать строки',
  args: { speed: 15 },
  play: async ({ args, canvasElement }) => {
    const text = args.text as string;

    // Доступное имя — вся строка с первого кадра, а не напечатанная часть
    await expect(within(canvasElement).getByRole('heading', { name: text })).toBeInTheDocument();
    await waitFor(() => expect(root(canvasElement)).toHaveAttribute('data-phase', 'done'), {
      timeout: 4000,
    });
  },
};

export const Rotating: Story = {
  name: 'Несколько строк по кругу',
  args: {
    text: ['ищем сервер…', 'проверяем ключи…', 'входим в пространство'],
    loop: true,
    hold: 1200,
    caretShape: 'bar',
  },
};

export const CaretWhileTyping: Story = {
  name: 'Каретка только пока печатает',
  args: { caret: 'typing', speed: 12, text: 'Сообщение отправлено.' },
  render: (args) => (
    <Text size="lg">
      <Typewriter {...args} />
    </Text>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(root(canvasElement)).toHaveAttribute('data-phase', 'done'), {
      timeout: 3000,
    });
    await expect(canvasElement.querySelector('[data-motion-keep]')).toBeNull();
  },
};

export const EffectsOff: Story = {
  name: 'Эффекты выключены — сразу итог',
  globals: { effects: 'off' },
  play: async ({ args, canvasElement }) => {
    await expect(root(canvasElement)).toHaveAttribute('data-phase', 'done');
    await expect(root(canvasElement).querySelector('[aria-hidden]')).toHaveTextContent(
      args.text as string,
    );
  },
};
