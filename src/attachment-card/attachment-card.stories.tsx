import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { AttachmentCard, Stack } from '@haunt/ui';

import { photos } from '../lib/stories/demo-photos';

const meta = {
  title: 'Отображение/AttachmentCard',
  component: AttachmentCard,
  tags: ['autodocs'],
  args: {
    name: 'отчёт-по-ивенту-за-октябрь-2026-финальная-версия.pdf',
    size: 2_480_000,
    type: 'application/pdf',
    onRemove: fn(),
  },
  argTypes: {
    error: { control: 'text' },
    progress: { control: { type: 'range', min: 0, max: 100 } },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 340 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Вложение в композере и сообщении: иконка по виду файла (MIME и расширение) или миниатюра `previewUrl`, имя с обрезкой посередине — расширение и конец имени видны всегда, размер моно. `progress` 0–100 — полоса и процент, `null` — загрузка неизвестной длины, без него — файл загружен. `error` — текст с TUI-знаком `!` и кнопка «повторить» (`onRetry`); `onRemove` — «снять» или «отменить загрузку». `progress={100}` — состояние «готово»: галочка и `completeLabel` вместо полосы. `filtered` — миниатюра через `FilteredImage` (`true` — дизеринг или свой режим), фильтр подгружается лениво.',
      },
    },
  },
} satisfies Meta<typeof AttachmentCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Uploading: Story = {
  args: { progress: 42 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('progressbar', { name: /Загрузка/ })).toHaveAttribute(
      'aria-valuenow',
      '42',
    );
    await expect(canvas.getByText('42%')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Отменить загрузку' })).toBeInTheDocument();
  },
};

export const Indeterminate: Story = {
  name: 'Загрузка неизвестной длины',
  args: { progress: null, name: 'запись-эфира.mp4', type: 'video/mp4', size: 734_003_200 },
};

export const Failed: Story = {
  name: 'Ошибка',
  args: {
    error: 'Файл больше 25 МБ',
    onRetry: fn(),
    name: 'архив-скриншотов.zip',
    type: 'application/zip',
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('alert')).toHaveTextContent('Файл больше 25 МБ');

    await userEvent.click(canvas.getByRole('button', { name: 'Повторить' }));

    await expect(args.onRetry).toHaveBeenCalledOnce();
  },
};

export const Remove: Story = {
  name: 'Снять',
  args: { name: 'main.rs', type: '', size: 4_200 },
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Снять «main.rs»' }));

    await expect(args.onRemove).toHaveBeenCalledOnce();
  },
};

export const MiddleTruncation: Story = {
  name: 'Обрезка посередине',
  play: async ({ canvasElement }) => {
    // На экране середина срезана, но имя целиком доступно скринридеру и в подсказке
    await expect(within(canvasElement).getByText(meta.args.name)).toBeInTheDocument();
    await expect(within(canvasElement).getByTitle(meta.args.name)).toHaveTextContent(
      /версия\.pdf$/,
    );
  },
};

export const Kinds: Story = {
  name: 'Виды файлов',
  render: () => (
    <Stack gap={1.5}>
      <AttachmentCard name="закат.png" type="image/png" size={812_000} />
      <AttachmentCard name="голосовое.ogg" type="audio/ogg" size={96_000} />
      <AttachmentCard name="сборка.tar.gz" type="application/gzip" size={48_000_000} />
      <AttachmentCard name="bot.ts" type="" size={3_100} />
      <AttachmentCard name="заметки.md" type="text/markdown" size={900} />
      <AttachmentCard name="data.bin" type="application/octet-stream" size={1_048_576} />
    </Stack>
  ),
};

export const Complete: Story = {
  name: 'Готово: галочка после 100 %',
  args: { progress: 100 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('status')).toHaveTextContent('Загружено');
    await expect(canvas.queryByRole('progressbar')).toBeNull();
    await expect(canvas.getByRole('status').closest('[data-state]')).toHaveAttribute(
      'data-state',
      'complete',
    );
    await expect(canvas.getByRole('button', { name: /Снять/ })).toBeInTheDocument();
  },
};

const scene = photos.orb.src;

export const FilteredPreview: Story = {
  name: 'Превью через FilteredImage',
  args: { name: 'закат-над-городом.png', type: 'image/png', size: 1_240_000, filtered: true },
  render: (args) => (
    <Stack gap={2}>
      <AttachmentCard {...args} previewUrl={scene} />
      <AttachmentCard {...args} previewUrl={scene} filtered="pixel" progress={64} />
      <AttachmentCard {...args} previewUrl={scene} filtered={false} progress={100} />
    </Stack>
  ),
  play: async ({ canvasElement }) => {
    // Фильтр грузится лениво и рисует кадр на canvas
    await waitFor(() =>
      expect(canvasElement.querySelectorAll('[data-filter="on"]')).toHaveLength(2),
    );
    await expect(canvasElement.querySelector('[data-mode="pixel"]')).not.toBeNull();
  },
};
