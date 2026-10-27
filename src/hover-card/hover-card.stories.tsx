import type { ComponentProps } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';

import { HoverCard, Link, Stack, Text } from '@haunt/ui';

import { expectGone, expectVisible, screen } from '../lib/stories/play-helpers';
import { photos } from '../lib/stories/demo-photos';

type ContentProps = ComponentProps<typeof HoverCard.Content>;

interface DemoProps {
  side?: ContentProps['side'];
  align?: ContentProps['align'];
  flush?: ContentProps['flush'];
  width?: number;
  defaultOpen?: boolean;
  /** Задержка до появления, мс */
  openDelay?: number;
}

/** Термин в тексте с пояснением по наведению — содержимое примитива любое, тут два абзаца */
function TermCard({ side, align, flush, width, defaultOpen, openDelay }: DemoProps) {
  return (
    <Text>
      Голос идёт через{' '}
      <HoverCard.Root defaultOpen={defaultOpen} openDelay={openDelay} closeDelay={100}>
        <HoverCard.Trigger asChild>
          <Link href="#sfu">SFU</Link>
        </HoverCard.Trigger>

        <HoverCard.Content side={side} align={align} flush={flush} width={width}>
          <Stack gap={1}>
            <Text weight="semibold">Selective Forwarding Unit</Text>

            <Text size="sm" tone="muted">
              Сервер пересылает каждому участнику потоки остальных, не смешивая их. Задержка ниже,
              чем у микшера, а громкость каждого можно менять у себя.
            </Text>
          </Stack>
        </HoverCard.Content>
      </HoverCard.Root>{' '}
      — так каждый слышит каждого отдельно.
    </Text>
  );
}

const meta = {
  title: 'Всплывающее/HoverCard',
  component: TermCard,
  subcomponents: { 'HoverCard.Content': HoverCard.Content },
  tags: ['autodocs'],
  args: { openDelay: 300, side: 'bottom', align: 'center', flush: false },
  argTypes: {
    side: { control: 'inline-radio', options: ['top', 'right', 'bottom', 'left'] },
    align: { control: 'inline-radio', options: ['start', 'center', 'end'] },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 'var(--space-4)' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Примитив: стекло у триггера с задержками появления и ухода (`openDelay`, `closeDelay` у `HoverCard.Root`), содержимое — любое: пояснение термина, превью канала или ссылки. `HoverCard.Content`: `side` / `align` — где встать, `width` — ширина (по умолчанию 280 px, не шире окна), `flush` — без поля и с обрезкой по скруглению, для содержимого со своими полями и обложкой. Готовая карточка профиля на этом примитиве — `ProfileHoverCard` («Сообщество»). Только для мыши: с клавиатуры и на тач-экране Radix её не открывает, поэтому то же содержимое должно быть доступно кликом.',
      },
    },
  },
} satisfies Meta<typeof TermCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Open: Story = {
  name: 'Открыта',
  args: { defaultOpen: true },
  parameters: { docs: { story: { inline: false, height: '200px' } } },
};

/** Без поля: обложка до краёв стекла, текст — со своими полями */
export const Flush: Story = {
  name: 'Без поля — обложка до краёв',
  args: { defaultOpen: true },
  parameters: { docs: { story: { inline: false, height: '300px' } } },
  render: ({ defaultOpen }) => (
    <Text>
      Встречаемся в{' '}
      <HoverCard.Root defaultOpen={defaultOpen} openDelay={300} closeDelay={100}>
        <HoverCard.Trigger asChild>
          <Link href="#hills">#холмы</Link>
        </HoverCard.Trigger>

        <HoverCard.Content flush width={260}>
          <img src={photos.ridge.src} alt="" style={{ display: 'block', width: '100%' }} />

          <Stack gap={1} style={{ padding: 'var(--space-3)' }}>
            <Text weight="semibold">#холмы</Text>

            <Text size="sm" tone="muted">
              Голосовой канал для вечерних созвонов. Сейчас там трое.
            </Text>
          </Stack>
        </HoverCard.Content>
      </HoverCard.Root>
    </Text>
  ),
};

export const ShowsOnHover: Story = {
  name: 'Появляется по наведению, исчезает при уходе',
  args: { openDelay: 0 },
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('link', { name: 'SFU' });
    const card = () => screen().queryByText('Selective Forwarding Unit');

    await userEvent.hover(trigger);
    await expectVisible(await screen().findByText('Selective Forwarding Unit'));

    await userEvent.unhover(trigger);
    await expectGone(card);
  },
};
