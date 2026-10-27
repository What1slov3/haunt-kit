import { useState, type ComponentProps } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { CommandLine, Stack, Text, type CommandSuggestion } from '@haunt/ui';

import { expectGone, expectVisible, screen } from '../lib/stories/play-helpers';

const commands: CommandSuggestion[] = [
  { value: '/ban', description: 'заблокировать участника' },
  { value: '/banlist', description: 'список блокировок' },
  { value: '/kick', description: 'выгнать из пространства' },
  { value: '/mute', description: 'выключить микрофон' },
  { value: '/slowmode', description: 'медленный режим канала' },
  { value: '/help', description: 'справка' },
];

const members = ['@maria', '@marina', '@ivan', '@newbie', '@haunt-mod'];

/** «Сервер»: подсказки ников по последнему слову, с задержкой и отменой */
function suggestMembers(query: string, { signal }: { signal: AbortSignal }) {
  return new Promise<CommandSuggestion[]>((resolve, reject) => {
    const timer = setTimeout(() => {
      const words = query.split(' ');
      const last = words.at(-1) ?? '';
      const head = words.slice(0, -1).join(' ');

      resolve(
        last.startsWith('@')
          ? members
              .filter((member) => member.startsWith(last))
              .map((member) => ({ value: `${head} ${member}`.trim(), label: member }))
          : [],
      );
    }, 150);

    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });
}

function Console(props: Partial<ComponentProps<typeof CommandLine>>) {
  const [log, setLog] = useState<string[]>([]);

  return (
    <Stack gap={2} style={{ maxWidth: 520 }}>
      <Stack gap={0.5}>
        {log.map((line, index) => (
          <Text key={index} mono size="sm" tone="muted">
            $ {line}
          </Text>
        ))}
      </Stack>

      <CommandLine
        suggestions={commands}
        prompt="$"
        {...props}
        onSubmit={(value) => {
          props.onSubmit?.(value);
          setLog((current) => [...current, value]);
        }}
      />
    </Stack>
  );
}

const meta = {
  title: 'TUI/CommandLine',
  component: Console,
  tags: ['autodocs'],
  args: { onSubmit: fn(), label: 'Консоль бота' },
  parameters: {
    docs: {
      description: {
        component:
          'Командная строка: `Input prompt` + автодополнение и история. Подсказки — данными (`suggestions`: строки или `{ value, label, description }`, фильтр как у Combobox — начало строки выше) или функцией `(query, { signal })` с отменой: следующий набор отменяет прошлый запрос (`debounce`). Листбокс под строкой, фокус остаётся в поле (`aria-activedescendant`): ↑ / ↓ — по подсказкам, Tab — дополнить (выбранную, иначе общее начало, как в bash), Enter на выбранной — подставить, Esc — закрыть список. Без списка ↑ / ↓ — история, как в `LogView` (`defaultHistory`, `historySize`).',
      },
    },
  },
} satisfies Meta<typeof Console>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const input = within(canvasElement).getByRole('combobox', { name: 'Консоль бота' });

    await userEvent.click(input);
    await userEvent.type(input, '/ba');

    const list = await screen().findByRole('listbox', { name: 'Подсказки' });

    await expectVisible(list);
    await expect(within(list).getAllByRole('option')).toHaveLength(2);

    // Tab — до общего начала «/ban», а с выбранной стрелкой — её
    await userEvent.keyboard('{Tab}');
    await expect(input).toHaveValue('/ban');
    await expect(input).toHaveFocus();

    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    await expect(input).toHaveValue('/banlist');
    await expectGone(() => screen().queryByRole('listbox'));

    await userEvent.keyboard('{Enter}');
    await expect(args.onSubmit).toHaveBeenCalledWith('/banlist');
    await expect(input).toHaveValue('');
  },
};

export const History: Story = {
  name: 'История ↑ / ↓',
  args: { defaultHistory: ['/help', '/kick @newbie'] },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole('combobox');

    await userEvent.click(input);
    await userEvent.type(input, 'черн');
    await userEvent.keyboard('{ArrowUp}');
    await expect(input).toHaveValue('/kick @newbie');
    await userEvent.keyboard('{ArrowUp}');
    await expect(input).toHaveValue('/help');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await expect(input).toHaveValue('черн');
  },
};

export const EscapeCloses: Story = {
  name: 'Esc закрывает список',
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole('combobox');

    await userEvent.click(input);
    await userEvent.type(input, '/m');
    await expectVisible(await screen().findByRole('listbox'));
    await userEvent.keyboard('{Escape}');
    await expectGone(() => screen().queryByRole('listbox'));
    await expect(input).toHaveValue('/m');
  },
};

export const AsyncSuggestions: Story = {
  name: 'Подсказки функцией с отменой',
  args: { suggestions: suggestMembers, prompt: true },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole('combobox');

    await userEvent.click(input);
    await userEvent.type(input, '/ban @mar');

    const list = await screen().findByRole('listbox', {}, { timeout: 2000 });

    await waitFor(() => expect(within(list).getAllByRole('option')).toHaveLength(2));
    await userEvent.keyboard('{ArrowDown}{Tab}');
    await expect(input).toHaveValue('/ban @maria');
  },
};
