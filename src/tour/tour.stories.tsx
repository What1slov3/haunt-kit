import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { Button, Inline, Input, Stack, Text, Tour, type TourStep } from '@haunt/ui';

import {
  expectFocused,
  expectGone,
  expectVisible,
  pressEscape,
  screen,
} from '../lib/stories/play-helpers';

const steps: TourStep[] = [
  {
    target: '[data-tour="channels"]',
    title: 'Каналы пространства',
    content: 'Текстовые и голосовые каналы — слева. Перетащите, чтобы поменять порядок.',
    side: 'right',
  },
  {
    target: '[data-tour="composer"]',
    title: 'Композер',
    content: 'Enter — отправить, Shift+Enter — новая строка, / — команды.',
    side: 'top',
  },
  {
    target: '[data-tour="invite"]',
    title: 'Пригласите друзей',
    content: 'Нажмите кнопку — она работает и во время тура.',
    side: 'bottom',
    align: 'end',
    clickable: true,
  },
  {
    target: '[data-tour="settings"]',
    title: 'Настройки',
    content: 'Внизу страницы — тема, акцент и уровень эффектов.',
    side: 'top',
  },
];

interface TourDemoProps {
  onFinish?: () => void;
  onSkip?: (step: number) => void;
  onInvite?: () => void;
  targetClickable?: boolean;
  /** Шаги вместо демо-набора — для историй про цель, которой нет */
  tourSteps?: TourStep[];
}

/** Экран пространства с кнопкой «Начать тур»: каналы, композер, приглашение и настройки далеко внизу */
function TourDemo({
  onFinish,
  onSkip,
  onInvite,
  targetClickable,
  tourSteps = steps,
}: TourDemoProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '180px 1fr',
        alignItems: 'start',
        gap: 16,
        width: 720,
      }}
    >
      <Stack gap={1} data-tour="channels" style={{ padding: 8, border: '1px solid var(--border)' }}>
        <Text size="sm" tone="muted">
          # general
        </Text>
        <Text size="sm" tone="muted">
          # random
        </Text>
        <Text size="sm" tone="muted">
          🔊 Голос
        </Text>
      </Stack>

      <Stack gap={3}>
        <Inline gap={2} justify="between">
          <Button onClick={() => setOpen(true)}>Начать тур</Button>

          <Button data-tour="invite" variant="secondary" onClick={onInvite}>
            Пригласить
          </Button>
        </Inline>

        <Input data-tour="composer" placeholder="Сообщение в #general" aria-label="Композер" />

        {/* Цель за экраном: тур прокручивает к ней сам */}
        <div style={{ height: 1200 }} />

        <Inline>
          <Button data-tour="settings" variant="ghost">
            Настройки
          </Button>
        </Inline>

        <div style={{ height: 240 }} />
      </Stack>

      <Tour
        steps={tourSteps}
        open={open}
        onOpenChange={setOpen}
        onFinish={onFinish}
        onSkip={onSkip}
        targetClickable={targetClickable}
      />
    </div>
  );
}

const meta = {
  title: 'Всплывающее/Tour',
  component: TourDemo,
  subcomponents: { Tour },
  tags: ['autodocs'],
  args: { onFinish: fn(), onSkip: fn(), onInvite: fn() },
  argTypes: { tourSteps: { control: false } },
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Онбординг по шагам. Шаги — данными: `target` (селектор или функция), `title`, `content`, `side` / `align` карточки, `clickable`, `padding`. Затемнение — один слой с `clip-path: path(evenodd, …)`: окно вокруг цели прозрачно и для глаза, и для кликов, поэтому цель с `clickable` нажимается сквозь затемнение, а без него клики гасит прозрачный щит. Переход окна между целями — WAAPI по `clip-path` (у пути всегда один набор команд, без цели окно схлопывается в точку), при reduced-motion — сразу. Карточка — стекло `Popover` с виртуальным якорем Radix Popper: сторона, разворот у края, слежение за прокруткой. «Назад / Далее / Пропустить», прогресс `2 / 5` моно, Esc — пропустить (`onSkip(step)`), «Готово» — `onFinish`. Фокус заперт в карточке и после закрытия возвращается на место. Цель за экраном прокручивается в центр. Слой грузится лениво при первом открытии.',
      },
    },
  },
} satisfies Meta<typeof TourDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const start = (canvas: HTMLElement) => within(canvas).getByRole('button', { name: 'Начать тур' });
const card = () => screen().queryByRole('dialog');
const cardButton = (name: string) => within(card()!).getByRole('button', { name });
// Первая карточка: тур сначала прокручивает к цели и меряет её в кадре — под полным прогоном дольше секунды
const firstCard = (name: string) => screen().findByRole('dialog', { name }, { timeout: 5000 });

/** Что под точкой в центре элемента — так проверяется, проходит ли клик сквозь окно */
const hitAtCenter = (element: Element) => {
  const rect = element.getBoundingClientRect();

  return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
};

