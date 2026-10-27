import type { Meta, StoryObj } from '@storybook/react-vite';
import { Hash } from 'lucide-react';
import { expect, waitFor, within } from 'storybook/test';

import {
  AttachmentCard,
  Avatar,
  AvatarGroup,
  Banner,
  Breadcrumbs,
  Button,
  Calendar,
  ColorPicker,
  Combobox,
  CopyButton,
  DataTable,
  DatePicker,
  DateRangePicker,
  Dialog,
  Field,
  FileDropzone,
  Icon,
  Inbox,
  Inline,
  Input,
  LogView,
  MediaTile,
  Meter,
  NavItem,
  NotificationItem,
  NumberInput,
  PinInput,
  ShortcutList,
  SortableList,
  Spinner,
  Stack,
  Stat,
  TagInput,
  TimePicker,
  Timestamp,
  TuiSpinner,
  UiStringsProvider,
  useUiStrings,
  type UiStringsOverride,
} from '@haunt/ui';

import { screen } from '../lib/stories/play-helpers';

const CYRILLIC = /[а-яё]/i;
const SPOKEN = ['aria-label', 'aria-valuetext', 'aria-description', 'title', 'placeholder', 'alt'];

/** Видимый текст и всё, что озвучивается атрибутами: подписи, значения слайдеров, подсказки */
function cyrillicIn(root: Element): string[] {
  const found: string[] = [];

  if (CYRILLIC.test(root.textContent ?? '')) found.push(`text: ${root.textContent}`);

  for (const element of [root, ...root.querySelectorAll('*')]) {
    for (const name of SPOKEN) {
      const value = element.getAttribute(name);

      if (value && CYRILLIC.test(value)) found.push(`${name}: ${value}`);
    }
  }

  return found;
}

const now = new Date(2026, 9, 26, 12, 0);
const today = '2026-10-26';

const people = ['Ada Byron', 'Linus T', 'Grace H', 'Alan T', 'Ken T'].map((name) => ({ name }));

/** Ключевые компоненты на `en` с данными приложения тоже по-английски — кириллица могла прийти только из кита */
function EnglishKit() {
  return (
    <Stack gap={4}>
      <Field label="Bio" optional count={12} maxLength={190}>
        <Input defaultValue="Hello, world" />
      </Field>

      <Inline gap={3} align="center" wrap>
        <Spinner />
        <TuiSpinner />
        <Avatar name="Ada Byron" status="dnd" />
        <AvatarGroup items={people} max={3} />
        <Button holdToConfirm onConfirm={() => {}}>
          Delete space
        </Button>
        <CopyButton value="haunt.chat/i/abc" />
      </Inline>

      <Breadcrumbs
        items={['Settings', 'Space', 'Roles', 'Moderators', 'Permissions'].map((label) => ({
          label,
          href: '#',
        }))}
        maxItems={3}
      />

      <Banner onDismiss={() => {}}>Maintenance at 3 AM</Banner>

      <Inline gap={3} wrap>
        <NumberInput aria-label="Slow mode" defaultValue={5} />
        <PinInput length={4} />
        <TagInput aria-label="Topics" defaultValue={['rust', 'react']} max={3} />
      </Inline>

      <FileDropzone onFiles={() => {}} multiple maxFiles={3} maxSize={8 * 1024 * 1024} />
      <AttachmentCard name="report.pdf" size={1536} progress={40} onRemove={() => {}} />

      <Inline gap={3} wrap>
        <Stat label="Members" value="1,204" change={0.12} changeFormat="percent" />
        <Meter label="Storage" value={7} max={10} />
        <Timestamp date={new Date(Date.now() - 3 * 60_000)} live={false} />
      </Inline>

      <Inline gap={3} wrap>
        <NavItem icon={<Icon icon={Hash} />} unread={3}>
          general
        </NavItem>
        <MediaTile name="Ada Byron" muted pinned speaking />
      </Inline>

      <NotificationItem title="Ada mentioned you" unread time={now} onMarkRead={() => {}}>
        in #general
      </NotificationItem>

      <Inbox
        now={now}
        height={200}
        notifications={[{ id: '1', title: 'Ada mentioned you', time: now, unread: true }]}
        onMarkAllRead={() => {}}
      />

      <LogView
        lines={[{ id: 1, time: now, level: 'info', source: 'bot', text: 'ready' }]}
        onSubmit={() => {}}
      />

      <SortableList
        items={['general', 'random']}
        getKey={(item) => item}
        getLabel={(item) => item}
        renderItem={(item, state) => (
          <div>
            {state.handle} {item}
          </div>
        )}
        onReorder={() => {}}
      />

      <ShortcutList
        groups={[{ heading: 'Navigation', items: [{ label: 'Search', keys: ['mod+k', '/'] }] }]}
      />

      <DataTable
        columns={[{ key: 'name', header: 'Name' }]}
        rows={[] as Array<{ name: string }>}
        rowKey={(row) => row.name}
        label="Members"
      />

      <ColorPicker palette formats={['rgb']} />

      <Inline gap={3} wrap>
        <Combobox options={[{ value: 'a', label: 'Ada' }]} aria-label="Owner" />
        <DatePicker aria-label="Date" today={today} />
        <DateRangePicker aria-label="Range" today={today} />
        <TimePicker aria-label="Time" />
      </Inline>

      <Calendar today={today} defaultMonth={today} />
    </Stack>
  );
}

