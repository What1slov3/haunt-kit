import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, mocked, userEvent, waitFor, within } from 'storybook/test';

import { Button, Resizable, Text, type ResizableRootProps } from '@haunt/ui';

import { expectFocused } from '../lib/stories/play-helpers';

function Pane({ title, hint }: { title: string; hint: string }) {
  return (
    <div style={{ display: 'grid', gap: 4, padding: 12 }}>
      <Text weight="medium">{title}</Text>
      <Text size="sm" tone="muted">
        {hint}
      </Text>
    </div>
  );
}

/** Раскладка десктопа: каналы | чат | участники; ширины в процентах, с пределами */
function MessengerLayout(props: ResizableRootProps) {
  return (
    <div
      style={{
        height: 280,
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        background: 'var(--panel-2)',
      }}
    >
      <Resizable.Root {...props}>
        <Resizable.Panel defaultSize={22} minSize={15} maxSize={35}>
          <Pane title="Каналы" hint="15–35 %" />
        </Resizable.Panel>

        <Resizable.Handle aria-label="Ширина списка каналов" />

        <Resizable.Panel minSize={30} style={{ background: 'var(--panel-3)' }}>
          <Pane title="Чат" hint="не уже 30 %" />
        </Resizable.Panel>

        <Resizable.Handle aria-label="Ширина списка участников" />

        <Resizable.Panel defaultSize={20} minSize={12} maxSize={30}>
          <Pane title="Участники" hint="12–30 %" />
        </Resizable.Panel>
      </Resizable.Root>
    </div>
  );
}

const meta = {
  title: 'Раскладка/Resizable',
  component: MessengerLayout,
  subcomponents: {
    'Resizable.Root': Resizable.Root,
    'Resizable.Panel': Resizable.Panel,
    'Resizable.Handle': Resizable.Handle,
  },
  tags: ['autodocs'],
  args: { direction: 'horizontal', step: 5, onResize: fn() },
  argTypes: { direction: { control: 'inline-radio', options: ['horizontal', 'vertical'] } },
  parameters: {
    docs: {
      description: {
        component:
          "Панели с ручками-разделителями: ширина сайдбара и списка участников. Ручка — линия в 1 px с широкой зоной захвата, на наведении (с задержкой) и при перетаскивании загорается акцентом. Перетаскивание — pointer-события на окне; клавиатура по шаблону WAI-ARIA «window splitter»: `role=\"separator\"`, `aria-valuenow / min / max`, стрелки вдоль оси на `step` %, Home / End — к пределам. Размеры — проценты (число или `'30%'`) или пиксели (`'240px'`): пиксельная панель держит ширину при смене размера окна, прибавку забирают гибкие. Ручка растит соседку, а место отдают панели с другой стороны по очереди — каскад, когда ближняя упёрлась в `minSize`. `collapsible` + `collapsedSize` — сворачивание: перетаскивание за половину пути к свёрнутому размеру, Enter или двойной клик на ручке; без сворачиваемой соседки двойной клик — сброс к `defaultSize`. `onResize` — каждый шаг, `onResizeEnd(sizes, layout)` — конец жеста (`layout` в единицах панелей — готовые `defaultSize`), `autoSaveId` — то же в localStorage.",
      },
    },
  },
} satisfies Meta<typeof MessengerLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Редактор над превью: та же ручка, горизонтальная */
export const Vertical: Story = {
  render: (args) => (
    <div
      style={{
        height: 320,
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
      }}
    >
      <Resizable.Root {...args} direction="vertical">
        <Resizable.Panel defaultSize={60} minSize={25}>
          <Pane title="Сообщение" hint="не ниже 25 %" />
        </Resizable.Panel>

        <Resizable.Handle aria-label="Высота превью" />

        <Resizable.Panel minSize={20}>
          <Pane title="Превью" hint="не ниже 20 %" />
        </Resizable.Panel>
      </Resizable.Root>
    </div>
  ),
};

