import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, spyOn, userEvent, waitFor, within } from 'storybook/test';

import { CopyButton, Inline, Text } from '@haunt/ui';

const meta = {
  title: 'Кнопки/CopyButton',
  component: CopyButton,
  tags: ['autodocs'],
  args: { value: 'https://haunt.app/i/8f3k2', onCopy: fn() },
  argTypes: {
    value: { control: 'text' },
  },
  parameters: {
    docs: {
      description: {
        component:
          '`IconButton` «копировать»: иконка сменяется галочкой на `timeout` (1.5 с), скринридер слышит «Скопировано» из live-области рядом с кнопкой. Сначала Clipboard API, при отказе — старый путь через `execCommand`; если не вышло никак — крестик тоном ошибки, без исключения. `value` может быть функцией — текст соберётся в момент нажатия.',
      },
    },
  },
} satisfies Meta<typeof CopyButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  render: (args) => (
    <Inline gap={2} align="center">
      <CopyButton {...args} size="xs" />
      <CopyButton {...args} size="sm" />
      <CopyButton {...args} size="md" />
      <CopyButton {...args} size="lg" variant="secondary" />
    </Inline>
  ),
};

export const NextToText: Story = {
  name: 'Рядом с id',
  render: (args) => (
    <Inline gap={1} align="center">
      <Text mono size="sm" tone="muted">
        id 1180427736218
      </Text>

      <CopyButton {...args} value="1180427736218" label="Копировать id" size="xs" />
    </Inline>
  ),
};

export const Copies: Story = {
  name: 'Копирует и показывает галочку',
  play: async ({ args, canvasElement }) => {
    // Буфер обмена в headless Chromium без разрешения отказывает — подменяем запись
    const write = spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Копировать' }));

    await expect(write).toHaveBeenCalledWith('https://haunt.app/i/8f3k2');
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Скопировано' })).toBeVisible());
    await expect(canvas.getByRole('status')).toHaveTextContent('Скопировано');
    await expect(args.onCopy).toHaveBeenCalledWith('https://haunt.app/i/8f3k2');

    // Галочка гаснет сама
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Копировать' })).toBeVisible(), {
      timeout: 3000,
    });

    write.mockRestore();
  },
};

export const Fails: Story = {
  name: 'Буфер недоступен — без падения',
  play: async ({ args, canvasElement }) => {
    const write = spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
    const exec = spyOn(document, 'execCommand').mockReturnValue(false);
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Копировать' }));

    await waitFor(() =>
      expect(canvas.getByRole('button', { name: 'Не удалось скопировать' })).toBeVisible(),
    );
    await expect(args.onCopy).not.toHaveBeenCalled();

    write.mockRestore();
    exec.mockRestore();
  },
};

export const LazyValue: Story = {
  name: 'Значение собирается при нажатии',
  args: { value: () => `https://haunt.app/i/${'abc'.toUpperCase()}` },
  play: async ({ canvasElement }) => {
    const write = spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);

    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Копировать' }));

    await expect(write).toHaveBeenCalledWith('https://haunt.app/i/ABC');

    write.mockRestore();
  },
};
