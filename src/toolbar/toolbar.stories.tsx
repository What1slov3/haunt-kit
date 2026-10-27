import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Bold,
  Code,
  Italic,
  Link2,
  List,
  ListOrdered,
  Paperclip,
  Quote,
  Strikethrough,
} from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Button, FieldFrame, Icon, Inline, Textarea, Toolbar, Tooltip } from '@haunt/ui';

import { expectFocused } from '../lib/stories/play-helpers';

interface FormattingToolbarProps {
  /** 24 / 28 px */
  size?: 'sm' | 'md';
  /** Своя рамка вокруг ряда */
  framed?: boolean;
  orientation?: 'horizontal' | 'vertical';
  /** Нажатие «Ссылка» */
  onLink?: () => void;
}

/** Форматирование сообщения: стили текста, блоки, ссылка — подсказки с сочетаниями */
function FormattingToolbar({ size, framed, orientation, onLink }: FormattingToolbarProps) {
  const [marks, setMarks] = useState<string[]>([]);
  const [block, setBlock] = useState('');

  return (
    <Toolbar.Root aria-label="Форматирование" size={size} framed={framed} orientation={orientation}>
      <Toolbar.ToggleGroup
        type="multiple"
        aria-label="Стиль текста"
        value={marks}
        onValueChange={setMarks}
      >
        <Tooltip content="Жирный" shortcut="Ctrl+B">
          <Toolbar.ToggleItem value="bold" label="Жирный">
            <Icon icon={Bold} size="sm" />
          </Toolbar.ToggleItem>
        </Tooltip>

        <Tooltip content="Курсив" shortcut="Ctrl+I">
          <Toolbar.ToggleItem value="italic" label="Курсив">
            <Icon icon={Italic} size="sm" />
          </Toolbar.ToggleItem>
        </Tooltip>

        <Toolbar.ToggleItem value="strike" label="Зачёркнутый">
          <Icon icon={Strikethrough} size="sm" />
        </Toolbar.ToggleItem>

        <Toolbar.ToggleItem value="code" label="Код">
          <Icon icon={Code} size="sm" />
        </Toolbar.ToggleItem>
      </Toolbar.ToggleGroup>

      <Toolbar.Separator />

      <Toolbar.ToggleGroup type="single" aria-label="Блок" value={block} onValueChange={setBlock}>
        <Toolbar.ToggleItem value="quote" label="Цитата">
          <Icon icon={Quote} size="sm" />
        </Toolbar.ToggleItem>

        <Toolbar.ToggleItem value="list" label="Список">
          <Icon icon={List} size="sm" />
        </Toolbar.ToggleItem>

        <Toolbar.ToggleItem value="ordered" label="Нумерованный список">
          <Icon icon={ListOrdered} size="sm" />
        </Toolbar.ToggleItem>
      </Toolbar.ToggleGroup>

      <Toolbar.Separator />

      <Toolbar.Button label="Ссылка" onClick={onLink}>
        <Icon icon={Link2} size="sm" />
      </Toolbar.Button>
    </Toolbar.Root>
  );
}

const meta = {
  title: 'Кнопки/Toolbar',
  component: FormattingToolbar,
  subcomponents: {
    'Toolbar.Root': Toolbar.Root,
    'Toolbar.Button': Toolbar.Button,
    'Toolbar.ToggleItem': Toolbar.ToggleItem,
  },
  tags: ['autodocs'],
  args: { size: 'md', framed: false, orientation: 'horizontal', onLink: fn() },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md'] },
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Панель инструментов на Radix Toolbar: весь ряд — одна остановка Tab, внутри — стрелки и Home / End. Кнопки (`Toolbar.Button`), группы переключателей (`Toolbar.ToggleGroup` + `ToggleItem`, состояние «выбрано» тоном акцента, как у `Toggle`), разделители. Размер задаётся на `Root` и одинаков у всего ряда; `framed` — своя рамка, без неё ряд встаёт в чужую (композер). Подсказки — обычный `Tooltip` вокруг пункта.',
      },
    },
  },
} satisfies Meta<typeof FormattingToolbar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Framed: Story = { args: { framed: true } };

export const Small: Story = { args: { size: 'sm', framed: true } };

export const Vertical: Story = { args: { orientation: 'vertical', framed: true } };

/** Над полем композера: ряд без своей рамки внутри общей рамки поля */
export const InComposer: Story = {
  render: (args) => (
    <FieldFrame
      multiline
      fullWidth
      style={{ maxWidth: 520, padding: 4, flexDirection: 'column', alignItems: 'stretch' }}
    >
      <FormattingToolbar {...args} size="sm" />

      <Inline gap={1} align="end">
        <Textarea
          bare
          autoGrow
          rows={2}
          placeholder="Сообщение в #design-review"
          aria-label="Сообщение"
        />
        <Button size="sm" variant="ghost" iconStart={<Icon icon={Paperclip} size="sm" />}>
          Файл
        </Button>
      </Inline>
    </FieldFrame>
  ),
};

const items = (canvas: HTMLElement) =>
  within(within(canvas).getByRole('toolbar')).getAllByRole('button');

export const SingleTabStop: Story = {
  name: 'Одна остановка Tab, стрелки внутри',
  render: (args) => (
    <Inline gap={2}>
      <Button>До</Button>
      <FormattingToolbar {...args} />
      <Button>После</Button>
    </Inline>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [bold, italic] = items(canvasElement);
    const link = canvas.getByRole('button', { name: 'Ссылка' });

    canvas.getByRole('button', { name: 'До' }).focus();
    await userEvent.tab();
    await expectFocused(bold!);

    await userEvent.keyboard('{ArrowRight}');
    await expectFocused(italic!);

    await userEvent.keyboard('{End}');
    await expectFocused(link);

    await userEvent.keyboard('{Home}');
    await expectFocused(bold!);

    // Из ряда Tab уходит сразу дальше, а не на следующий пункт
    await userEvent.tab();
    await expectFocused(canvas.getByRole('button', { name: 'После' }));
  },
};

export const TogglesWithKeyboard: Story = {
  name: 'Переключатели — Space и клик',
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const bold = canvas.getByRole('button', { name: 'Жирный' });
    const quote = canvas.getByRole('radio', { name: 'Цитата' });
    const list = canvas.getByRole('radio', { name: 'Список' });

    bold.focus();
    await userEvent.keyboard(' ');
    await expect(bold).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(quote);
    await expect(quote).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(list);
    await expect(quote).toHaveAttribute('aria-checked', 'false');
    await expect(list).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(canvas.getByRole('button', { name: 'Ссылка' }));
    await expect(args.onLink).toHaveBeenCalledOnce();
  },
};
