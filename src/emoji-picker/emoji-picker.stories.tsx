import type { Meta, StoryObj } from '@storybook/react-vite';
import { Smile } from 'lucide-react';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import {
  EmojiPicker,
  EmojiPickerPopover,
  Icon,
  IconButton,
  Inline,
  Surface,
  Text,
} from '@haunt/ui';

import {
  expectFocused,
  expectGone,
  expectVisible,
  pressEscape,
  screen,
} from '../lib/stories/play-helpers';

const meta = {
  title: 'Ввод и выбор/EmojiPicker',
  component: EmojiPicker,
  subcomponents: { EmojiPickerPopover },
  tags: ['autodocs'],
  args: { onSelect: fn(), autoFocus: false },
  parameters: {
    docs: {
      description: {
        component:
          'Выбор эмодзи без внешних данных: свой набор (~670 частых, 9 разделов) с русскими и английскими ключевыми словами, отдельным чанком — грузится при первом показе (`loadEmojiData`). Поиск по шорткоду, названию и словам; «Недавние» — в памяти вкладки, с `recentStorageKey` — ещё и в localStorage. Вкладки прокручивают к разделу. Сетка: стрелки, Home / End (с Ctrl — края), Enter — выбрать, вверх из первого ряда или буква — в поиск. Внизу — предпросмотр: крупно, название, шорткод. `EmojiPickerPopover` — то же у триггера; Esc при непустом поиске очищает его, второй — закрывает. Тонов кожи нет.',
      },
    },
  },
  decorators: [
    (Story) => (
      <Surface
        glass
        level={2}
        style={{ display: 'inline-block', borderRadius: 'var(--radius-lg)' }}
      >
        <Story />
      </Surface>
    ),
  ],
} satisfies Meta<typeof EmojiPicker>;

export default meta;

type Story = StoryObj<typeof meta>;

const loaded = (canvas: HTMLElement) =>
  waitFor(() => expect(within(canvas).getByRole('grid', { name: 'Эмодзи' })).toBeVisible(), {
    timeout: 4000,
  });

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await loaded(canvasElement);
    await expect(within(canvasElement).getByRole('button', { name: 'Смайлы' })).toBeVisible();
  },
};

export const SearchAndKeyboard: Story = {
  name: 'Поиск и клавиатура',
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await loaded(canvasElement);
    await userEvent.type(canvas.getByRole('textbox', { name: 'Найти эмодзи' }), 'огонь');
    await expect(canvas.getByText('Результаты')).toBeVisible();

    await userEvent.keyboard('{ArrowDown}');
    await expectFocused(canvas.getByRole('button', { name: 'огонь' }));
    await expect(canvas.getByText(':fire:')).toBeVisible();

    await userEvent.keyboard('{Enter}');
    await expect(args.onSelect).toHaveBeenCalledWith(expect.objectContaining({ char: '🔥' }));
  },
};

export const GridNavigation: Story = {
  name: 'Стрелки по сетке, вверх — в поиск',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const search = canvas.getByRole('textbox', { name: 'Найти эмодзи' });

    await loaded(canvasElement);
    search.focus();
    await userEvent.keyboard('{ArrowDown}{ArrowRight}{ArrowRight}');

    const third = document.activeElement as HTMLElement;

    await expect(third.getAttribute('data-active')).not.toBeNull();
    await userEvent.keyboard('{ArrowDown}');
    await expect(document.activeElement).not.toBe(third);
    // Три шага вверх: в общей памяти модуля могут быть «Недавние» из прошлых историй — лишний ряд сверху
    await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}');
    await expectFocused(search);
  },
};

export const Empty: Story = {
  name: 'Ничего не нашлось',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await loaded(canvasElement);
    await userEvent.type(canvas.getByRole('textbox', { name: 'Найти эмодзи' }), 'zzzqqq');
    await expect(canvas.getByText('Ничего не нашлось')).toBeVisible();
  },
};

export const Recent: Story = {
  name: '«Недавние» после выбора',
  args: { recentStorageKey: 'haunt.stories.emoji-recent' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await loaded(canvasElement);
    await userEvent.type(canvas.getByRole('textbox', { name: 'Найти эмодзи' }), 'ghost');
    await userEvent.click(canvas.getByRole('button', { name: 'призрак' }));
    await userEvent.clear(canvas.getByRole('textbox', { name: 'Найти эмодзи' }));
    await expect(canvas.getByRole('button', { name: 'Недавние' })).toBeVisible();
    await expect(canvas.getByText('Недавние')).toBeVisible();
  },
};

function ComposerDemo() {
  const [picked, setPicked] = useState('');

  return (
    <Inline gap={2} align="center">
      <EmojiPickerPopover onSelect={(emoji) => setPicked((text) => text + emoji.char)}>
        <IconButton label="Эмодзи" variant="secondary">
          <Icon icon={Smile} />
        </IconButton>
      </EmojiPickerPopover>

      <Text data-testid="picked">{picked || 'Ничего не выбрано'}</Text>
    </Inline>
  );
}

export const InPopover: Story = {
  name: 'EmojiPickerPopover: Esc очищает поиск, второй — закрывает',
  render: () => <ComposerDemo />,
  decorators: [(Story) => <div style={{ paddingTop: 380 }}>{Story()}</div>],
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('button', { name: 'Эмодзи' });

    await userEvent.click(trigger);

    const dialog = await screen().findByRole('dialog', { name: 'Выбор эмодзи' });

    await expectVisible(dialog);

    const search = within(dialog).getByRole('textbox', { name: 'Найти эмодзи' });

    await expectFocused(search);
    await userEvent.type(search, 'rocket');
    await pressEscape();
    await expect(search).toHaveValue('');
    await expect(screen().getByRole('dialog', { name: 'Выбор эмодзи' })).toBeVisible();

    await pressEscape();
    await expectGone(() => screen().queryByRole('dialog', { name: 'Выбор эмодзи' }));
    await expectFocused(trigger);
  },
};

export const SelectCloses: Story = {
  name: 'EmojiPickerPopover: выбор закрывает',
  render: () => <ComposerDemo />,
  decorators: [(Story) => <div style={{ paddingTop: 380 }}>{Story()}</div>],
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Эмодзи' }));

    const dialog = await screen().findByRole('dialog', { name: 'Выбор эмодзи' });

    await waitFor(() => expect(within(dialog).getByRole('grid')).toBeVisible(), { timeout: 4000 });
    await userEvent.click(within(dialog).getAllByRole('button', { name: 'ухмылка' })[0]!);
    await expectGone(() => screen().queryByRole('dialog', { name: 'Выбор эмодзи' }));
    await expect(within(canvasElement).getByTestId('picked')).toHaveTextContent('😀');
  },
};
