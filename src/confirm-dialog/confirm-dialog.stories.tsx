import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { Button, ConfirmDialog, DropdownMenu, Icon, IconButton, toast } from '@haunt/ui';

import {
  clickOutside,
  expectFocused,
  expectGone,
  expectVisible,
  pressEscape,
  screen,
} from '../lib/stories/play-helpers';

interface DeleteChannelProps {
  title?: string;
  description?: string;
  confirmLabel?: string;
  tone?: 'danger' | 'accent';
  /** Текст, который надо ввести */
  confirmText?: string;
  /** Действие выполняется столько миллисекунд (Promise); 0 — сразу */
  delay?: number;
  /** Действие завершится ошибкой */
  fail?: boolean;
  /** Вызов действия */
  onConfirm?: () => void;
  defaultOpen?: boolean;
}

/** Удаление канала: кнопка открывает подтверждение, действие может идти асинхронно */
function DeleteChannel({
  title = 'Удалить канал #general?',
  description = 'История сообщений пропадёт у всех участников. Это не отменить.',
  confirmLabel = 'Удалить канал',
  tone,
  confirmText,
  delay = 0,
  fail = false,
  onConfirm,
  defaultOpen,
}: DeleteChannelProps) {
  const run = () => {
    onConfirm?.();

    if (!delay) return;

    return new Promise<void>((resolve, reject) =>
      setTimeout(() => {
        if (!fail) return resolve();

        toast.error('Не удалось удалить канал');
        reject(new Error('network'));
      }, delay),
    );
  };

  return (
    <ConfirmDialog
      defaultOpen={defaultOpen}
      trigger={
        <Button variant="danger" iconStart={<Icon icon={Trash2} size="sm" />}>
          Удалить канал
        </Button>
      }
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      tone={tone}
      confirmText={confirmText}
      onConfirm={run}
    />
  );
}

const meta = {
  title: 'Всплывающее/ConfirmDialog',
  component: DeleteChannel,
  subcomponents: { ConfirmDialog },
  tags: ['autodocs'],
  args: { onConfirm: fn() },
  argTypes: { tone: { control: 'inline-radio', options: ['danger', 'accent'] } },
  parameters: {
    docs: {
      description: {
        component:
          'Подтверждение на Radix AlertDialog: заголовок, описание, кнопка действия (`danger` — необратимое, `accent` — важное), «Отмена». Клик мимо не закрывает, фокус при открытии — на «Отмене». `confirmText` — «введите название, чтобы подтвердить»: кнопка активна только при точном совпадении, Enter в поле подтверждает. `onConfirm` может вернуть Promise: кнопка показывает загрузку, отмена и Esc заблокированы, диалог закрывается после выполнения; при ошибке остаётся открытым. Для мелкого необратимого (удалить сообщение) — `Button holdToConfirm` вместо диалога.',
      },
    },
  },
} satisfies Meta<typeof DeleteChannel>;

export default meta;

type Story = StoryObj<typeof meta>;

const trigger = (canvas: HTMLElement) =>
  within(canvas).getByRole('button', { name: 'Удалить канал' });
const dialog = () => screen().queryByRole('alertdialog');
const confirmButton = () => within(dialog()!).getByRole('button', { name: /Удалить канал/ });

async function openDialog(canvas: HTMLElement) {
  await userEvent.click(trigger(canvas));
  await expectVisible(
    await screen().findByRole('alertdialog', { name: 'Удалить канал #general?' }),
  );
}

const docsFrame = { docs: { story: { inline: false, height: '360px' } } };

export const Default: Story = {};

export const Open: Story = { args: { defaultOpen: true }, parameters: docsFrame };

export const WithConfirmText: Story = {
  name: 'Введите название',
  args: { defaultOpen: true, confirmText: 'general' },
  parameters: docsFrame,
};

export const Accent: Story = {
  args: {
    defaultOpen: true,
    tone: 'accent',
    title: 'Опубликовать правила?',
    description: 'Участники увидят их при входе в пространство. Изменить можно в любой момент.',
    confirmLabel: 'Опубликовать',
  },
  parameters: docsFrame,
};

