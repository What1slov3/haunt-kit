import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { ImagePlus } from 'lucide-react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import {
  AttachmentCard,
  Field,
  FileDropzone,
  Icon,
  Stack,
  Switch,
  usePreventWindowDrop,
} from '@haunt/ui';

const meta = {
  title: 'Поля/FileDropzone',
  component: FileDropzone,
  tags: ['autodocs'],
  args: {
    onFiles: fn(),
    onReject: fn(),
    multiple: true,
    maxFiles: 5,
    maxSize: 8 * 1024 * 1024,
  },
  argTypes: {
    icon: { control: false },
    title: { control: 'text' },
    description: { control: 'text' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 360 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Зона для файлов: перетаскивание и клик (кнопка открывает системный выбор). Над зоной она живая — рамка и подложка цвета акцента, свечение по `--fx-glow`, иконка приподнимается; если по MIME видно, что файлы не подойдут, — тон ошибки ещё до броска. `accept` — как у `<input>`, `maxSize` в байтах, `multiple` + `maxFiles`. Принятые файлы — в `onFiles`, отклонённые — в `onReject` и списком под зоной с TUI-знаком `!` до следующей попытки. Файл, брошенный мимо зоны, браузер открыл бы вместо приложения — экран с зоной включает `usePreventWindowDrop(enabled)`: dragover и drop на окне гасятся только для файлов, зона работает как прежде.',
      },
    },
  },
} satisfies Meta<typeof FileDropzone>;

export default meta;

type Story = StoryObj<typeof meta>;

const zone = (canvas: HTMLElement) => within(canvas).getByRole('button');
const root = (canvas: HTMLElement) => zone(canvas).parentElement as HTMLElement;
const fileInput = (canvas: HTMLElement) =>
  canvas.querySelector<HTMLInputElement>('input[type="file"]') as HTMLInputElement;

const png = (name = 'скриншот.png', size = 1024) =>
  new File([new Uint8Array(size)], name, { type: 'image/png' });

/** Перетаскивание руками: userEvent его не умеет, а Chromium позволяет собрать DataTransfer */
function drag(
  target: Element,
  type: 'dragenter' | 'dragover' | 'dragleave' | 'drop',
  files: File[],
) {
  const dataTransfer = new DataTransfer();

  for (const file of files) dataTransfer.items.add(file);

  target.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer }));
}

export const Default: Story = {};

export const Single: Story = {
  name: 'Один файл',
  args: { multiple: false, maxFiles: undefined, accept: 'image/*', maxSize: 2 * 1024 * 1024 },
};

export const Compact: Story = {
  args: {
    compact: true,
    multiple: false,
    accept: 'image/png,image/jpeg',
    title: 'Аватар сообщества',
    description: 'PNG или JPG · до 2 МБ',
    icon: <Icon icon={ImagePlus} />,
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    await expect(zone(canvasElement)).toBeDisabled();
  },
};

export const InField: Story = {
  render: (args) => (
    <Field label="Вложения" hint="Увидят все участники канала">
      <FileDropzone {...args} />
    </Field>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByLabelText('Вложения')).toHaveAccessibleDescription(
      'Увидят все участники канала',
    );
  },
};

export const DragOver: Story = {
  name: 'Над зоной — живая, бросок отдаёт файлы',
  args: { accept: 'image/*' },
  play: async ({ args, canvasElement }) => {
    const file = png();

    drag(zone(canvasElement), 'dragenter', [file]);

    await waitFor(() => expect(root(canvasElement)).toHaveAttribute('data-drag', 'accept'));

    drag(zone(canvasElement), 'dragover', [file]);
    drag(zone(canvasElement), 'drop', [file]);

    await waitFor(() => expect(root(canvasElement)).not.toHaveAttribute('data-drag'));
    await expect(args.onFiles).toHaveBeenCalledWith([file]);
  },
};

export const DragReject: Story = {
  name: 'Неподходящие файлы видно до броска',
  args: { accept: 'image/*' },
  play: async ({ canvasElement }) => {
    const pdf = new File(['%PDF'], 'отчёт.pdf', { type: 'application/pdf' });

    drag(zone(canvasElement), 'dragenter', [pdf]);

    await waitFor(() => expect(root(canvasElement)).toHaveAttribute('data-drag', 'reject'));
    await expect(zone(canvasElement)).toHaveTextContent('Эти файлы не подойдут');

    drag(zone(canvasElement), 'dragleave', [pdf]);

    await waitFor(() => expect(root(canvasElement)).not.toHaveAttribute('data-drag'));
  },
};

