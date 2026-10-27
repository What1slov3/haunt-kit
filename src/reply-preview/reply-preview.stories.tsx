import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { FieldFrame, ReplyPreview, Textarea } from '@haunt/ui';

const meta = {
  title: 'Сообщество/ReplyPreview',
  component: ReplyPreview,
  tags: ['autodocs'],
  args: {
    author: 'Ада Лавлейс',
    authorColor: 'var(--success)',
    text: 'Собрала **черновик** правил пространства — посмотрите до вечера?\nВторая строка в цитату не идёт.',
    onJump: fn(),
    onClose: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ width: 460 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Цитата ответа: имя автора цветом роли и первая строка исходного сообщения (`replyExcerpt`: без разметки, спойлер закрыт) или «Вложение» / «3 вложения». `inline` — над телом `MessageItem` (линию к аватару рисует строка сообщения), клик — `onJump` к исходному. `composer` — плашка над полем ввода: «Ответ пользователю Имя» и крестик `onClose`. Удалённое исходное — пометка без имени.',
      },
    },
  },
} satisfies Meta<typeof ReplyPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Inline: Story = {
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByRole('button');

    await expect(button).toHaveAccessibleName(/^Ответ на сообщение Ада Лавлейс Собрала черновик/);

    await userEvent.click(button);

    await expect(args.onJump).toHaveBeenCalledTimes(1);
  },
};

export const AttachmentOnly: Story = {
  name: 'Только вложения',
  args: { text: undefined, attachments: 3 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('3 вложения')).toBeVisible();
  },
};

export const TextAndAttachment: Story = {
  name: 'Текст и вложение',
  args: { attachments: 1 },
};

export const Spoiler: Story = {
  name: 'Спойлер закрыт',
  args: { text: 'Финал: убийца — ||дворецкий||' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByText(/дворецкий/)).toBeNull();
  },
};

export const Deleted: Story = { name: 'Исходное удалено', args: { deleted: true } };

export const LongName: Story = {
  name: 'Длинное имя',
  args: { author: 'Очень Длинное Имя Участника Которое Не Влезает В Строку' },
};

export const Composer: Story = {
  name: 'Над композером',
  args: { variant: 'composer' },
  render: (args) => (
    <div>
      <ReplyPreview {...args} />
      <FieldFrame multiline fullWidth style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
        <Textarea bare autoGrow rows={1} placeholder="Сообщение в #общий" aria-label="Сообщение" />
      </FieldFrame>
    </div>
  ),
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Ответ пользователю')).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: 'Отменить ответ' }));
    await expect(args.onClose).toHaveBeenCalledTimes(1);

    await userEvent.click(canvas.getByRole('button', { name: /Ответ пользователю/ }));
    await expect(args.onJump).toHaveBeenCalledTimes(1);
  },
};