/** Подпись из словаря вне кита: экран может взять те же строки через useUiStrings */
function CloseCaption() {
  const strings = useUiStrings();

  return <span data-testid="caption">{strings.dialog.close}</span>;
}

const meta = {
  title: 'Тема/UiStringsProvider',
  component: UiStringsProvider,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Язык подписей кита: кнопки закрытия, пустые состояния, счётчики, объявления для скринридера и локаль Intl для дат и чисел. `locale` выбирает словарь (`en`, `ru`; другие языки — английский), `strings` перезаписывает часть строк. Без провайдера кит говорит по-русски. Явный проп компонента (`label`, `placeholder`, `locale`) побеждает словарь. Провайдер — контекст React, поэтому всплывающее в порталах тоже получает язык. В Storybook язык переключается в тулбаре («Язык»).',
      },
    },
  },
} satisfies Meta<typeof UiStringsProvider>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Проверка: на `en` ни в тексте, ни в aria ключевых компонентов нет кириллицы */
export const English: Story = {
  args: { locale: 'en', children: null },
  render: (args) => (
    <UiStringsProvider {...args}>
      <EnglishKit />
    </UiStringsProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('12 of 190 characters')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
    await expect(cyrillicIn(canvasElement)).toEqual([]);
  },
};

/** Всплывающее порталится в <body>, вне DOM-дерева провайдера, и всё равно говорит на его языке */
export const PortalInherits: Story = {
  args: { locale: 'en', children: null },
  render: (args) => (
    <UiStringsProvider {...args}>
      <Dialog.Root defaultOpen>
        <Dialog.Content aria-describedby={undefined}>
          <Dialog.Title>Leave space?</Dialog.Title>

          <Combobox options={[{ value: 'a', label: 'Ada' }]} aria-label="Owner" defaultOpen />
        </Dialog.Content>
      </Dialog.Root>
    </UiStringsProvider>
  ),
  parameters: { docs: { story: { inline: false, height: '420px' } } },
  play: async () => {
    const dialog = await screen().findByRole('dialog', { name: 'Leave space?' });

    await expect(within(dialog).getByRole('button', { name: 'Close' })).toBeInTheDocument();
    await expect(cyrillicIn(dialog)).toEqual([]);

    // Поповер комбобокса — свой портал рядом с диалогом, со своим полем поиска и пустым состоянием
    const search = await waitFor(() => screen().getByPlaceholderText('Search'));
    const popover = search.closest('[data-radix-popper-content-wrapper]');

    await expect(popover).not.toBeNull();
    await expect(cyrillicIn(popover!)).toEqual([]);
  },
};

const override: UiStringsOverride = { dialog: { close: 'Dismiss' } };

/** Частичная перезапись: одна строка своя, остальное — из словаря языка */
export const PartialOverride: Story = {
  args: { locale: 'en', strings: override, children: null },
  render: (args) => (
    <UiStringsProvider {...args}>
      <Stack gap={2}>
        <CloseCaption />
        <Spinner />
      </Stack>
    </UiStringsProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByTestId('caption')).toHaveTextContent('Dismiss');
    await expect(canvas.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
  },
};

/** Без провайдера в истории — язык тулбара (по умолчанию ru): старые истории не меняются */
export const Russian: Story = {
  args: { locale: 'ru', children: null },
  render: (args) => (
    <UiStringsProvider {...args}>
      <Stack gap={2}>
        <CloseCaption />
        <Field label="О себе" optional count={3} maxLength={21}>
          <Input defaultValue="Хай" />
        </Field>
      </Stack>
    </UiStringsProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByTestId('caption')).toHaveTextContent('Закрыть');
    await expect(canvas.getByText('3 из 21 символа')).toBeInTheDocument();
  },
};
