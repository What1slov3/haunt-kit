import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { BookOpen, Inbox, MessagesSquare, PanelLeft, Plus, Radio, Users } from 'lucide-react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import {
  AppShell,
  Avatar,
  Breadcrumbs,
  Heading,
  Icon,
  IconButton,
  Inline,
  NavItem,
  RailItem,
  ScrollArea,
  Stack,
  StatusBar,
  Surface,
  Text,
  useAppShell,
  type AppShellProps,
} from '@haunt/ui';

import { expectGone, expectVisible, pressEscape, screen } from '../lib/stories/play-helpers';

// Пространство собирается из примитивов: потоки — переписка, сцены — голос и экран, лор — страницы
const streams = ['общий', 'новости', 'вопросы', 'офтоп'];
const scenes = [{ name: 'вечерний созвон', here: 3 }];
const lore = ['правила', 'гайд по билдам'];
const people = ['Мария Орлова', 'Иван Лебедев', 'Аня', 'haunt-mod'];
const inScene = ['Мария Орлова', 'Аня'];

function Rail() {
  return (
    <Stack gap={2} align="center" py={2} style={{ width: 56 }}>
      <RailItem label="Личные сообщения" variant="accent">
        <Icon icon={Inbox} />
      </RailItem>

      <RailItem label="Haunt" active>
        <Avatar name="Haunt" shape="rounded" size="lg" />
      </RailItem>

      <RailItem label="Дизайн" unread>
        <Avatar name="Дизайн" shape="rounded" size="lg" />
      </RailItem>

      <RailItem label="Rust" unread={4}>
        <Avatar name="Rust" shape="rounded" size="lg" />
      </RailItem>

      <RailItem label="Новое пространство" variant="ghost">
        <Icon icon={Plus} />
      </RailItem>
    </Stack>
  );
}

function Section({ title }: { title: string }) {
  return (
    <Heading level={4} overline style={{ padding: '12px 8px 4px' }}>
      {title}
    </Heading>
  );
}

function Sidebar() {
  const shell = useAppShell();

  return (
    <Surface level={1} panel border={false} radius="none">
      <Stack gap={0} p={2}>
        <Inline align="center" gap={2} px={2} py={1}>
          <Avatar name="Haunt" shape="rounded" size="sm" />

          <Text weight="semibold">Haunt</Text>
        </Inline>

        <Section title="Потоки" />

        {streams.map((stream, index) => (
          <NavItem
            key={stream}
            icon={<Icon icon={MessagesSquare} size="sm" />}
            active={index === 0}
            hasUnread={index === 1}
            onClick={shell.closeSheet}
          >
            {stream}
          </NavItem>
        ))}

        <Section title="Сцены" />

        {scenes.map((scene) => (
          <NavItem
            key={scene.name}
            icon={<Icon icon={Radio} size="sm" />}
            description={`${scene.here} здесь`}
            onClick={shell.closeSheet}
          >
            {scene.name}
          </NavItem>
        ))}

        <Section title="Лор" />

        {lore.map((page) => (
          <NavItem key={page} icon={<Icon icon={BookOpen} size="sm" />} onClick={shell.closeSheet}>
            {page}
          </NavItem>
        ))}
      </Stack>
    </Surface>
  );
}

function Header() {
  const shell = useAppShell();

  return (
    <Inline
      align="center"
      gap={2}
      px={3}
      style={{ height: 44, borderBottom: '1px solid var(--border)' }}
    >
      <IconButton
        label="Потоки"
        size="sm"
        active={shell.sidebar === 'docked'}
        onClick={shell.toggleSidebar}
      >
        <Icon icon={PanelLeft} size="sm" />
      </IconButton>

      <Breadcrumbs items={[{ label: 'Haunt', href: '#haunt' }, { label: 'общий' }]} />

      <Text size="sm" tone="subtle" truncate>
        договориться о вечере и не потерять, что родилось
      </Text>

      <span style={{ flex: 1 }} />

      <IconButton
        label="Участники"
        size="sm"
        active={shell.members === 'docked'}
        onClick={shell.toggleMembers}
      >
        <Icon icon={Users} size="sm" />
      </IconButton>
    </Inline>
  );
}

function Members() {
  return (
    <Surface level={1} panel border={false} radius="none">
      <Stack gap={0} p={2}>
        <Section title={`В сцене · ${inScene.length}`} />

        {inScene.map((name) => (
          <NavItem key={name} icon={<Avatar name={name} size="sm" status="online" />}>
            {name}
          </NavItem>
        ))}

        <Section title={`Здесь · ${people.length}`} />

        {people.map((name) => (
          <NavItem key={name} icon={<Avatar name={name} size="sm" status="online" />}>
            {name}
          </NavItem>
        ))}
      </Stack>
    </Surface>
  );
}

