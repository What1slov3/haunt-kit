import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { Avatar, Button, Inline, Stack, Stagger, Text } from '@haunt/ui';

const people = ['Мира', 'Тени', 'Лис', 'Вега', 'Орлан', 'Сойка', 'Кедр', 'Ольха'];

const meta = {
  title: 'Движение/Stagger',
  component: Stagger,
  tags: ['autodocs'],
  args: { animation: 'rise', step: 30, max: 12, as: 'ul', children: null },
  argTypes: {
    animation: { control: 'inline-radio', options: ['fade', 'pop', 'rise'] },
    step: { control: { type: 'range', min: 10, max: 150, step: 5 } },
    children: { control: false },
  },
  render: function StaggerStory({ children: _children, ...args }) {
    const [run, setRun] = useState(0);

    return (
      <Stack gap={3} align="start">
        <Button size="sm" onClick={() => setRun((current) => current + 1)}>
          Повторить
        </Button>

        <Stagger
          key={run}
          {...args}
          style={{ display: 'grid', gap: 4, margin: 0, padding: 0, listStyle: 'none', width: 240 }}
        >
          {people.map((name) => (
            <li key={name}>
              <Inline gap={2} align="center">
                <Avatar name={name} size="xs" />
                <Text>{name}</Text>
              </Inline>
            </li>
          ))}
        </Stagger>
      </Stack>
    );
  },
  parameters: {
    docs: {
      description: {
        component:
          'Каскад появления через CSS-переменную индекса. `Stagger` раздаёт прямым детям `--stagger-index`, задержку считает CSS: `min(index, max) × step` — длинный список не ждёт секунды. Появление — на `--anim-*` кита. Для своего CSS — функция `stagger(index, { step, max })` → стиль и `staggerDelay()` с той же формулой. Повторить — сменить `key`. «Эффекты: без» и reduced-motion — все сразу на месте.',
      },
    },
  },
} satisfies Meta<typeof Stagger>;

export default meta;

type Story = StoryObj<typeof meta>;

const items = (canvasElement: HTMLElement) => [...canvasElement.querySelectorAll('li')];

export const Cascade: Story = {
  name: 'Каскад списка',
  play: async ({ canvasElement }) => {
    const [first, , third] = items(canvasElement);

    await expect(first!.style.getPropertyValue('--stagger-index')).toBe('0');
    await expect(third!.style.getPropertyValue('--stagger-index')).toBe('2');
    await expect(getComputedStyle(third!).animationDelay).toBe('0.06s');
  },
};

export const Pop: Story = { name: 'Поп, шаг 60 мс', args: { animation: 'pop', step: 60 } };

export const EffectsOff: Story = {
  name: 'Эффекты выключены — все сразу',
  globals: { effects: 'off' },
  play: async ({ canvasElement }) => {
    for (const item of items(canvasElement)) {
      await expect(getComputedStyle(item).animationName).toBe('none');
    }
  },
};
