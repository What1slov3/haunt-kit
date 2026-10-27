import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, waitFor } from 'storybook/test';

import { AttachmentCard, FileDropOverlay, FileDropzone, Stack, Text } from '@haunt/ui';

import { screen } from '../lib/stories/play-helpers';

/** Перетаскивание файлов над окном — настоящими DragEvent с DataTransfer, как их шлёт браузер */
function dragFiles(
  type: 'dragenter' | 'dragover' | 'drop' | 'dragleave',
  files: File[],
  target: Element = document.body,
) {
  const dataTransfer = new DataTransfer();

  for (const file of files) dataTransfer.items.add(file);

  const event = new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer });

  target.dispatchEvent(event);

  return event;
}

const photo = () => new File(['png'], 'закат.png', { type: 'image/png' });
const notes = () => new File(['txt'], 'заметки.txt', { type: 'text/plain' });

const meta = {
  title: 'Поля/FileDropOverlay',
  component: FileDropOverlay,
  tags: ['autodocs'],
  args: {
    onFiles: fn(),
    onReject: fn(),
    multiple: true,
    maxFiles: 10,
    maxSize: 25 * 1024 * 1024,
  },
  argTypes: { icon: { control: false } },
  parameters: {
    docs: {
      description: {
        component:
          'Зона на весь экран: пока над окном тянут файлы, поверх приложения встаёт слой «отпустите, чтобы загрузить», и бросить можно куда угодно. Один на экран — рядом с композером или списком файлов; `title` говорит, куда уйдут файлы («Загрузить в #общий»). Те же правила, что у `FileDropzone` (`accept`, `maxSize`, `multiple`, `maxFiles`): по MIME видно до броска, что файлы не подойдут, — слой в тоне ошибки. Отклонённые — в `onReject`, без обработчика — тостом. Слой не ловит указатель: встроенная `FileDropzone` на том же экране принимает бросок сама, слой файлы второй раз не берёт. Брошенный мимо файл браузер не откроет вместо приложения. Клавиатура и экранные чтецы загружают кнопкой выбора файла — слой только для перетаскивания. Перетащите файл из системы на эту страницу.',
      },
    },
  },
} satisfies Meta<typeof FileDropOverlay>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Над окном тянут файл',
  args: { title: 'Загрузить в #общий' },
  render: function DropStory(args) {
    const [files, setFiles] = useState<File[]>([]);

    return (
      <Stack gap={3} style={{ maxWidth: 420 }}>
        <Text tone="muted">Перетащите файл из системы в любое место окна.</Text>

        {files.map((file) => (
          <AttachmentCard key={file.name} name={file.name} size={file.size} />
        ))}

        <FileDropOverlay
          {...args}
          onFiles={(next) => {
            args.onFiles(next);
            setFiles((current) => [...current, ...next]);
          }}
        />
      </Stack>
    );
  },
  play: async ({ args }) => {
    dragFiles('dragenter', [photo()]);

    const overlay = await screen().findByRole('status');

    await expect(overlay).toHaveTextContent('Загрузить в #общий');
    await expect(overlay).toHaveTextContent('до 25 МБ');

    // Окно разрешает бросок: без preventDefault на dragover браузер открыл бы файл сам
    await expect(dragFiles('dragover', [photo()]).defaultPrevented).toBe(true);

    dragFiles('drop', [photo()]);

    await waitFor(() => expect(args.onFiles).toHaveBeenCalledOnce());
    await expect(screen().queryByRole('status')).toBeNull();
    // Карточка вложения пишет имя дважды: видимое и для скринридера
    await expect((await screen().findAllByText('закат.png')).length).toBeGreaterThan(0);
  },
};

export const Reject: Story = {
  name: 'Не подойдёт — видно до броска',
  args: { accept: 'image/*' },
  play: async ({ args }) => {
    dragFiles('dragenter', [notes()]);

    await expect(await screen().findByRole('status')).toHaveTextContent('Эти файлы не подойдут');

    dragFiles('drop', [notes()]);

    await waitFor(() => expect(args.onReject).toHaveBeenCalledOnce());
    await expect(args.onFiles).not.toHaveBeenCalled();
  },
};

export const Leave: Story = {
  name: 'Увели курсор — слой гаснет',
  play: async () => {
    dragFiles('dragenter', [photo()]);
    await expect(await screen().findByRole('status')).toBeInTheDocument();

    dragFiles('dragleave', [photo()]);
    await waitFor(() => expect(screen().queryByRole('status')).toBeNull());
  },
};

const zoneFiles = fn();

export const WithInlineZone: Story = {
  name: 'Рядом со встроенной зоной: файл берёт тот, на кого бросили',
  render: (args) => (
    <Stack gap={3} style={{ width: 360 }}>
      <FileDropzone onFiles={zoneFiles} title="Аватар пространства" />

      <FileDropOverlay {...args} />
    </Stack>
  ),
  play: async ({ args, canvasElement }) => {
    zoneFiles.mockClear();

    const zone = canvasElement.querySelector('button') as HTMLElement;

    dragFiles('dragenter', [photo()], zone);
    await expect(await screen().findByRole('status')).toBeInTheDocument();

    // Бросили на встроенную зону: она забирает файл, слой гаснет и второй раз его не берёт
    dragFiles('drop', [photo()], zone);

    await waitFor(() => expect(zoneFiles).toHaveBeenCalledOnce());
    await expect(args.onFiles).not.toHaveBeenCalled();
    await waitFor(() => expect(screen().queryByRole('status')).toBeNull());
  },
};
