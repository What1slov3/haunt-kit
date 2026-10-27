import type { Meta, StoryObj } from '@storybook/react-vite';
import { LogOut } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Button, Dialog, Field, Icon, Input, Stack } from '@haunt/ui';

import {
  clickOutside,
  expectFocused,
  expectGone,
  expectVisible,
  pressEscape,
  screen,
} from '../lib/stories/play-helpers';

interface LeaveDialogProps {
  /** sm — подтверждение, md — форма, lg — настройки */
  size?: 'sm' | 'md' | 'lg';
  /** Крестик в углу */
  showClose?: boolean;
  /** Нажатие «Выйти» */
  onConfirm?: () => void;
  defaultOpen?: boolean;
}

/** Подтверждение выхода из сообщества */
function LeaveDialog({ size = 'sm', showClose, onConfirm, defaultOpen }: LeaveDialogProps) {
  return (
    <Dialog.Root defaultOpen={defaultOpen}>
      <Dialog.Trigger asChild>
        <Button variant="danger" iconStart={<Icon icon={LogOut} size="sm" />}>
          Диалог
        </Button>
      </Dialog.Trigger>

      <Dialog.Content size={size} showClose={showClose}>
        <Dialog.Title>Выйти из сообщества?</Dialog.Title>

        <Dialog.Description>
          Вы потеряете доступ к каналам, пока вас не пригласят снова.
        </Dialog.Description>

        <Dialog.Footer>
          <Dialog.Close asChild>
            <Button variant="ghost">Остаться</Button>
          </Dialog.Close>

          <Dialog.Close asChild>
            <Button variant="danger" onClick={onConfirm}>
              Выйти
            </Button>
          </Dialog.Close>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}

const meta = {
  title: 'Всплывающее/Dialog',
  component: LeaveDialog,
  subcomponents: {
    'Dialog.Content': Dialog.Content,
    'Dialog.Footer': Dialog.Footer,
  },
  tags: ['autodocs'],
  args: { size: 'sm', showClose: true, onConfirm: fn() },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Модальный диалог: фон затемнён и размыт, окно выходит из глубины. `Dialog.Title` обязателен для скринридера; без `Dialog.Description` передайте `aria-describedby={undefined}`. Закрывается по Esc, клику по затемнению, крестику и `Dialog.Close`; фокус возвращается на триггер.',
      },
    },
  },
} satisfies Meta<typeof LeaveDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

const trigger = (canvas: HTMLElement) => within(canvas).getByRole('button', { name: 'Диалог' });
const dialog = () => screen().queryByRole('dialog', { name: 'Выйти из сообщества?' });

async function openDialog(canvas: HTMLElement) {
  await userEvent.click(trigger(canvas));
  await expectVisible(await screen().findByRole('dialog', { name: 'Выйти из сообщества?' }));
}

export const Default: Story = {};

export const Open: Story = {
  args: { defaultOpen: true },
  parameters: { docs: { story: { inline: false, height: '320px' } } },
};

export const WithoutClose: Story = {
  args: { defaultOpen: true, showClose: false },
  parameters: { docs: { story: { inline: false, height: '320px' } } },
};

/** Форма в диалоге среднего размера: поле получает фокус первым */
export const WithForm: Story = {
  render: () => (
    <Dialog.Root defaultOpen>
      <Dialog.Trigger asChild>
        <Button>Переименовать</Button>
      </Dialog.Trigger>

      <Dialog.Content size="md">
        <Dialog.Title>Переименовать канал</Dialog.Title>

        <Dialog.Description>Название видят все участники пространства.</Dialog.Description>

        <Stack gap={2} pt={4}>
          <Field label="Название" hint="Строчные буквы, цифры и дефис">
            <Input defaultValue="general" fullWidth />
          </Field>
        </Stack>

        <Dialog.Footer>
          <Dialog.Close asChild>
            <Button variant="ghost">Отмена</Button>
          </Dialog.Close>

          <Dialog.Close asChild>
            <Button variant="accent">Сохранить</Button>
          </Dialog.Close>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  ),
  parameters: { docs: { story: { inline: false, height: '360px' } } },
};

export const LongContent: Story = {
  render: () => (
    <Dialog.Root defaultOpen>
      <Dialog.Trigger asChild>
        <Button>Правила</Button>
      </Dialog.Trigger>

      <Dialog.Content size="lg">
        <Dialog.Title>
          Правила сообщества, которые стоит прочитать до первого сообщения
        </Dialog.Title>

        <Dialog.Description>
          {Array.from(
            { length: 6 },
            () =>
              'Будьте вежливы, не публикуйте чужие личные данные, спорьте с идеями, а не с людьми. ',
          ).join('')}
        </Dialog.Description>

        <Dialog.Footer>
          <Dialog.Close asChild>
            <Button variant="accent">Понятно</Button>
          </Dialog.Close>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  ),
  parameters: { docs: { story: { inline: false, height: '420px' } } },
};

export const ClosesOnEscape: Story = {
  name: 'Закрывается по Esc, фокус на триггере',
  play: async ({ canvasElement }) => {
    await openDialog(canvasElement);

    await pressEscape();

    await expectGone(dialog);
    await expectFocused(trigger(canvasElement));
  },
};

export const ClosesOnOverlayClick: Story = {
  name: 'Закрывается кликом по затемнению',
  play: async ({ canvasElement }) => {
    await openDialog(canvasElement);

    // Затемнение — сосед окна в портале; клик по нему — «снаружи» для DismissableLayer
    const overlay = dialog()?.previousElementSibling;

    await expect(overlay).toBeTruthy();
    await clickOutside(overlay!);

    await expectGone(dialog);
  },
};

export const ClosesOnCloseButton: Story = {
  name: 'Закрывается крестиком и кнопками',
  play: async ({ args, canvasElement }) => {
    await openDialog(canvasElement);
    await userEvent.click(within(dialog()!).getByRole('button', { name: 'Закрыть' }));

    await expectGone(dialog);
    await expectFocused(trigger(canvasElement));

    await openDialog(canvasElement);
    await userEvent.click(within(dialog()!).getByRole('button', { name: 'Выйти' }));

    await expectGone(dialog);
    await expect(args.onConfirm).toHaveBeenCalledOnce();
  },
};
