import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import {
  Button,
  canViewTransition,
  Heading,
  Inline,
  Stack,
  Surface,
  Text,
  useViewTransition,
} from '@haunt/ui';

const spaces = [
  { name: 'Ночная смена', about: 'Тихий голосовой канал до утра' },
  { name: 'Мастерская', about: 'Делимся тем, что собрали за неделю' },
];

/** Демо: смена «пространства» через View Transitions API; без API — просто смена */
function ViewTransitionDemo() {
  const [index, setIndex] = useState(0);
  const { start, transitioning } = useViewTransition();
  const space = spaces[index]!;

  return (
    <Stack gap={3} align="start">
      <Inline gap={2}>
        <Button
          size="sm"
          disabled={transitioning}
          onClick={() => start(() => setIndex((current) => (current + 1) % spaces.length))}
        >
          Сменить пространство
        </Button>

        <Text size="sm" tone="muted" mono>
          {canViewTransition() ? 'view transitions' : 'без перехода'}
        </Text>
      </Inline>

      <Surface
        level={3}
        p={5}
        radius="2xl"
        border
        style={{ width: 320, viewTransitionName: 'haunt-space-card' }}
      >
        <Stack gap={1}>
          <Heading level={3}>{space.name}</Heading>
          <Text size="sm" tone="muted">
            {space.about}
          </Text>
        </Stack>
      </Surface>
    </Stack>
  );
}

const meta = {
  title: 'Движение/useViewTransition',
  component: ViewTransitionDemo,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`startViewTransition(update, { types, scope })` и `useViewTransition()` — обёртка View Transitions API для смены экранов и пространств. Хук применяет состояние синхронно внутри перехода (`flushSync`), иначе браузер снял бы «новый» кадр раньше, чем React его нарисовал. Где API нет, при «эффекты: без» и reduced-motion — `update` просто применяется сразу. Свой переход — `view-transition-name` у элемента и псевдоэлементы `::view-transition-*`.',
      },
    },
  },
} satisfies Meta<typeof ViewTransitionDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SwitchSpace: Story = {
  name: 'Смена пространства',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Сменить пространство' }));
    await waitFor(() =>
      expect(canvas.getByRole('heading', { name: 'Мастерская' })).toBeInTheDocument(),
    );
  },
};

export const EffectsOff: Story = {
  name: 'Эффекты выключены — просто смена',
  globals: { effects: 'off' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('без перехода')).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Сменить пространство' }));
    // Без перехода — синхронно, кнопка не блокируется
    await expect(canvas.getByRole('heading', { name: 'Мастерская' })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Сменить пространство' })).toBeEnabled();
  },
};
