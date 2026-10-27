import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import {
  ArtifactHeader,
  Heading,
  Link,
  PageLayout,
  SpaceHeader,
  Stack,
  Surface,
  Text,
} from '@haunt/ui';

import { demoSpace } from '../lib/stories/demo-space';
import { SpaceActions, SpaceTabs } from '../lib/stories/demo-space-parts';

function Post({ index }: { index: number }) {
  return (
    <Surface level={1} border style={{ padding: 'var(--space-4)' }}>
      <Stack gap={1}>
        <Text weight="semibold">Поход в субботу — кто с нами? ({index})</Text>

        <Text size="sm" tone="muted">
          Собираемся у станции в девять, маршрут на 14 км, вернёмся к ужину. Пишите, кто берёт
          палатку.
        </Text>
      </Stack>
    </Surface>
  );
}

function About() {
  return (
    <Surface level={1} border style={{ padding: 'var(--space-4)' }}>
      <Stack gap={2}>
        <Heading level={2} size="sm">
          О пространстве
        </Heading>

        <Text size="sm" tone="muted">
          {demoSpace.description}
        </Text>
      </Stack>
    </Surface>
  );
}

const meta = {
  title: 'Лейауты/PageLayout',
  component: PageLayout,
  tags: ['autodocs'],
  args: {
    width: 'wide',
    header: <SpaceHeader {...demoSpace} actions={<SpaceActions />} tabs={<SpaceTabs />} />,
    aside: <About />,
    asideLabel: 'О пространстве',
    children: [1, 2, 3, 4].map((index) => <Post key={index} index={index} />),
  },
  argTypes: {
    width: { control: 'inline-radio', options: ['narrow', 'reading', 'wide', 'full'] },
    asideSide: { control: 'inline-radio', options: ['start', 'end'] },
    header: { control: false },
    aside: { control: false },
    children: { control: false },
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Страница внутри содержимого AppShell: колонка по центру (`Container`, `width`), шапка над ней (`header` — `SpaceHeader`, `ArtifactHeader`) и боковая колонка (`aside`, `WithSidebar`): прилипает при прокрутке, пока стоит рядом, и уходит под основную, когда той тесно — решает ширина своего места, а не окна. Лента и форум — `wide` с `aside`, документ — `reading` с оглавлением, обзор — `wide` без колонки. Чат и настройки — `ChatLayout`, `SettingsLayout`.',
      },
    },
  },
} satisfies Meta<typeof PageLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Feed: Story = {
  name: 'Лента пространства',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('main')).toBeVisible();
    await expect(canvas.getByRole('complementary', { name: 'О пространстве' })).toBeVisible();
  },
};

export const Document: Story = {
  name: 'Документ с оглавлением',
  args: {
    width: 'wide',
    asideSide: 'start',
    asideWidth: '200px',
    asideLabel: 'Оглавление',
    header: (
      <ArtifactHeader
        kind="Вики"
        title="Правила пространства"
        place={<Link href="#rules">#правила</Link>}
        date={new Date(Date.now() - 86_400_000 * 12)}
      />
    ),
    aside: (
      <Stack gap={1}>
        {['Знакомство', 'Голосовые', 'Модерация', 'Споры'].map((item) => (
          <Link key={item} href={`#${item}`} tone="muted">
            {item}
          </Link>
        ))}
      </Stack>
    ),
    children: (
      <Stack gap={3} style={{ maxWidth: 'var(--container-reading)' }}>
        {['Знакомство', 'Голосовые', 'Модерация', 'Споры'].map((section) => (
          <Stack key={section} gap={1.5}>
            <Heading level={2} size="lg">
              {section}
            </Heading>

            <Text tone="muted">
              Пишем по делу и по-доброму. Если тема разрослась — переносим в артефакт, ссылку
              оставляем в ленте, чтобы обсуждение не потерялось.
            </Text>
          </Stack>
        ))}
      </Stack>
    ),
  },
};

export const Narrow: Story = {
  name: 'Узкое место — колонка под лентой',
  decorators: [
    (Story) => (
      <div style={{ width: 520 }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const main = canvas.getByRole('main').getBoundingClientRect();
    const aside = canvas
      .getByRole('complementary', { name: 'О пространстве' })
      .getBoundingClientRect();

    await expect(aside.top).toBeGreaterThanOrEqual(main.bottom);
  },
};
