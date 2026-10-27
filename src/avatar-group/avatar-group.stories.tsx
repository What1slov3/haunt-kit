import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { AvatarGroup, Inline, Stack, Surface, Text } from '@haunt/ui';

import { expectVisible, screen } from '../lib/stories/play-helpers';

const imageSrc =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Crect width='10' height='10' fill='%231fb6a8'/%3E%3Ccircle cx='5' cy='4' r='2.2' fill='%23fff'/%3E%3Crect x='2' y='7' width='6' height='4' rx='2' fill='%23fff'/%3E%3C/svg%3E";

const people = [
  { name: 'Мария Орлова' },
  { name: 'Иван Лебедев', src: imageSrc },
  { name: 'Анна Соколова' },
  { name: 'Пётр Волков' },
  { name: 'Ольга Ким' },
  { name: 'Денис Шах' },
  { name: 'Лев Гарин' },
  { name: 'Вера Нос' },
];

const meta = {
  title: 'Отображение/AvatarGroup',
  component: AvatarGroup,
  tags: ['autodocs'],
  args: { items: people, max: 4, size: 'sm', label: 'В голосовом: 8' },
  argTypes: { items: { control: false } },
  parameters: {
    docs: {
      description: {
        component:
          'Наложенные аватары: кто в голосовом, кто поставил реакцию. Каждый следующий лежит поверх предыдущего, а под него в предыдущем вырезано прозрачное отверстие **маской** (не обводкой цвета фона) — группа одинаково выглядит на любой подложке. `max` — сколько показать, остальные — плашкой `+N`, её подсказка (по наведению и фокусу) перечисляет скрытых. Размеры — как у `Avatar`. `shape="rounded"` — квадраты сообществ: вырез повторяет скругление соседа (у маски нет формы скруглённого прямоугольника — сосед собран из двух прямоугольников и двух кругов, сплошной слой вычитает их объединение). `status` у пункта показывается только у последнего видимого; если за ним «+N», точку возвращает маска-исключение, а плашка вырезана под неё.',
      },
    },
  },
} satisfies Meta<typeof AvatarGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  render: (args) => (
    <Stack gap={3}>
      <AvatarGroup {...args} size="xs" />
      <AvatarGroup {...args} size="sm" />
      <AvatarGroup {...args} size="md" />
      <AvatarGroup {...args} size="lg" />
      <AvatarGroup {...args} size="xl" />
    </Stack>
  ),
};

export const WithoutOverflow: Story = {
  name: 'Все помещаются',
  args: { items: people.slice(0, 3), max: 5, label: 'Реакция 👍: 3' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByText(/^\+/)).toBeNull();
  },
};

/** Вырез — маской: под группой виден градиент, а не тёмное кольцо цвета панели */
export const OnGradient: Story = {
  name: 'На градиенте и стекле',
  args: { size: 'md' },
  render: (args) => (
    <Inline gap={4}>
      <div
        style={{
          padding: 'var(--space-4)',
          borderRadius: 'var(--radius-2xl)',
          background: 'var(--accent-gradient)',
        }}
      >
        <AvatarGroup {...args} />
      </div>

      <Surface panel level={1} style={{ padding: 'var(--space-4)' }}>
        <AvatarGroup {...args} />
      </Surface>
    </Inline>
  ),
};

export const InVoiceRow: Story = {
  name: 'В строке голосового канала',
  args: { size: 'xs', max: 3 },
  render: (args) => (
    <Inline gap={2}>
      <Text size="sm" tone="muted">
        # общий-голос
      </Text>

      <AvatarGroup {...args} />
    </Inline>
  ),
};

export const OverflowTooltip: Story = {
  name: '«+N» перечисляет скрытых',
  play: async ({ canvasElement }) => {
    const more = within(canvasElement).getByRole('img', { name: /Ещё 4/ });

    await expect(more).toHaveTextContent('+4');
    // Аватары не фокусируются: первая остановка Tab — сразу «+N»
    await userEvent.tab();
    await expect(more).toHaveFocus();
    await expectVisible(await screen().findByRole('tooltip'));
    await expect(screen().getByRole('tooltip')).toHaveTextContent(
      'Ольга Ким, Денис Шах, Лев Гарин, Вера Нос',
    );
  },
};

const communities = [
  { name: 'Haunt' },
  { name: 'Дизайн-клуб', src: imageSrc },
  { name: 'Rust Россия' },
  { name: 'Фотокружок' },
  { name: 'Настолки' },
  { name: 'Кино по пятницам' },
];

/** Квадраты сообществ: вырез повторяет скругление соседа, а не круг */
export const Rounded: Story = {
  name: 'Сообщества: shape="rounded"',
  args: { items: communities, shape: 'rounded', size: 'lg', max: 4, label: 'Общие сообщества' },
  render: (args) => (
    <Stack gap={3}>
      <AvatarGroup {...args} size="sm" />
      <AvatarGroup {...args} size="lg" />

      <div
        style={{
          padding: 'var(--space-4)',
          borderRadius: 'var(--radius-2xl)',
          background: 'var(--accent-gradient)',
        }}
      >
        <AvatarGroup {...args} size="xl" />
      </div>
    </Stack>
  ),
  play: async ({ canvasElement }) => {
    const [group] = within(canvasElement).getAllByRole('group', { name: 'Общие сообщества' });
    const first = group!.firstElementChild as HTMLElement;

    // Сосед собран из частей: сплошной слой вычитает их объединение
    await expect(getComputedStyle(first).maskComposite).toContain('subtract');
    await expect(getComputedStyle(group!.querySelector('[role="img"]')!).borderRadius).not.toBe(
      '50%',
    );
  },
};

const withStatus = people.map((person, index) => ({
  ...person,
  status: index === 3 ? ('online' as const) : undefined,
}));

/** Статус у последнего видимого: точку не срезает ни вырез под «+N», ни сама плашка */
export const Status: Story = {
  name: 'Статус у последнего видимого',
  args: { items: withStatus, size: 'lg' },
  render: (args) => (
    <Stack gap={3}>
      <AvatarGroup {...args} />
      <AvatarGroup {...args} shape="rounded" />
      <AvatarGroup {...args} max={undefined} items={withStatus.slice(0, 4)} />
    </Stack>
  ),
  play: async ({ canvasElement }) => {
    const [circle] = within(canvasElement).getAllByRole('group');
    const dots = within(circle!).getAllByRole('img', { name: 'в сети' });

    await expect(dots).toHaveLength(1);

    const more = within(circle!).getByRole('img', { name: /Ещё 4/ });
    const keeper = dots[0]!.parentElement!;

    // Маска-исключение: у аватара поверх выреза — слой точки, у плашки — отверстие под неё
    await expect(getComputedStyle(keeper).maskImage.split('radial-gradient').length - 1).toBe(2);
    await expect(getComputedStyle(more).maskImage).toContain('radial-gradient');
  },
};
