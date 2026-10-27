import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Button, Inline, toast, type ToastOptions } from '@haunt/ui';

import { expectGone, expectVisible, screen } from '../lib/stories/play-helpers';

interface ToastDemoProps extends ToastOptions {
  /** Подпись кнопки, которая показывает тост */
  trigger?: string;
}

/**
 * Кнопка, которая зовёт `toast.show()`. Сам `<Toaster />` в Storybook рендерит декоратор — как в
 * приложении, один на всё дерево.
 */
function ToastDemo({ trigger = 'Показать тост', ...options }: ToastDemoProps) {
  return <Button onClick={() => toast.show(options)}>{trigger}</Button>;
}

const meta = {
  title: 'Всплывающее/Toast',
  component: ToastDemo,
  tags: ['autodocs'],
  args: {
    title: 'Приглашение отправлено',
    description: 'Мария получит письмо в течение минуты',
    tone: 'success',
    duration: 5000,
  },
  argTypes: {
    tone: {
      control: 'inline-radio',
      options: ['neutral', 'success', 'warning', 'danger', 'info'],
    },
    title: { control: 'text' },
    description: { control: 'text' },
    action: { control: false },
  },
  // Очередь тостов — модуль вне React: без очистки тост одной истории доживал бы до следующей
  beforeEach: () => {
    toast.clear();
  },
  parameters: {
    docs: {
      description: {
        component:
          'Уведомления: `toast.show()` / `toast.success()` / `toast.error()` можно звать откуда угодно, в том числе из сервисов; `<Toaster />` — один на приложение, внутри `ThemeProvider`. Справа внизу, не больше четырёх; F8 переводит фокус на тосты.',
      },
    },
  },
} satisfies Meta<typeof ToastDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

/* Radix Toast: <li> без роли; объявление для скринридера — отдельный скрытый span */
const toastItem = (text: string) =>
  Array.from(document.querySelectorAll('li[data-state]')).find((item) =>
    item.textContent?.includes(text),
  ) ?? null;

async function findToast(text: string): Promise<HTMLElement> {
  let found: Element | null = null;

  await waitFor(() => {
    found = toastItem(text);
    expect(found).not.toBeNull();
  });

  await expectVisible(found!);

  return found! as HTMLElement;
}

export const Success: Story = {};

export const Neutral: Story = {
  args: { tone: 'neutral', title: 'Ссылка скопирована', description: undefined },
};

export const Warning: Story = {
  args: { tone: 'warning', title: 'Нет соединения', description: 'Пробуем переподключиться…' },
};

export const Danger: Story = {
  args: {
    tone: 'danger',
    title: 'Не удалось отправить',
    description:
      'Сервер не ответил. Очень длинное описание, которое должно переноситься на несколько строк и не ломать раскладку тоста.',
  },
};

export const Info: Story = {
  args: {
    tone: 'info',
    title: 'Доступно обновление',
    description: 'Перезапустите, чтобы применить',
  },
};

export const Persistent: Story = {
  args: { tone: 'neutral', title: 'Висит, пока не закроют', duration: 0, description: undefined },
};

/** Все тона разом — посмотреть стопку справа внизу */
export const AllTones: Story = {
  render: () => (
    <Inline gap={2} wrap>
      <Button onClick={() => toast.show({ title: 'Нейтральный' })}>neutral</Button>
      <Button onClick={() => toast.success('Сохранено')}>success</Button>
      <Button onClick={() => toast.show({ title: 'Осторожно', tone: 'warning' })}>warning</Button>
      <Button onClick={() => toast.error('Ошибка', { description: 'Сервер вернул 500' })}>
        danger
      </Button>
      <Button onClick={() => toast.show({ title: 'К сведению', tone: 'info' })}>info</Button>
    </Inline>
  ),
};

export const ShowAndClose: Story = {
  name: 'Показывается и закрывается крестиком',
  args: { tone: 'danger', title: 'Не удалось отправить', duration: 0 },
  play: async ({ canvasElement }) => {
    toast.clear();

    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Показать тост' }));

    const item = await findToast('Не удалось отправить');

    await userEvent.click(within(item).getByRole('button', { name: 'Закрыть' }));

    await expectGone(() => toastItem('Не удалось отправить'));
  },
};

export const ActionGivesNewToast: Story = {
  name: 'Действие даёт новый тост',
  args: {
    duration: 0,
    action: { label: 'Отменить', onClick: () => toast.show({ title: 'Отменено' }) },
  },
  play: async ({ canvasElement }) => {
    toast.clear();

    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Показать тост' }));

    const item = await findToast('Приглашение отправлено');

    await userEvent.click(within(item).getByRole('button', { name: 'Отменить' }));

    await findToast('Отменено');
    await expect(screen().getAllByText('Отменено').length).toBeGreaterThan(0);
  },
};
