import type { Meta, StoryObj } from '@storybook/react-vite';
import { Bell, Pin, Search, Settings } from 'lucide-react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import {
  Button,
  Icon,
  IconButton,
  Input,
  Inline,
  KeyHints,
  Kbd,
  Stack,
  Text,
  type KeyHintsProps,
} from '@haunt/ui';

import { expectGone, pressEscape, screen } from '../lib/stories/play-helpers';

function Demo({ onPin, ...props }: Partial<KeyHintsProps> & { onPin?: () => void }) {
  return (
    <KeyHints {...props}>
      <Stack gap={3} style={{ maxWidth: 560 }}>
        <Text size="sm" tone="muted">
          Нажмите <Kbd size="sm">F</Kbd> (вне поля) или <Kbd size="sm">Ctrl+.</Kbd> и наберите буквы
          метки.
        </Text>

        <Inline gap={1}>
          <IconButton label="Закрепить" onClick={onPin}>
            <Icon icon={Pin} />
          </IconButton>

          <IconButton label="Уведомления">
            <Icon icon={Bell} />
          </IconButton>

          <IconButton label="Настройки">
            <Icon icon={Settings} />
          </IconButton>

          <Button size="sm">Пригласить</Button>
        </Inline>

        <Input
          aria-label="Поиск"
          placeholder="Поиск"
          startSlot={<Icon icon={Search} size="sm" />}
        />

        <Text size="sm">
          Ссылка в тексте: <a href="#rules">правила пространства</a>.
        </Text>
      </Stack>
    </KeyHints>
  );
}

const meta = {
  title: 'Всплывающее/KeyHints',
  component: Demo,
  tags: ['autodocs'],
  args: { onPin: fn(), onSelect: fn() },
  parameters: {
    docs: {
      description: {
        component:
          'Подсказки клавиш, как в Vimium. По `f` (только вне полей ввода) или `mod+.` над каждым фокусируемым элементом области появляется метка из букв (`alphabet`, по умолчанию домашний ряд): метки однозначны без Enter — ни одна не начало другой. Набор метки — фокус и нажатие (`action`: поле ввода только фокусируется), Backspace стирает букву, неподходящие метки гаснут; Esc, клик, прокрутка или изменение окна — выход. Буквы читаются по физическим клавишам — работают в русской раскладке. Метки — стекло и моно поверх всего, порядок — как читают (сверху вниз, слева направо). Раскладка меток — чистые функции `key-hints-model.ts`.',
      },
    },
  },
} satisfies Meta<typeof Demo>;

export default meta;

type Story = StoryObj<typeof meta>;

const hints = () => document.querySelectorAll('[data-key-hints] [aria-hidden]');

export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.keyboard('f');
    await waitFor(() => expect(hints().length).toBe(6));
    await expect(await screen().findByRole('status')).toHaveTextContent('6 подсказок');

    // Первая по порядку чтения — «Закрепить», её метка — первая буква алфавита
    await userEvent.keyboard('s');
    await expect(args.onPin).toHaveBeenCalled();
    await expect(canvas.getByRole('button', { name: 'Закрепить' })).toHaveFocus();
    await expectGone(() => document.querySelector('[data-key-hints]'));
  },
};

export const FocusInput: Story = {
  name: 'Поле ввода — только фокус',
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole('textbox', { name: 'Поиск' });

    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.keyboard('f');
    await waitFor(() => expect(hints().length).toBe(6));

    // Порядок: четыре кнопки в ряд, поле, ссылка — у поля пятая буква «k»
    await userEvent.keyboard('k');
    await expect(input).toHaveFocus();
    await expect(input).toHaveValue('');
  },
};

export const EscapeAndInputs: Story = {
  name: 'Esc выходит; в поле f — это текст',
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole('textbox', { name: 'Поиск' });

    await userEvent.click(input);
    await userEvent.keyboard('f');
    await expect(input).toHaveValue('f');
    await expect(hints()).toHaveLength(0);

    // С модификатором — работает и из поля
    await userEvent.keyboard('{Control>}.{/Control}');
    await waitFor(() => expect(hints().length).toBe(6));
    await pressEscape();
    await expectGone(() => document.querySelector('[data-key-hints]'));
    await expect(input).toHaveValue('f');
  },
};