export const StepsThrough: Story = {
  name: 'Шаги: Далее / Назад / Готово, прогресс',
  play: async ({ args, canvasElement }) => {
    await userEvent.click(start(canvasElement));

    const dialog = await firstCard('Каналы пространства');

    await expectVisible(dialog);
    await expect(within(dialog).getByText('1 / 4')).toBeInTheDocument();
    await expectFocused(cardButton('Далее'));
    // На первом шаге назад некуда
    await expect(within(dialog).queryByRole('button', { name: 'Назад' })).toBeNull();

    await userEvent.click(cardButton('Далее'));
    await expect(await screen().findByRole('dialog', { name: 'Композер' })).toBeInTheDocument();
    await expect(within(card()!).getByText('2 / 4')).toBeInTheDocument();

    await userEvent.click(cardButton('Назад'));
    await expect(
      await screen().findByRole('dialog', { name: 'Каналы пространства' }),
    ).toBeInTheDocument();

    await userEvent.click(cardButton('Далее'));
    await userEvent.click(cardButton('Далее'));
    await userEvent.click(cardButton('Далее'));

    // Последний шаг: цель была за экраном — прокручена в видимую область, «Далее» стало «Готово»
    await expect(await screen().findByRole('dialog', { name: 'Настройки' })).toBeInTheDocument();
    await waitFor(() => {
      const rect = within(canvasElement)
        .getByRole('button', { name: 'Настройки' })
        .getBoundingClientRect();

      expect(rect.top).toBeGreaterThanOrEqual(0);
      expect(rect.bottom).toBeLessThanOrEqual(window.innerHeight);
    });

    await userEvent.click(cardButton('Готово'));
    await expectGone(card);
    await expect(args.onFinish).toHaveBeenCalledOnce();
    await expect(args.onSkip).not.toHaveBeenCalled();
    await expectFocused(start(canvasElement));
  },
};

export const EscapeSkips: Story = {
  name: 'Esc — пропустить, фокус обратно',
  play: async ({ args, canvasElement }) => {
    await userEvent.click(start(canvasElement));
    await expectVisible(await firstCard('Каналы пространства'));
    await userEvent.click(cardButton('Далее'));
    await screen().findByRole('dialog', { name: 'Композер' });

    await pressEscape();
    await expectGone(card);
    await expect(args.onSkip).toHaveBeenCalledWith(1);
    await expect(args.onFinish).not.toHaveBeenCalled();
    await expectFocused(start(canvasElement));

    // Новый показ — снова с первого шага
    await userEvent.click(start(canvasElement));
    await expect(
      await screen().findByRole('dialog', { name: 'Каналы пространства' }),
    ).toBeInTheDocument();
    await userEvent.click(cardButton('Пропустить'));
    await expectGone(card);
    await expect(args.onSkip).toHaveBeenLastCalledWith(0);
  },
};

export const FocusTrap: Story = {
  name: 'Фокус заперт в карточке',
  play: async ({ canvasElement }) => {
    await userEvent.click(start(canvasElement));
    await expectVisible(await firstCard('Каналы пространства'));
    await expectFocused(cardButton('Далее'));

    // Tab с последней кнопки идёт на первую, а не на страницу под затемнением
    await userEvent.tab();
    await expectFocused(cardButton('Пропустить'));
    await userEvent.tab({ shift: true });
    await expectFocused(cardButton('Далее'));

    await pressEscape();
    await expectGone(card);
  },
};

export const ClickThroughWindow: Story = {
  name: 'Окно: цель видна и (по флагу) кликабельна',
  play: async ({ args, canvasElement }) => {
    const channels = canvasElement.querySelector('[data-tour="channels"]')!;
    const invite = within(canvasElement).getByRole('button', { name: 'Пригласить' });

    await userEvent.click(start(canvasElement));
    await expectVisible(await firstCard('Каналы пространства'));

    // Шаг без clickable: в окне — щит, клик до цели не дойдёт; мимо окна — затемнение
    await waitFor(() => expect(channels.contains(hitAtCenter(channels))).toBe(false));
    await expect(hitAtCenter(invite)).not.toBe(invite);

    await userEvent.click(cardButton('Далее'));
    await userEvent.click(cardButton('Далее'));
    await screen().findByRole('dialog', { name: 'Пригласите друзей' });

    // clickable: окно прозрачно для кликов, цель под курсором — сама кнопка (окно доехало до неё)
    await waitFor(() => expect(invite.contains(hitAtCenter(invite))).toBe(true), { timeout: 2000 });
    const hit = hitAtCenter(invite) as HTMLElement;

    hit.click();
    await expect(args.onInvite).toHaveBeenCalledOnce();
    // Клик по цели тур не закрывает
    await expect(card()).not.toBeNull();

    await pressEscape();
    await expectGone(card);
  },
};

export const MissingTarget: Story = {
  name: 'Цели нет — карточка по центру',
  args: {
    tourSteps: [
      {
        target: '[data-tour="nowhere"]',
        title: 'Добро пожаловать',
        content: 'Короткий тур по Haunt.',
      },
    ],
  },
  play: async ({ args, canvasElement }) => {
    await userEvent.click(start(canvasElement));

    const dialog = await firstCard('Добро пожаловать');

    await expectVisible(dialog);
    await expect(within(dialog).getByText('1 / 1')).toBeInTheDocument();

    await userEvent.click(cardButton('Готово'));
    await expectGone(card);
    await expect(args.onFinish).toHaveBeenCalledOnce();
  },
};
