import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Field, findConflict, KeybindingRecorder, ShortcutList } from '@haunt/ui';

const taken = [
  { combo: 'mod+k', label: 'Палитра команд' },
  { combo: 'alt+arrowup', label: 'Предыдущий канал' },
];

const meta = {
  title: 'Поля/KeybindingRecorder',
  component: KeybindingRecorder,
  tags: ['autodocs'],
  args: {
    defaultValue: 'mod+shift+m',
    defaultBinding: 'mod+shift+m',
    // Подписи как на Windows: истории и проверки не зависят от машины
    apple: false,
    conflict: (combo: string) => findConflict(combo, taken, false)?.label,
    onValueChange: fn(),
  },
  argTypes: { conflict: { control: false } },
  parameters: {
    docs: {
      description: {
        component:
          'Запись сочетания для настроек: нажать кнопку, затем сочетание — зажатые модификаторы видны сразу, первая обычная клавиша завершает запись. Результат — строка формата `useHotkey` (`mod+shift+k`, буквы по физической клавише — работает в любой раскладке), подпись — `formatHotkey`. Esc — отмена, Tab — уйти. `conflict` — проверка «уже занято» (`findConflict` по списку), печатное без модификатора не записывается. Крестик убирает сочетание, стрелка возвращает `defaultBinding`. ' +
          'Чистые функции — `comboFromEvent`, `normalizeCombo`, `sameCombo`, `findConflict`.',
      },
    },
  },
} satisfies Meta<typeof KeybindingRecorder>;

export default meta;

type Story = StoryObj<typeof meta>;

const recorder = (canvas: HTMLElement) =>
  within(canvas).getByRole('button', { name: /изменить сочетание$|^Задать сочетание$/ });

export const Default: Story = {};

export const Empty: Story = {
  args: { defaultValue: null },
};

export const ApplePlatform: Story = {
  name: 'Подписи Apple',
  args: { apple: true },
};

export const InSettings: Story = {
  name: 'В настройках',
  render: (args) => (
    <div style={{ display: 'grid', gap: 16, maxWidth: 520 }}>
      <Field label="Выключить микрофон" horizontal>
        <KeybindingRecorder {...args} />
      </Field>

      <ShortcutList
        apple={false}
        groups={[
          {
            heading: 'Уже заняты',
            items: taken.map((item) => ({ keys: item.combo, label: item.label })),
          },
        ]}
      />
    </div>
  ),
};

export const Record: Story = {
  name: 'Запись: модификаторы видны, клавиша завершает',
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByRole('button', {
      name: 'Ctrl+Shift+M — изменить сочетание',
    });

    await userEvent.click(button);

    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(button).toHaveTextContent('Нажмите сочетание…');

    // Модификаторы, зажатые в одном вызове keyboard, отпускаются в его конце — держим их в одном
    await userEvent.keyboard('{Control>}{Alt>}');

    await expect(button).toHaveTextContent('Ctrl+Alt');

    await userEvent.keyboard('{Control>}{Alt>}j{/Alt}{/Control}');

    await expect(args.onValueChange).toHaveBeenCalledWith('mod+alt+j');
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(button).toHaveTextContent('Ctrl+Alt+J');
  },
};

export const Conflict: Story = {
  name: 'Занятое не записывается',
  play: async ({ args, canvasElement }) => {
    await userEvent.click(recorder(canvasElement));
    await userEvent.keyboard('{Control>}k{/Control}');

    await expect(within(canvasElement).getByRole('alert')).toHaveTextContent(
      'Уже занято: Палитра команд',
    );
    await expect(args.onValueChange).not.toHaveBeenCalled();
  },
};

export const NeedsModifier: Story = {
  name: 'Буква без модификатора — нельзя',
  play: async ({ args, canvasElement }) => {
    await userEvent.click(recorder(canvasElement));
    await userEvent.keyboard('k');

    await expect(within(canvasElement).getByRole('alert')).toHaveTextContent(
      'Добавьте модификатор',
    );
    await expect(args.onValueChange).not.toHaveBeenCalled();
  },
};

export const EscapeCancels: Story = {
  name: 'Esc отменяет запись',
  play: async ({ args, canvasElement }) => {
    const button = recorder(canvasElement);

    await userEvent.click(button);
    await userEvent.keyboard('{Escape}');

    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(button).toHaveTextContent('Ctrl+Shift+M');
    await expect(args.onValueChange).not.toHaveBeenCalled();
  },
};

export const ClearAndReset: Story = {
  name: 'Убрать и вернуть по умолчанию',
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.queryByRole('button', { name: 'Вернуть по умолчанию' })).toBeNull();

    await userEvent.click(canvas.getByRole('button', { name: 'Убрать сочетание' }));

    await expect(args.onValueChange).toHaveBeenLastCalledWith(null);
    await expect(canvas.getByRole('button', { name: 'Задать сочетание' })).toHaveTextContent(
      'Не задано',
    );

    await userEvent.click(canvas.getByRole('button', { name: 'Вернуть по умолчанию' }));

    await expect(args.onValueChange).toHaveBeenLastCalledWith('mod+shift+m');
  },
};
