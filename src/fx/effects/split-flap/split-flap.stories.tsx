import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Button, Inline, Stack, Text } from '@haunt/ui';
import { FLAP_ALPHANUMERIC, FLAP_DIGITS, FLAP_TIME, SplitFlap } from '@haunt/ui/fx';

const meta = {
  title: 'Эффекты/SplitFlap',
  component: SplitFlap,
  tags: ['autodocs'],
  args: { value: '19:30', charset: FLAP_TIME, size: 'md', flipMs: 70, staggerMs: 45, maxFlips: 10 },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    align: { control: 'inline-radio', options: ['start', 'end'] },
    charset: { control: false },
    flipMs: { control: { type: 'range', min: 30, max: 300, step: 10 } },
    staggerMs: { control: { type: 'range', min: 0, max: 200, step: 5 } },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Табло с перекидными флажками из `@haunt/ui/fx`. При смене значения ячейки по очереди (`staggerMs`) перекидываются вперёд по барабану (`charset`: `FLAP_DIGITS`, `FLAP_TIME`, `FLAP_ALPHANUMERIC` или свой) до нужного символа; длинный путь докручивается не больше чем `maxFlips` шагами. Флажок — две половины с `rotateX` и затемнением `filter`, шарнир — настоящая щель. Скринридер читает значение целиком. «Эффекты: без» и reduced-motion — сразу новое значение.',
      },
    },
  },
} satisfies Meta<typeof SplitFlap>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Символы на табло — по ячейкам (у каждой две половины с тем же символом, textContent их удвоил бы) */
const boardChars = (canvasElement: HTMLElement) =>
  [...canvasElement.querySelectorAll<HTMLElement>('[data-char]')]
    .map((cell) => cell.dataset.char)
    .join('');

/** Что читает скринридер: скрытая копия значения — первый ребёнок табло */
const spoken = (canvasElement: HTMLElement) =>
  canvasElement.querySelector('[data-char]')?.closest('[aria-hidden]')?.previousElementSibling
    ?.textContent;

function Counter(props: Story['args']) {
  const [score, setScore] = useState(7);

  return (
    <Stack gap={3} align="start">
      <Button size="sm" onClick={() => setScore((current) => current + 5)}>
        +5 очков
      </Button>

      <SplitFlap {...props} value={score} length={3} charset={FLAP_DIGITS} />
    </Stack>
  );
}

export const Score: Story = {
  name: 'Счёт: флажки перекидываются',
  render: (args) => <Counter {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(spoken(canvasElement)).toBe('7');
    await userEvent.click(canvas.getByRole('button', { name: '+5 очков' }));
    await waitFor(() => expect(canvasElement.querySelector('[data-flipping]')).not.toBeNull());
    // Скринридер сразу получает новое значение, табло ещё крутится
    await expect(spoken(canvasElement)).toBe('12');
    await waitFor(() => expect(canvasElement.querySelector('[data-flipping]')).toBeNull(), {
      timeout: 3000,
    });
    await expect(boardChars(canvasElement)).toBe(' 12');
  },
};

export const Time: Story = {
  name: 'Время события',
  render: function TimeStory(args) {
    const [value, setValue] = useState('19:30');

    return (
      <Stack gap={3} align="start">
        <Inline gap={2}>
          {['19:30', '20:45', '08:05'].map((time) => (
            <Button key={time} size="sm" variant="secondary" onClick={() => setValue(time)}>
              {time}
            </Button>
          ))}
        </Inline>

        <SplitFlap {...args} value={value} size="lg" />
      </Stack>
    );
  },
};

export const Code: Story = {
  name: 'Код приглашения',
  args: { value: 'HX-7Q2', charset: FLAP_ALPHANUMERIC, appear: true, align: 'start', length: 6 },
};

export const Sizes: Story = {
  name: 'Размеры',
  render: (args) => (
    <Stack gap={3} align="start">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Inline key={size} gap={3} align="center">
          <Text size="sm" tone="muted" mono style={{ width: 24 }}>
            {size}
          </Text>

          <SplitFlap {...args} size={size} />
        </Inline>
      ))}
    </Stack>
  ),
};

export const EffectsOff: Story = {
  name: 'Эффекты выключены — сразу итог',
  globals: { effects: 'off' },
  render: (args) => <Counter {...args} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '+5 очков' }));
    await expect(canvasElement.querySelector('[data-flipping]')).toBeNull();
    await expect(boardChars(canvasElement)).toBe(' 12');
    await expect(spoken(canvasElement)).toBe('12');
  },
};