export const ChooseAndReject: Story = {
  name: 'Выбор кликом и ошибки',
  args: { accept: 'image/*', maxSize: 2048 },
  play: async ({ args, canvasElement }) => {
    const ok = png('ok.png', 100);
    const big = png('большой.png', 4096);
    const pdf = new File(['%PDF'], 'отчёт.pdf', { type: 'application/pdf' });

    await userEvent.upload(fileInput(canvasElement), [ok, big, pdf], { applyAccept: false });

    await expect(args.onFiles).toHaveBeenCalledWith([ok]);
    await expect(args.onReject).toHaveBeenCalledOnce();

    const alert = within(canvasElement).getByRole('alert');

    await expect(alert).toHaveTextContent('«большой.png» больше 2 КБ');
    await expect(alert).toHaveTextContent('«отчёт.pdf» — неподходящий формат');
    await expect(zone(canvasElement)).toHaveAttribute('aria-invalid', 'true');
  },
};

export const ClickOpensPicker: Story = {
  name: 'Клик открывает выбор файла',
  play: async ({ canvasElement }) => {
    const input = fileInput(canvasElement);
    let opened = false;

    // Настоящий диалог в headless не открыть — проверяем, что зона нажала скрытый input
    input.addEventListener('click', (event) => {
      event.preventDefault();
      opened = true;
    });

    await userEvent.click(zone(canvasElement));

    await expect(opened).toBe(true);
  },
};

/** Зона и список вложений под ней: так собирается вложение в композере */
export const WithAttachments: Story = {
  render: function WithAttachmentsStory(args) {
    const [files, setFiles] = useState<File[]>([]);

    return (
      <Stack gap={2}>
        <FileDropzone
          {...args}
          compact
          onFiles={(next) => {
            setFiles((current) => [...current, ...next]);
            args.onFiles(next);
          }}
        />

        {files.map((file) => (
          <AttachmentCard
            key={file.name}
            name={file.name}
            size={file.size}
            type={file.type}
            onRemove={() => setFiles((current) => current.filter((item) => item !== file))}
          />
        ))}
      </Stack>
    );
  },
};

/** Экран с зоной включает защиту окна: файл, брошенный мимо, не открывается браузером вместо чата */
export const PreventWindowDrop: Story = {
  name: 'Защита окна от броска мимо зоны',
  render: function PreventWindowDropStory(args) {
    const [guarded, setGuarded] = useState(false);

    usePreventWindowDrop(guarded);

    return (
      <Stack gap={2}>
        <Switch checked={guarded} onCheckedChange={setGuarded} label="usePreventWindowDrop" />
        <FileDropzone {...args} compact />
      </Stack>
    );
  },
  play: async ({ args, canvasElement }) => {
    const dropOnBody = () => {
      const dataTransfer = new DataTransfer();

      dataTransfer.items.add(png());

      const event = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer });

      document.body.dispatchEvent(event);

      return event;
    };

    const toggle = async (checked: boolean) => {
      await userEvent.click(within(canvasElement).getByRole('switch'));
      await expect(within(canvasElement).getByRole('switch')).toHaveAttribute(
        'aria-checked',
        String(checked),
      );
    };

    // Без защиты окно в бросок не вмешивается
    await expect(dropOnBody().defaultPrevented).toBe(false);

    // С защитой мимо зоны — бросок погашен, браузер файл не откроет
    await toggle(true);
    await waitFor(() => expect(dropOnBody().defaultPrevented).toBe(true));

    // В зону — как раньше: файл принят
    drag(root(canvasElement), 'dragenter', [png()]);
    drag(root(canvasElement), 'drop', [png()]);
    await waitFor(() => expect(args.onFiles).toHaveBeenCalled());

    // Выключили — слушатели сняты (эффект — после коммита, поэтому ждём)
    await toggle(false);
    await waitFor(() => expect(dropOnBody().defaultPrevented).toBe(false));
  },
};