const handle = (canvas: HTMLElement, name: string) =>
  within(canvas).getByRole('separator', { name });

export const Keyboard: Story = {
  name: 'Стрелки, Home / End',
  play: async ({ args, canvasElement }) => {
    const channels = handle(canvasElement, 'Ширина списка каналов');

    await expect(channels).toHaveAttribute('aria-valuenow', '22');
    await expect(channels).toHaveAttribute('aria-valuemin', '15');
    await expect(channels).toHaveAttribute('aria-valuemax', '35');

    await userEvent.tab();
    await expectFocused(channels);

    await userEvent.keyboard('{ArrowRight}');
    await expect(channels).toHaveAttribute('aria-valuenow', '27');
    await expect(args.onResize).toHaveBeenLastCalledWith([27, 53, 20]);

    await userEvent.keyboard('{End}');
    await expect(channels).toHaveAttribute('aria-valuenow', '35');

    await userEvent.keyboard('{Home}');
    await expect(channels).toHaveAttribute('aria-valuenow', '15');

    // Стрелки поперёк оси не двигают ручку и остаются странице
    await userEvent.keyboard('{ArrowDown}');
    await expect(channels).toHaveAttribute('aria-valuenow', '15');
  },
};

export const NeighbourLimits: Story = {
  name: 'Пределы соседки ограничивают ручку',
  play: async ({ canvasElement }) => {
    const members = handle(canvasElement, 'Ширина списка участников');

    // Чат (58 %) не уже 30 %, участники 12–30 %: из общих 78 % чату остаётся 48…66 %
    await expect(members).toHaveAttribute('aria-valuenow', '58');
    await expect(members).toHaveAttribute('aria-valuemin', '48');
    await expect(members).toHaveAttribute('aria-valuemax', '66');
  },
};

export const DragAndReset: Story = {
  name: 'Перетаскивание и сброс двойным кликом',
  play: async ({ args, canvasElement }) => {
    const channels = handle(canvasElement, 'Ширина списка каналов');
    const rect = channels.getBoundingClientRect();
    const root = channels.parentElement!.getBoundingClientRect();
    // Место под панели — ширина Root без двух ручек по 1 px
    const tenPercent = (root.width - 2) / 10;
    const pointer = (type: string, clientX: number, target: EventTarget) =>
      target.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          button: 0,
          pointerType: 'mouse',
          clientX,
          clientY: rect.top + 10,
        }),
      );

    pointer('pointerdown', rect.left, channels);
    await waitFor(() => expect(channels).toHaveAttribute('data-dragging'));

    pointer('pointermove', rect.left + tenPercent, window);
    await waitFor(() => expect(channels).toHaveAttribute('aria-valuenow', '32'));

    // Дальше предела не тянется
    pointer('pointermove', rect.left + tenPercent * 5, window);
    await waitFor(() => expect(channels).toHaveAttribute('aria-valuenow', '35'));

    pointer('pointerup', rect.left + tenPercent * 5, window);
    await waitFor(() => expect(channels).not.toHaveAttribute('data-dragging'));

    await userEvent.dblClick(channels);
    await expect(channels).toHaveAttribute('aria-valuenow', '22');
    await expect(args.onResize).toHaveBeenLastCalledWith([22, 58, 20]);
  },
};

/** Сайдбар 240 px и чат: окно растягивают — сайдбар остаётся 240, прибавку забирает чат */
function PixelLayout(props: ResizableRootProps) {
  const [wide, setWide] = useState(false);

  return (
    <div style={{ display: 'grid', gap: 8, justifyItems: 'start' }}>
      <Button size="sm" onClick={() => setWide((value) => !value)}>
        {wide ? 'Уже' : 'Шире'}
      </Button>

      <div
        data-testid="frame"
        style={{
          width: wide ? 900 : 600,
          height: 200,
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          background: 'var(--panel-2)',
        }}
      >
        <Resizable.Root {...props}>
          <Resizable.Panel defaultSize="240px" minSize="180px" maxSize="360px">
            <Pane title="Каналы" hint="240 px, 180–360 px" />
          </Resizable.Panel>

          <Resizable.Handle aria-label="Ширина списка каналов" />

          <Resizable.Panel minSize={30} style={{ background: 'var(--panel-3)' }}>
            <Pane title="Чат" hint="забирает остаток" />
          </Resizable.Panel>
        </Resizable.Root>
      </div>
    </div>
  );
}