export const CancelIsFocused: Story = {
  name: 'Фокус на «Отмене», Esc закрывает без действия',
  play: async ({ args, canvasElement }) => {
    await openDialog(canvasElement);
    await expectFocused(within(dialog()!).getByRole('button', { name: 'Отмена' }));

    await pressEscape();

    await expectGone(dialog);
    await expectFocused(trigger(canvasElement));
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
};

export const IgnoresOverlayClick: Story = {
  name: 'Клик мимо не закрывает',
  play: async ({ canvasElement }) => {
    await openDialog(canvasElement);

    const overlay = dialog()?.previousElementSibling;

    await expect(overlay).toBeTruthy();
    await clickOutside(overlay!);
    // Дать слою шанс закрыться, если бы он реагировал на клик снаружи
    await new Promise((resolve) => setTimeout(resolve, 200));

    await expect(dialog()).toBeVisible();
  },
};

export const RequiresConfirmText: Story = {
  name: 'Кнопка активна только при совпадении',
  args: { confirmText: 'general' },
  play: async ({ args, canvasElement }) => {
    await openDialog(canvasElement);

    const input = within(dialog()!).getByRole('textbox', { name: /Введите general/ });

    await expectFocused(input);
    await expect(confirmButton()).toBeDisabled();

    await userEvent.keyboard('General');
    await expect(confirmButton()).toBeDisabled();

    await userEvent.clear(input);
    await userEvent.keyboard('general {Enter}');

    await expectGone(dialog);
    await expect(args.onConfirm).toHaveBeenCalledOnce();
  },
};

export const AsyncConfirm: Story = {
  name: 'Promise: загрузка, затем закрытие',
  args: { delay: 400 },
  play: async ({ args, canvasElement }) => {
    await openDialog(canvasElement);
    await userEvent.click(confirmButton());

    await expect(confirmButton()).toHaveAttribute('aria-busy', 'true');
    await expect(within(dialog()!).getByRole('button', { name: 'Отмена' })).toBeDisabled();

    // Пока идёт действие, Esc не закрывает: иначе человек не узнает, удалилось ли
    await pressEscape();
    await expect(dialog()).not.toBeNull();

    await expectGone(dialog);
    await expect(args.onConfirm).toHaveBeenCalledOnce();
  },
};

export const AsyncFailure: Story = {
  name: 'Promise отклонён: диалог остаётся открытым',
  args: { delay: 200, fail: true },
  play: async ({ canvasElement }) => {
    toast.clear();
    await openDialog(canvasElement);
    await userEvent.click(confirmButton());

    await waitFor(() => expect(confirmButton()).not.toHaveAttribute('aria-busy'));
    await expect(dialog()).toBeVisible();
    await expect(confirmButton()).toBeEnabled();

    toast.clear();
  },
};

/** Чаще всего подтверждение открывают из меню: триггера у диалога нет, open — снаружи */
function ChannelMenu({ onConfirm }: { onConfirm?: () => void }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <IconButton label="Меню канала">
            <Icon icon={MoreHorizontal} size="sm" />
          </IconButton>
        </DropdownMenu.Trigger>

        <DropdownMenu.Content align="start">
          <DropdownMenu.Item
            danger
            icon={<Icon icon={Trash2} size="sm" />}
            onSelect={() => setConfirming(true)}
          >
            Удалить канал
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Удалить канал #general?"
        description="История сообщений пропадёт у всех участников."
        confirmLabel="Удалить канал"
        onConfirm={() => onConfirm?.()}
      />
    </>
  );
}

export const FromMenu: Story = {
  name: 'Из меню: фокус возвращается на кнопку меню',
  render: (args) => <ChannelMenu onConfirm={args.onConfirm} />,
  play: async ({ args, canvasElement }) => {
    const menuButton = within(canvasElement).getByRole('button', { name: 'Меню канала' });

    await userEvent.click(menuButton);
    await userEvent.click(await screen().findByRole('menuitem', { name: 'Удалить канал' }));
    await expectVisible(await screen().findByRole('alertdialog'));

    await pressEscape();

    await expectGone(dialog);
    await expectFocused(menuButton);
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
};
