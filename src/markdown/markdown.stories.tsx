import type { Meta, StoryObj } from '@storybook/react-vite';
import type { MouseEvent } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { Markdown, Stack, Text, type MentionResolver } from '@haunt/ui';

import { MarkdownFallback } from './markdown';

const people: Record<string, string> = { vanya: 'Ваня', lena: 'Лена Орлова' };
const roles: Record<string, string> = { модераторы: '#e5484d', дизайн: '#1fb6a8' };
const channels = new Set(['общий', 'релизы']);

/** Резолвер истории: ники, роли с цветом, каналы; остальное остаётся текстом */
const resolveMention: MentionResolver = (kind, name) => {
  if (kind === 'channel') return channels.has(name) ? {} : null;
  if (roles[name]) return { kind: 'role', color: roles[name] };
  if (people[name]) return { label: people[name], self: name === 'vanya' };

  return null;
};

const emoji = { smile: '😄', fire: '🔥', ghost: '👻', thumbsup: '👍' };

const message = `**Релиз 0.4** уже на стенде :fire:

Что нового — *коротко*:
- голосовые комнаты на LiveKit
- ~~старый сигнальный сервер~~ удалён
- спойлер для тех, кто не смотрел: ||в конце все призраки||

@vanya, проверь \`cargo test\` и отпишись в #релизы. Вопросы — @модераторы.
Подробности: https://haunt.dev/blog/0-4

> Ссылки только http, https и mailto, остальное — текстом.`;

const ready = (canvas: HTMLElement) =>
  waitFor(() => expect(canvas.querySelector('[data-ready]')).not.toBeNull());

const meta = {
  title: 'Текст/Markdown',
  component: Markdown,
  tags: ['autodocs'],
  args: { children: message, resolveMention, emoji },
  argTypes: {
    resolveMention: { control: false },
    onLinkClick: { control: false },
    emoji: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Текст сообщения: react-markdown + GFM + переносы строк как в чате, плюс свой синтаксис — `||спойлер||`, упоминания `@ник` / `#канал` / `@роль` через `resolveMention` (неизвестное — текстом) и шорткоды `:smile:` по словарю `emoji`. Сырой HTML выводится текстом, ссылки — только http, https и mailto, картинок нет. Блок кода — `CodeBlock`, ссылки — `Link`. Рендер грузится лениво: пока чанк идёт, виден исходный текст с переносами. `inline` — одна строка для превью.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 560 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Markdown>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await ready(canvasElement);

    const canvas = within(canvasElement);

    await expect(canvas.getByText('Релиз 0.4').tagName).toBe('STRONG');
    await expect(canvas.getByRole('button', { name: /Ваня/ })).toHaveAttribute('data-self');
    await expect(canvas.getByRole('button', { name: /модераторы/ })).toBeVisible();
    await expect(canvas.getByRole('img', { name: ':fire:' })).toBeVisible();
    await expect(canvas.getByRole('link', { name: /haunt\.dev/ })).toHaveAttribute(
      'target',
      '_blank',
    );
  },
};

export const Blocks: Story = {
  name: 'Блоки: код, цитата, таблица, задачи',
  args: {
    children: `Блок кода с языком:

\`\`\`rust
async fn health(State(db): State<PgPool>) -> StatusCode {
    sqlx::query("select 1").execute(&db).await.map_or(StatusCode::SERVICE_UNAVAILABLE, |_| StatusCode::OK)
}
\`\`\`

> Цитата из прошлого сообщения
> во две строки

1. первый
2. второй
   - вложенный

| Канал | Участники | Онлайн |
| :---- | --------: | :----: |
| общий | 128 | 12 |
| релизы | 34 | 3 |

- [x] миграции
- [ ] права на каналы`,
  },
  play: async ({ canvasElement }) => {
    await ready(canvasElement);

    const canvas = within(canvasElement);

    await expect(canvasElement.querySelector('figure')).not.toBeNull();
    await expect(canvasElement.querySelector('figure')).toHaveAttribute('data-language', 'rust');
    await expect(canvas.getByRole('table')).toBeVisible();
    await expect(canvas.getAllByRole('checkbox')).toHaveLength(2);
  },
};