const panelOf = (canvas: HTMLElement, title: string) =>
  within(canvas).getByText(title).closest<HTMLElement>('[data-resizable-panel]')!;

const widthOf = (element: Element) => element.getBoundingClientRect().width;

export const Pixels: Story = {
  name: 'Пиксели: сайдбар 240 px',
  render: (args) => <PixelLayout {...args} />,
  play: async ({ canvasElement }) => {
    const sidebar = panelOf(canvasElement, 'Каналы');
    const frame = within(canvasElement).getByTestId('frame');

    await waitFor(() => expect(widthOf(sidebar)).toBeCloseTo(240, 0));

    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Шире' }));
    await waitFor(() => expect(widthOf(frame)).toBeCloseTo(900, 0));
    await waitFor(() => expect(widthOf(sidebar)).toBeCloseTo(240, 0));

    // Пиксельные пределы переводятся в проценты по текущему окну
    handle(canvasElement, 'Ширина списка каналов').focus();
    await userEvent.keyboard('{End}');
    await waitFor(() => expect(widthOf(sidebar)).toBeCloseTo(360, 0));
  },
};

export const Cascade: Story = {
  name: 'Каскад: соседка на минимуме — сжимается дальняя',
  args: { onResize: fn() },
  render: (args) => (
    <div
      style={{
        height: 240,
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
      }}
    >
      <Resizable.Root {...args}>
        <Resizable.Panel defaultSize={22} minSize={15} maxSize={35}>
          <Pane title="Каналы" hint="15–35 %" />
        </Resizable.Panel>

        <Resizable.Handle aria-label="Ширина списка каналов" />

        <Resizable.Panel minSize={30} style={{ background: 'var(--panel-3)' }}>
          <Pane title="Чат" hint="не уже 30 %" />
        </Resizable.Panel>

        <Resizable.Handle aria-label="Ширина списка участников" />

        <Resizable.Panel defaultSize={20} minSize={12} maxSize={40}>
          <Pane title="Участники" hint="12–40 %" />
        </Resizable.Panel>
      </Resizable.Root>
    </div>
  ),
  play: async ({ args, canvasElement }) => {
    // Каналы до 35 %: 13 % отдаёт чат, участники не двигаются
    handle(canvasElement, 'Ширина списка каналов').focus();
    await userEvent.keyboard('{End}');
    await expect(args.onResize).toHaveBeenLastCalledWith([35, 45, 20]);

    // Ручка участников влево: чат упирается в 30 %, дальше место отдают каналы
    handle(canvasElement, 'Ширина списка участников').focus();
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}');

    const last = mocked(args.onResize!).mock.lastCall![0];

    await expect(last[0]).toBeCloseTo(30);
    await expect(last[1]).toBeCloseTo(30);
    await expect(last[2]).toBeCloseTo(40);
  },
};

function CollapsibleLayout(props: ResizableRootProps) {
  return (
    <div
      style={{
        height: 220,
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        background: 'var(--panel-2)',
      }}
    >
      <Resizable.Root {...props}>
        <Resizable.Panel defaultSize="220px" minSize="160px" collapsible>
          <Pane title="Каналы" hint="Enter или двойной клик на ручке — свернуть" />
        </Resizable.Panel>

        <Resizable.Handle aria-label="Ширина списка каналов" />

        <Resizable.Panel style={{ background: 'var(--panel-3)' }}>
          <Pane title="Чат" hint="забирает место свёрнутых" />
        </Resizable.Panel>

        <Resizable.Handle aria-label="Ширина списка участников" />

        <Resizable.Panel defaultSize={22} minSize={15} collapsible collapsedSize="48px">
          <Pane title="Участники" hint="свёрнутые — рейл 48 px" />
        </Resizable.Panel>
      </Resizable.Root>
    </div>
  );
}

