import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Stack, Ticker } from '@haunt/ui';

const news = [
  'Ночной рейд — сбор 21:00',
  'Новый канал #склад',
  'Вагнер теперь модератор',
  'Голос «штаб» открыт',
  'Сезон 03 через 4 дня',
];

const meta = {
  title: 'Сигнал/Ticker',
  component: Ticker,
  tags: ['autodocs'],
  args: { items: news, label: 'Новости пространства', speed: 40, tone: 'default' },
  argTypes: { items: { control: false }, separator: { control: 'text' } },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 560 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Бегущая строка: новости пространства, статус, расписание. Две одинаковые группы, дорожка едет на половину ширины — шва нет; узкий набор повторяется до ширины окна. Стоит при наведении и фокусе, при `data-effects="off"` и prefers-reduced-motion — в начале, а не на полпути. Копии для петли скрыты от чтения с экрана.',
      },
    },
  },
} satisfies Meta<typeof Ticker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Tones: Story = {
  name: 'Тона',
  render: (args) => (
    <Stack gap={3}>
      <Ticker {...args} />
      <Ticker {...args} tone="accent" separator="◆" />
      <Ticker {...args} tone="inverse" direction="right" />
    </Stack>
  ),
};

export const Short: Story = {
  name: 'Короткий набор — повторяется',
  args: { items: ['LIVE', '0042 онлайн'] },
};

export const Paused: Story = {
  args: { paused: true },
};

const track = (canvas: HTMLElement) =>
  within(canvas).getByRole('marquee').firstElementChild as HTMLElement;

// userEvent шлёт синтетические события — CSS :hover от них не включается; фокус настоящий, а пауза
// при наведении и при фокусе — одно правило
export const PausesOnFocus: Story = {
  name: 'Стоит при фокусе внутри',
  args: {
    items: [
      ...news.slice(0, 2),
      <a key="link" href="#raid">
        подробнее
      </a>,
    ],
  },
  play: async ({ canvasElement }) => {
    const ticker = within(canvasElement).getByRole('marquee');

    await waitFor(() => expect(ticker).toHaveAttribute('data-running'));
    await expect(getComputedStyle(track(canvasElement)).animationPlayState).toBe('running');
    await userEvent.tab();
    await expect(getComputedStyle(track(canvasElement)).animationPlayState).toBe('paused');
  },
};

export const StopsWithoutEffects: Story = {
  name: 'Без эффектов — стоит в начале',
  render: (args) => (
    <div data-effects="off">
      <Ticker {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(within(canvasElement).getByRole('marquee')).toHaveAttribute('data-running'),
    );
    await expect(getComputedStyle(track(canvasElement)).animationName).toBe('none');
  },
};

export const CopiesAreHidden: Story = {
  name: 'Копии скрыты от чтения с экрана',
  play: async ({ canvasElement }) => {
    const ticker = within(canvasElement).getByRole('marquee', { name: 'Новости пространства' });

    // Копии для петли под aria-hidden: в доступном дереве каждый пункт — один раз
    const visible = within(ticker)
      .getAllByText('Новый канал #склад')
      .filter((item) => !item.closest('[aria-hidden="true"]'));

    await expect(visible).toHaveLength(1);
  },
};
