import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { SpaceHeader, Stack, Sticky, Text } from '@haunt/ui';

import { demoSpace } from '../lib/stories/demo-space';
import { SpaceActions, SpaceTabs } from '../lib/stories/demo-space-parts';
import { photos } from '../lib/stories/demo-photos';

const meta = {
  title: 'Сообщество/SpaceHeader',
  component: SpaceHeader,
  tags: ['autodocs'],
  args: { ...demoSpace, actions: <SpaceActions />, tabs: <SpaceTabs /> },
  argTypes: {
    variant: { control: 'inline-radio', options: ['page', 'compact'] },
    color: { control: 'color' },
    actions: { control: false },
    tabs: { control: false },
    banner: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 880 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Лицо пространства — как шапка сообщества у Reddit: обложка (`banner`) или аура цвета пространства (`color`, без него — акцент), знак (`iconSrc`, без него — `Emblem` по `seed`), имя и адрес, участники и кто в сети, описание, теги, действия и вкладки разделов (`tabs` — `Tabs.List`). `variant="compact"` — одна строка для `Sticky`: показать, когда полная шапка уехала при прокрутке (`onStuckChange`). Данные — пропсы: пространство приходит от экрана. Ставится в `header` у `PageLayout`.',
      },
    },
  },
} satisfies Meta<typeof SpaceHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Аура вместо обложки',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('heading', { level: 1, name: 'Холмы' })).toBeVisible();
    await expect(canvas.getByText('1 204 участника')).toBeVisible();
    await expect(canvas.getByText('48 в сети')).toBeVisible();
    await expect(canvas.getByRole('list', { name: 'Теги' })).toBeVisible();
  },
};

export const WithBanner: Story = {
  name: 'С обложкой',
  args: { banner: photos.ridge.src },
};

export const Compact: Story = {
  name: 'Компактная строка',
  args: { variant: 'compact' },
};

/** Полная шапка уезжает — компактная прилипает сверху ленты */
export const CollapsesOnScroll: Story = {
  name: 'Сворачивается при прокрутке',
  render: (args) => (
    <div
      data-testid="scroller"
      style={{
        height: 420,
        overflowY: 'auto',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <Stack gap={3} style={{ padding: 'var(--space-4)' }}>
        <SpaceHeader {...args} />
      </Stack>

      <Sticky>
        <SpaceHeader {...args} variant="compact" />
      </Sticky>

      <Stack gap={2} style={{ padding: 'var(--space-4)' }}>
        {Array.from({ length: 30 }, (_, index) => (
          <Text key={index} size="sm" tone="muted">
            Пост {index + 1}
          </Text>
        ))}
      </Stack>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const scroller = canvasElement.querySelector<HTMLElement>('[data-testid="scroller"]')!;

    scroller.scrollTop = 400;
    await waitFor(() => expect(scroller.querySelector('[data-stuck]')).not.toBeNull());
  },
};
