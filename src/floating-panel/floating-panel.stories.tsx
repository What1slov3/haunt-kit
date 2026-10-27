import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Mic, PhoneOff, Volume2 } from 'lucide-react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import {
  Avatar,
  Button,
  FloatingPanel,
  Icon,
  IconButton,
  Inline,
  Stack,
  Text,
  type FloatingPanelProps,
} from '@haunt/ui';

import { screen } from '../lib/stories/play-helpers';

function Voice() {
  return (
    <Stack gap={2} p={3}>
      <Inline gap={2}>
        <Avatar name="Мария Орлова" size="md" speaking />
        <Avatar name="Иван Лебедев" size="md" />
        <Avatar name="Аня" size="md" />
      </Inline>

      <Text size="sm" tone="muted">
        3 участника · 00:12:41
      </Text>

      <Inline gap={1}>
        <IconButton label="Микрофон" size="sm" variant="secondary">
          <Icon icon={Mic} size="sm" />
        </IconButton>

        <IconButton label="Выйти" size="sm" variant="danger">
          <Icon icon={PhoneOff} size="sm" />
        </IconButton>
      </Inline>
    </Stack>
  );
}

function Demo(props: Partial<FloatingPanelProps>) {
  const [open, setOpen] = useState(true);

  return (
    <Stack gap={2} align="start">
      <Button size="sm" onClick={() => setOpen((value) => !value)}>
        {open ? 'Скрыть голос' : 'Показать голос'}
      </Button>

      <Text size="sm" tone="muted">
        Тащите за шапку к краю или углу — прилипнет. Свернуть — в пилюлю.
      </Text>

      {open && (
        <FloatingPanel
          title="Голос: #общий"
          pill={
            <Inline gap={1.5}>
              <Icon icon={Volume2} size="xs" /> #общий · 3
            </Inline>
          }
          onClose={() => setOpen(false)}
          {...props}
        >
          <Voice />
        </FloatingPanel>
      )}
    </Stack>
  );
}

const position = (element: Element) => {
  const match = /translate3d\(([-\d.]+)px, ([-\d.]+)px/.exec(
    (element as HTMLElement).style.transform,
  );

  return { x: Number(match?.[1]), y: Number(match?.[2]) };
};

function pointer(type: string, target: EventTarget, clientX: number, clientY: number) {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: 9,
      pointerType: 'mouse',
      isPrimary: true,
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      clientX,
      clientY,
    }),
  );
}

const meta = {
  title: 'Всплывающее/FloatingPanel',
  component: Demo,
  tags: ['autodocs'],
  args: { onCollapsedChange: fn() },
  parameters: {
    docs: {
      // Каждая история в своём iframe: панель fixed, на общей странице все встали бы в один угол
      story: { inline: false, iframeHeight: 360 },
      description: {
        component:
          'Плавающее окно внутри приложения — голос поверх всего, картинка в картинке. Тянется за шапку и прилипает к краям и углам ближе `snapThreshold`; прижатая к краю панель едет за ним при изменении окна, свободная остаётся, пока влезает. Размер — за любой угол (`minSize` / `maxSize`). Свернуть — в пилюлю в том же углу, развернуть — кнопкой в ней. Двигается только transform, прилипание доезжает переходом. Место, размер и свёрнутость — в localStorage (`autoSaveId`). Не модальная: фокус не ловит. Шапка в фокусе: стрелки двигают (с Shift — быстрее), Alt+стрелки меняют размер. Порталится в хост скоупа, стекло как у всего плавающего. Геометрия — чистые функции `floating-geometry.ts`.',
      },
    },
  },
} satisfies Meta<typeof Demo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async () => {
    const panel = await screen().findByRole('region', { name: 'Голос: #общий' });
    const box = panel.getBoundingClientRect();

    // По умолчанию — правый нижний угол с отступом 12 px
    await expect(Math.round(box.right)).toBe(window.innerWidth - 12);
    await expect(Math.round(box.bottom)).toBe(window.innerHeight - 12);
  },
};

export const KeyboardMove: Story = {
  name: 'Стрелки двигают, Alt+стрелки — размер',
  play: async () => {
    const panel = await screen().findByRole('region', { name: 'Голос: #общий' });
    const header = panel.querySelector<HTMLElement>('[tabindex="0"]');

    if (!header) throw new Error('нет шапки');

    const before = position(panel);

    header.focus();
    await userEvent.keyboard('{ArrowLeft}{ArrowUp}');
    await waitFor(() => expect(position(panel)).toEqual({ x: before.x - 16, y: before.y - 16 }));

    const width = panel.getBoundingClientRect().width;

    await userEvent.keyboard('{Alt>}{ArrowRight}{/Alt}');
    await waitFor(() => expect(panel.getBoundingClientRect().width).toBe(width + 16));
  },
};

export const SnapToEdge: Story = {
  name: 'Прилипает к краю',
  args: { defaultCorner: 'bottom-right', autoSaveId: undefined },
  play: async () => {
    const panel = await screen().findByRole('region', { name: 'Голос: #общий' });
    const header = panel.querySelector<HTMLElement>('[tabindex="0"]');

    if (!header) throw new Error('нет шапки');

    const box = header.getBoundingClientRect();
    const x = box.left + 40;
    const y = box.top + box.height / 2;
    const start = position(panel);
    // Отпускаем в 60 px от левого края: ближе порога 72 — прилипнет к отступу 12; до низа 100 px — по y свободна
    const dx = 60 - start.x;

    pointer('pointerdown', header, x, y);
    pointer('pointermove', header, x + dx / 2, y - 100);
    pointer('pointermove', header, x + dx, y - 100);
    pointer('pointerup', header, x + dx, y - 100);

    await waitFor(() => expect(position(panel).x).toBe(12));
    await expect(position(panel).y).toBe(start.y - 100);
  },
};

export const Collapse: Story = {
  name: 'Свернуть в пилюлю',
  play: async ({ args }) => {
    const panel = await screen().findByRole('region', { name: 'Голос: #общий' });

    await userEvent.click(within(panel).getByRole('button', { name: 'Свернуть' }));
    await expect(args.onCollapsedChange).toHaveBeenCalledWith(true);

    const expand = await screen().findByRole('button', { name: 'Развернуть' });
    const pill = expand.parentElement as HTMLElement;

    // Пилюля в том же углу
    await waitFor(() =>
      expect(Math.round(pill.getBoundingClientRect().right)).toBe(window.innerWidth - 12),
    );

    await userEvent.click(expand);
    await expect(await screen().findByText('3 участника · 00:12:41')).toBeVisible();
  },
};

export const TopLeft: Story = {
  name: 'Слева сверху, без изменения размера',
  args: { defaultCorner: 'top-left', resizable: false, defaultSize: { width: 280, height: 160 } },
};
