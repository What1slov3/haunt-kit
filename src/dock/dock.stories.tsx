import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Compass, Inbox, Plus } from 'lucide-react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { Avatar, Dock, Icon, type DockItem, type DockProps } from '@haunt/ui';

const spaces = ['Haunt', 'Дизайн', 'Rust', 'Игры', 'Музыка'];

function makeItems(active: string): DockItem[] {
  return [
    { id: 'inbox', label: 'Личные сообщения', icon: <Icon icon={Inbox} />, unread: 4 },
    ...spaces.map((name, index) => ({
      id: name,
      label: name,
      icon: <Avatar name={name} shape="rounded" size="lg" />,
      unread: index === 2 ? true : undefined,
    })),
    { id: 'explore', label: 'Исследовать', icon: <Icon icon={Compass} /> },
    { id: 'create', label: 'Создать пространство', icon: <Icon icon={Plus} /> },
  ].map((item) => ({ ...item, active: item.id === active }));
}

function Demo({ onSelect, ...props }: Partial<DockProps>) {
  const [active, setActive] = useState('Haunt');

  return (
    <div style={{ padding: '48px 64px 16px' }}>
      <Dock
        items={makeItems(active)}
        onSelect={(id) => {
          onSelect?.(id);
          setActive(id);
        }}
        {...props}
      />
    </div>
  );
}

const scaleOf = (element: Element) =>
  Number((element as HTMLElement).style.getPropertyValue('--dock-scale') || 1);

const meta = {
  title: 'Списки/Dock',
  component: Demo,
  tags: ['autodocs'],
  args: { onSelect: fn() },
  parameters: {
    docs: {
      description: {
        component:
          'Док быстрых пространств: плитка под курсором увеличивается (`magnification`), соседи — меньше с расстоянием (`range`), ряд раздвигается, чтобы плитки не налезали (`dock-math.ts`). Только transform, переменные пишутся в rAF без ре-рендера. При `data-effects="off"` и reduced-motion — без увеличения; пальцем — тоже. Подписи — подсказки, открытое — точка под плиткой, непрочитанное — счётчик. Клавиатура — панель инструментов: стрелки, Home / End.',
      },
    },
  },
} satisfies Meta<typeof Demo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const target = canvas.getByRole('button', { name: 'Rust' });
    const box = target.getBoundingClientRect();

    target.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerType: 'mouse',
        clientX: box.left + box.width / 2,
        clientY: box.top + box.height / 2,
      }),
    );

    await waitFor(() => expect(scaleOf(target)).toBeGreaterThan(1.5));
    await expect(scaleOf(canvas.getByRole('button', { name: 'Haunt' }))).toBeLessThan(
      scaleOf(target),
    );
  },
};

export const Keyboard: Story = {
  name: 'Клавиатура',
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    canvas.getByRole('button', { name: 'Личные сообщения, 4 непрочитанных' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getByRole('button', { name: 'Haunt' })).toHaveFocus();

    await userEvent.keyboard('{End}{Enter}');
    await expect(args.onSelect).toHaveBeenCalledWith('create');
    await expect(canvas.getByRole('button', { name: 'Создать пространство' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  },
};

export const EffectsOff: Story = {
  name: 'Эффекты выключены — без увеличения',
  globals: { effects: 'off' },
  play: async ({ canvasElement }) => {
    const target = within(canvasElement).getByRole('button', { name: 'Rust' });
    const box = target.getBoundingClientRect();

    target.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerType: 'mouse',
        clientX: box.left + box.width / 2,
        clientY: box.top + box.height / 2,
      }),
    );

    await new Promise((resolve) => requestAnimationFrame(resolve));
    await expect(scaleOf(target)).toBe(1);
  },
};

export const Vertical: Story = {
  name: 'Вертикальный',
  args: { orientation: 'vertical', size: 36 },
};
