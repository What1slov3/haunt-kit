import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import {
  AccentScope,
  Button,
  DropdownMenu,
  Inline,
  Input,
  Stack,
  Surface,
  Text,
  TokenScope,
  tokens,
  type TokenValues,
} from '@haunt/ui';

import { expectVisible, screen } from '../lib/stories/play-helpers';

/** Кусок экрана: контролы, текст через `tokens.*` и меню, которое порталится */
function Panel({ label }: { label: string }) {
  return (
    <Surface level={2} p={3}>
      <Stack gap={2}>
        <Text weight="semibold" style={{ color: tokens.accentText }}>
          {label}
        </Text>

        <Inline gap={1.5}>
          <Input placeholder="Поиск" aria-label={`${label}: поиск`} />

          <Button variant="accent">Готово</Button>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button variant="secondary">Ещё</Button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Content>
              <DropdownMenu.Item>Переименовать</DropdownMenu.Item>
              <DropdownMenu.Item>Удалить</DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </Inline>
      </Stack>
    </Surface>
  );
}

const roomy: TokenValues = {
  controlMd: '36px',
  radiusMd: '10px',
  radiusLg: '14px',
  textMd: '14px',
};

const meta = {
  title: 'Тема/TokenScope',
  component: TokenScope,
  tags: ['autodocs'],
  args: { tokens: roomy, children: null },
  argTypes: { children: { control: false } },
  parameters: {
    docs: {
      description: {
        component:
          'Контейнер со своими значениями токенов: всё внутри читает их — плотность, скругления, цвета. Ключи типизированы (`TokenKey`: `controlMd`, `radiusLg`, `space1_5`…), опечатка — ошибка компиляции. Всплывающее порталится в хост с теми же переменными, вложенный в хост внешнего скоупа: внутри `AccentScope › TokenScope` меню получает и акцент, и токены. Без компонента — `setTokens(element, values)` (возвращает откат), `tokenStyle(values)` для инлайн-стиля, `tokens.textMuted` → `var(--text-muted)`, `readToken(key, element)`. Имена и значения по умолчанию собираются из CSS кита (`pnpm --filter @haunt/ui build:tokens`).',
      },
    },
  },
} satisfies Meta<typeof TokenScope>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Просторнее внутри скоупа',
  render: (args) => (
    <Stack gap={4} style={{ maxWidth: 520 }}>
      <Panel label="Как во всём приложении" />

      <TokenScope tokens={args.tokens}>
        <Panel label="Внутри TokenScope" />
      </TokenScope>
    </Stack>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [outside, inside] = canvas.getAllByRole('button', { name: 'Готово' });

    await expect(outside!.getBoundingClientRect().height).toBe(28);
    await expect(inside!.getBoundingClientRect().height).toBe(36);

    // Меню из скоупа порталится в хост с теми же токенами
    await userEvent.click(canvas.getAllByRole('button', { name: 'Ещё' })[1]!);

    const menu = await screen().findByRole('menu');

    await expectVisible(menu);
    await expect(getComputedStyle(menu).getPropertyValue('--radius-lg').trim()).toBe('14px');
  },
};

export const InsideAccent: Story = {
  name: 'Внутри AccentScope: и акцент, и токены',
  render: (args) => (
    <AccentScope accent="teal" style={{ maxWidth: 520 }}>
      <TokenScope tokens={args.tokens}>
        <Panel label="teal + просторнее" />
      </TokenScope>
    </AccentScope>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Ещё' }));

    const menu = await screen().findByRole('menu');

    await expectVisible(menu);
    await expect(getComputedStyle(menu).getPropertyValue('--radius-lg').trim()).toBe('14px');
    await expect(getComputedStyle(menu).getPropertyValue('--accent').trim()).toBe('#0b7f77');
  },
};