export const SpoilerKeyboard: Story = {
  name: 'Спойлер раскрывается с клавиатуры',
  args: { children: 'Концовка: ||[ссылка](https://haunt.dev) и @vanya|| — не читай.' },
  play: async ({ canvasElement }) => {
    await ready(canvasElement);

    const canvas = within(canvasElement);
    const spoiler = canvas.getByRole('button', { name: 'Спойлер, показать' });

    // Скрытое содержимое inert: ссылка и упоминание внутри не входят в порядок Tab
    await expect(canvas.queryByRole('link')).toBeNull();

    await userEvent.tab();
    await expect(spoiler).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(spoiler).toHaveAttribute('data-revealed');
    // Раскрытие — переход opacity, видимость наступает не сразу
    await waitFor(() => expect(canvas.getByRole('link', { name: 'ссылка' })).toBeVisible());
  },
};

export const Unsafe: Story = {
  name: 'Опасный ввод — текстом',
  args: {
    children: `<script>alert('xss')</script>

<img src=x onerror="alert('xss')">

[нажми меня](javascript:alert('xss')) и [данные](data:text/html,<b>x</b>)

![картинка](https://haunt.dev/cat.png)`,
  },
  play: async ({ canvasElement }) => {
    await ready(canvasElement);

    const canvas = within(canvasElement);

    await expect(canvasElement.querySelector('script, img, [onerror]')).toBeNull();
    await expect(canvas.getByText(/<script>alert\('xss'\)<\/script>/)).toBeVisible();
    await expect(canvas.queryByRole('link')).toBeNull();
    await expect(canvas.getByText('нажми меня')).toBeVisible();
  },
};

export const LinkClick: Story = {
  name: 'onLinkClick',
  args: {
    children: 'Документация: [docs.haunt.dev](https://docs.haunt.dev) или mailto:team@haunt.dev',
    onLinkClick: fn((_href: string, event: MouseEvent<HTMLAnchorElement>) =>
      event.preventDefault(),
    ),
  },
  play: async ({ canvasElement, args }) => {
    await ready(canvasElement);
    await userEvent.click(within(canvasElement).getByRole('link', { name: 'docs.haunt.dev' }));
    await expect(args.onLinkClick).toHaveBeenCalledWith(
      'https://docs.haunt.dev',
      expect.anything(),
    );
  },
};

export const Inline: Story = {
  name: 'inline — превью одной строкой',
  args: {
    inline: true,
    children: '> цитата\n**Лена:** смотри @vanya, список:\n- раз\n- два ||и спойлер||',
  },
  render: (args) => (
    <Stack gap={1}>
      <Text size="sm" tone="muted">
        Ответ на сообщение
      </Text>

      <Text truncate>
        <Markdown {...args} />
      </Text>
    </Stack>
  ),
  play: async ({ canvasElement }) => {
    await ready(canvasElement);
    await expect(canvasElement.querySelector('p, ul, blockquote')).toBeNull();
  },
};

export const WithoutResolver: Story = {
  name: 'Без резолвера и словаря',
  args: {
    children: 'Упоминания @vanya и #общий, шорткод :smile: — всё текстом.',
    resolveMention: undefined,
    emoji: undefined,
  },
  play: async ({ canvasElement }) => {
    await ready(canvasElement);
    await expect(within(canvasElement).queryByRole('button')).toBeNull();
  },
};

/**
 * Слева — то, что видно, пока грузится чанк рендера (тот же текст с переносами), справа — готовый рендер.
 * В тестах чанк обычно уже в кэше, поэтому fallback показан отдельно, а не пойман на лету.
 */
export const LazyLoading: Story = {
  name: 'Ленивая загрузка: fallback, затем рендер',
  args: { children: '**Жирный** и *курсив*\nвторая строка ||спойлер||' },
  render: (args) => (
    <Stack gap={3}>
      <MarkdownFallback {...args} data-testid="fallback" />

      <Markdown {...args} data-testid="view" />
    </Stack>
  ),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const fallback = canvas.getByTestId('fallback');

    await expect(fallback).toHaveAttribute('data-loading');
    await expect(getComputedStyle(fallback).whiteSpace).toBe('pre-wrap');
    await expect(fallback.textContent).toBe(args.children);

    await waitFor(() => expect(canvas.getByTestId('view')).toHaveAttribute('data-ready'));
    await expect(canvas.getByTestId('view').querySelector('strong')).not.toBeNull();
  },
};
