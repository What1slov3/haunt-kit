import { useEffect, useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { Button, LogView, Stack, type LogLevel, type LogLine } from '@haunt/ui';

const start = new Date(2026, 9, 26, 14, 2, 0).getTime();

const events: Array<[LogLevel, string, string]> = [
  ['info', 'gateway', 'подключено, сессия 7f3a…c21'],
  ['debug', 'voice', 'SFU: выбран регион eu-central'],
  ['info', 'members', 'Мария Орлова вошла в пространство'],
  ['warn', 'ratelimit', 'канал #общий: 18 сообщений за 10 с, включён слоумод'],
  ['info', 'bot/haunt-mod', 'правило «ссылки новичков» применено к @newbie'],
  ['error', 'webhook', 'POST https://example.invalid/hook — 502, повтор через 30 с'],
  ['info', 'roles', 'роль «модераторы» выдана Иван Лебедев'],
  ['debug', 'cache', 'прогрет список каналов, 42 записи'],
];

function makeLines(count: number, offset = 0): LogLine[] {
  return Array.from({ length: count }, (_, index) => {
    const [level, source, text] = events[
      (index + offset) % events.length
    ] as (typeof events)[number];

    return { id: index + offset, time: start + (index + offset) * 7_000, level, source, text };
  });
}

const meta = {
  title: 'TUI/LogView',
  component: LogView,
  tags: ['autodocs'],
  args: { lines: makeLines(24), height: 240, label: 'Журнал событий' },
  argTypes: { lines: { control: false } },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 720 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Терминальный журнал — события сообщества, консоль бота. Моно-строки: время с секундами, уровень цветом (`debug`, `info`, `warn`, `error`), источник в скобках-метке TUI (без TUI — просто слово), текст с переносом. Пока пользователь внизу, новые строки прокручивают журнал; прокрутил вверх — журнал стоит, внизу строка «новые строки ↓» в обратном цвете. `maxLines` — сколько последних строк держать. `onSubmit` — строка ввода `CommandLine` под разделителем `├──┤`. Область прокрутки фокусируется и листается с клавиатуры. Больше 200 строк — виртуализация (`virtual`): журнал на тысячи строк держит в DOM только окно. В строке ввода ↑ / ↓ листают историю команд, как в терминале; набранный черновик возвращается после самой новой (`historySize`, `defaultHistory`).',
      },
    },
  },
} satisfies Meta<typeof LogView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const log = within(canvasElement).getByRole('log', { name: 'Журнал событий' });

    // Открылся внизу: последние строки видны сразу
    await waitFor(() =>
      expect(log.scrollTop + log.clientHeight).toBeGreaterThan(log.scrollHeight - 8),
    );
  },
};

export const BotConsole: Story = {
  name: 'Консоль бота',
  args: { lines: makeLines(6, 3), onSubmit: fn(), label: 'Консоль haunt-mod', height: 220 },
  play: async ({ args, canvasElement }) => {
    const input = within(canvasElement).getByRole('combobox', {
      name: 'Консоль haunt-mod: команда',
    });

    await userEvent.type(input, '/ban @newbie 1d{Enter}');
    await expect(args.onSubmit).toHaveBeenCalledWith('/ban @newbie 1d');
    await expect(input).toHaveValue('');
  },
};

export const MaxLines: Story = {
  name: 'Лимит строк',
  args: { lines: makeLines(500), maxLines: 50 },
  play: async ({ canvasElement }) => {
    const log = within(canvasElement).getByRole('log');

    await expect(log.children).toHaveLength(50);
  },
};

/** Журнал пополняется по кнопке: в тесте нет таймеров, в документации — по таймеру */
function StreamingLog({ auto, ...props }: Story['args'] & { auto?: boolean }) {
  const [lines, setLines] = useState(() => makeLines(20));
  const append = () => setLines((current) => [...current, ...makeLines(1, current.length)]);

  useEffect(() => {
    if (!auto) return;

    const timer = setInterval(() => {
      setLines((current) => [...current, ...makeLines(1, current.length)]);
    }, 1200);

    return () => clearInterval(timer);
  }, [auto]);

  return (
    <Stack gap={2} align="start">
      <Button size="sm" onClick={append}>
        Добавить строку
      </Button>

      <LogView {...props} lines={lines} />
    </Stack>
  );
}

export const Live: Story = {
  name: 'Поток (по таймеру)',
  render: (args) => <StreamingLog {...args} auto />,
};

export const PausesWhenScrolledUp: Story = {
  name: 'Прокрутили вверх — стоит, плашка «новые строки»',
  render: (args) => <StreamingLog {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const log = canvas.getByRole('log');
    const add = canvas.getByRole('button', { name: 'Добавить строку' });

    log.scrollTop = 0;
    log.dispatchEvent(new Event('scroll'));
    await userEvent.click(add);

    const pill = await canvas.findByRole('button', { name: 'новые строки ↓' });

    await expect(log.scrollTop).toBe(0);

    await userEvent.click(pill);
    await waitFor(() =>
      expect(log.scrollTop + log.clientHeight).toBeGreaterThan(log.scrollHeight - 8),
    );
    await expect(canvas.queryByRole('button', { name: 'новые строки ↓' })).toBeNull();

    // Внизу — снова следует за потоком
    await userEvent.click(add);
    await waitFor(() =>
      expect(log.scrollTop + log.clientHeight).toBeGreaterThan(log.scrollHeight - 8),
    );
  },
};

export const Virtual: Story = {
  name: 'Журнал на 5 000 строк (виртуализация)',
  args: { lines: makeLines(5000), maxLines: 5000, height: 320 },
  play: async ({ canvasElement }) => {
    const log = within(canvasElement).getByRole('log');
    const rendered = () => log.querySelectorAll('[data-level]').length;

    // Открылся внизу, в DOM — окно и запас, а не 5 000 строк
    await waitFor(() =>
      expect(log.scrollTop + log.clientHeight).toBeGreaterThan(log.scrollHeight - 8),
    );
    await expect(rendered()).toBeLessThan(80);
    await expect(log.querySelector('[data-virtual-index="4999"]')).not.toBeNull();

    log.scrollTop = 0;

    await waitFor(() => expect(log.querySelector('[data-virtual-index="0"]')).not.toBeNull());
    await expect(rendered()).toBeLessThan(80);
  },
};

export const CommandHistory: Story = {
  name: 'История команд: ↑ / ↓, черновик не теряется',
  args: { lines: makeLines(4), onSubmit: fn(), label: 'Консоль haunt-mod', height: 200 },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole('combobox', {
      name: 'Консоль haunt-mod: команда',
    });

    await userEvent.type(input, '/mute @newbie{Enter}/slowmode 10{Enter}/ban');

    await userEvent.keyboard('{ArrowUp}');
    await expect(input).toHaveValue('/slowmode 10');

    await userEvent.keyboard('{ArrowUp}');
    await expect(input).toHaveValue('/mute @newbie');

    // Старше нет — остаётся самая старая
    await userEvent.keyboard('{ArrowUp}');
    await expect(input).toHaveValue('/mute @newbie');

    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await expect(input).toHaveValue('/ban');

    // Повтор последней команды в историю не дублируется
    await userEvent.clear(input);
    await userEvent.type(input, '/slowmode 10{Enter}{ArrowUp}{ArrowUp}');
    await expect(input).toHaveValue('/mute @newbie');
  },
};