function Demo(props: Partial<AppShellProps>) {
  return (
    <AppShell
      rail={<Rail />}
      sidebar={<Sidebar />}
      members={<Members />}
      header={<Header />}
      statusBar={
        <StatusBar
          end={
            <StatusBar.Item dot tone="success">
              online
            </StatusBar.Item>
          }
        >
          <StatusBar.Item>Haunt / общий</StatusBar.Item>
        </StatusBar>
      }
      {...props}
    >
      <Surface level={2} panel border={false} radius="none">
        <ScrollArea grow>
          <Stack gap={2} p={4}>
            {Array.from({ length: 12 }, (_, index) => (
              <Text key={index} tone={index % 3 ? 'default' : 'muted'}>
                Сообщение {index + 1}: оболочка отдаёт контенту всё, что не заняли панели.
              </Text>
            ))}
          </Stack>
        </ScrollArea>
      </Surface>
    </AppShell>
  );
}

const frame =
  (width: number | string): Decorator =>
  (Story) => (
    <div
      style={{
        width,
        height: 600,
        border: '1px solid var(--border)',
        overflow: 'hidden',
        background: 'var(--background)',
      }}
    >
      <Story />
    </div>
  );

const meta = {
  title: 'Раскладка/AppShell',
  component: Demo,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Каркас приложения: рейл, сайдбар, контент и участники на `Resizable`. По умолчанию (`variant="islands"`) панели — отдельные острова с зазором, сквозь который виден живой фон, ручки — невидимые желоба в зазоре; рейл пространств лежит прямо на фоне. `flush` — панели встык через линию, для встроенной оболочки. Ширины — в px, тянутся ручками и сохраняются (`autoSaveId`); панель сворачивается ручкой (до нуля, двойной клик, Enter) или кнопкой из `useAppShell()`. Ширина меряется у самой оболочки: уже 1100 px участники уходят в `Sheet` справа, уже 760 px — и сайдбар (слева); пороги — `breakpoints`. Шапка над контентом, строка состояния и `top` (для `TitleBar`) — слотами. Заливку даёт `Surface` в слоте, оболочка у островов — рамку и скругление.',
      },
    },
  },
} satisfies Meta<typeof Demo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { autoSaveId: 'storybook-default' },
  decorators: [frame(1280)],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('separator', { name: 'Ширина боковой панели' })).toBeVisible();
    await expect(canvas.getByRole('separator', { name: 'Ширина панели участников' })).toBeVisible();
  },
};

export const CollapseByButton: Story = {
  name: 'Свернуть кнопкой',
  decorators: [frame(1280)],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole('button', { name: 'Участники' });

    await userEvent.click(toggle);
    await waitFor(() => expect(canvas.queryByText('haunt-mod')).toBeNull());
    await expect(
      canvas.getByText('Сообщение 1: оболочка отдаёт контенту всё, что не заняли панели.'),
    ).toBeVisible();

    await userEvent.click(toggle);
    await expect(await canvas.findByText('haunt-mod')).toBeVisible();
  },
};

export const CollapseByHandle: Story = {
  name: 'Свернуть ручкой (Enter)',
  decorators: [frame(1280)],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const handle = canvas.getByRole('separator', { name: 'Ширина боковой панели' });

    handle.focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(canvas.queryByText('новости')).toBeNull());

    await userEvent.click(canvas.getByRole('button', { name: 'Потоки' }));
    await expect(await canvas.findByText('новости')).toBeVisible();
  },
};

export const Medium: Story = {
  name: 'Средняя ширина: участники в Sheet',
  decorators: [frame(960)],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.queryByText('haunt-mod')).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Участники' }));

    const sheet = await screen().findByRole('dialog', { name: 'Участники' });

    await expectVisible(sheet);
    await expect(within(sheet).getByText('haunt-mod')).toBeVisible();
    await pressEscape();
    await expectGone(() => screen().queryByRole('dialog'));
  },
};

export const Narrow: Story = {
  name: 'Узкое окно: сайдбар в Sheet',
  decorators: [frame(640)],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.queryByText('новости')).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Потоки' }));

    const sheet = await screen().findByRole('dialog', { name: 'Боковая панель' });

    await expectVisible(sheet);
    // Выбор канала закрывает Sheet через useAppShell().closeSheet
    await userEvent.click(within(sheet).getByText('новости'));
    await expectGone(() => screen().queryByRole('dialog'));
  },
};

export const SidebarOnly: Story = {
  name: 'Без участников',
  args: { members: undefined, defaultSidebarCollapsed: false },
  decorators: [frame(1280)],
};

export const Flush: Story = {
  name: 'Встык (flush)',
  args: { variant: 'flush' },
  decorators: [frame(1280)],
};
