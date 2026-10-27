import type { Meta, StoryObj } from '@storybook/react-vite';
import { Radio, Sparkles } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Banner, Button, Icon } from '@haunt/ui';

const meta = {
  title: 'Отображение/Banner',
  component: Banner,
  tags: ['autodocs'],
  args: {
    variant: 'neutral',
    children: 'Haunt 0.2 вышел: голосовые каналы и треды',
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['neutral', 'accent', 'rainbow'] },
    children: { control: 'text' },
    icon: { control: false },
    action: { control: false },
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Полоса объявления над экраном, как Banner у Fumadocs. `rainbow` — их радужный вариант, переведённый в акцент пространства: размытый градиент дрейфует, пока включены эффекты. Закрытие хранит вызывающий: `onDismiss` только показывает крестик.',
      },
    },
  },
} satisfies Meta<typeof Banner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Neutral: Story = {};

export const Accent: Story = {
  args: { variant: 'accent', icon: <Icon icon={Sparkles} size="sm" /> },
};

export const Rainbow: Story = {
  args: {
    variant: 'rainbow',
    children: 'В «Котиках» идёт эфир',
    icon: <Icon icon={Radio} size="sm" />,
  },
};

export const WithAction: Story = {
  name: 'С действием',
  args: {
    variant: 'accent',
    action: (
      <Button size="sm" variant="ghost">
        Что нового
      </Button>
    ),
  },
};

export const Dismissible: Story = {
  name: 'Закрывается',
  args: { onDismiss: fn() },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Скрыть' }));
    await expect(args.onDismiss).toHaveBeenCalledOnce();
  },
};