export const Collapsible: Story = {
  name: 'Сворачивание: Enter, двойной клик, перетаскивание',
  args: { onResizeEnd: fn() },
  render: (args) => <CollapsibleLayout {...args} />,
  play: async ({ args, canvasElement }) => {
    const sidebar = panelOf(canvasElement, 'Каналы');
    const members = panelOf(canvasElement, 'Участники');
    const channels = handle(canvasElement, 'Ширина списка каналов');

    await waitFor(() => expect(widthOf(sidebar)).toBeCloseTo(220, 0));

    channels.focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(sidebar).toHaveAttribute('data-collapsed'));
    await expect(widthOf(sidebar)).toBe(0);
    // Свёрнутая в ноль панель не ловит Tab
    await expect(sidebar).toHaveAttribute('inert');
    await expect(args.onResizeEnd).toHaveBeenCalled();

    // Разворачивается в прежние 220 px
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(sidebar).not.toHaveAttribute('data-collapsed'));
    await waitFor(() => expect(widthOf(sidebar)).toBeCloseTo(220, 0));

    // Правая сворачивается в рейл 48 px двойным кликом — и остаётся доступной
    await userEvent.dblClick(handle(canvasElement, 'Ширина списка участников'));
    await waitFor(() => expect(members).toHaveAttribute('data-collapsed'));
    await expect(widthOf(members)).toBeCloseTo(48, 0);
    await expect(members).not.toHaveAttribute('inert');

    // Перетаскивание: до половины пути от минимума (160 px) к нулю — держится у минимума, дальше — свёрнута
    const rect = channels.getBoundingClientRect();
    const pointer = (type: string, clientX: number, target: EventTarget) =>
      target.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          button: 0,
          pointerType: 'mouse',
          clientX,
          clientY: rect.top + 10,
        }),
      );

    pointer('pointerdown', rect.left, channels);
    pointer('pointermove', rect.left - 100, window);
    await waitFor(() => expect(widthOf(sidebar)).toBeCloseTo(160, 0));
    await expect(sidebar).not.toHaveAttribute('data-collapsed');

    pointer('pointermove', rect.left - 150, window);
    await waitFor(() => expect(sidebar).toHaveAttribute('data-collapsed'));
    pointer('pointerup', rect.left - 150, window);
    await waitFor(() => expect(channels).not.toHaveAttribute('data-dragging'));
  },
};

const SAVE_KEY = 'haunt.resizable.storybook-demo';

export const AutoSave: Story = {
  name: 'Сохранение раскладки (autoSaveId)',
  args: { autoSaveId: 'storybook-demo', onResizeEnd: fn() },
  beforeEach: () => {
    localStorage.removeItem(SAVE_KEY);

    return () => localStorage.removeItem(SAVE_KEY);
  },
  render: (args) => <PixelLayout {...args} />,
  play: async ({ args, canvasElement }) => {
    const sidebar = panelOf(canvasElement, 'Каналы');

    await waitFor(() => expect(widthOf(sidebar)).toBeCloseTo(240, 0));

    handle(canvasElement, 'Ширина списка каналов').focus();
    await userEvent.keyboard('{Home}');

    // Пиксельная панель сохраняется в px — вернётся в те же 180 при любом окне
    await expect(args.onResizeEnd).toHaveBeenLastCalledWith(expect.any(Array), [
      '180px',
      expect.any(Number),
    ]);
    await expect(JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null')?.[0]).toBe('180px');
  },
};
