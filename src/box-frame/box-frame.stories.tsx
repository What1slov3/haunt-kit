import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { BoxFrame, Grid, Stack, Text, TuiProgress } from '@haunt/ui';

const meta = {
  title: 'TUI/BoxFrame',
  component: BoxFrame,
  tags: ['autodocs'],
  args: {
    title: 'haunt-mod',
    children: (
      <Stack gap={1}>
        <Text mono size="sm">
          uptime 4d 07:12 · 3 правила · 128 событий
        </Text>

        <TuiProgress value={64} width={24} label="Очередь" />
      </Stack>
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 520 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Рамка в духе псевдографики — блок как окно терминала: `┌─ заголовок ──┐`, по бокам `│`, снизу `└──┘` и подпись `footer`. Варианты: `single`, `double` (`╔═╗`), `rounded` (`╭─╮`), `heavy` (`┏━┓`). Линии — настоящие знаки U+2500 из шрифта глифов кита (`Haunt TUI`, ровно в клетку моно-сетки), строки рамки — высотой в строку TUI, содержимое ложится в ту же сетку. Растягивается по содержимому без измерения в JS. Заголовок — настоящий текст, читается скринридером. `tone="accent"` — активное окно. При `data-tui="off"` — обычная тонкая рамка кита, заголовок — строка над содержимым.',
      },
    },
  },
} satisfies Meta<typeof BoxFrame>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const frame = canvasElement.querySelector('section') as HTMLElement;
    const middle = frame.children[1] as HTMLElement;
    const side = middle.firstElementChild as HTMLElement;
    const content = middle.children[1] as HTMLElement;

    await expect(within(frame).getByText('haunt-mod')).toBeVisible();
    // Линия сбоку — знаки «│» во всю высоту содержимого: рамка растянулась по нему
    await expect(side.textContent?.startsWith('│\n│')).toBe(true);
    await expect(side.getBoundingClientRect().height).toBe(content.getBoundingClientRect().height);
  },
};

export const Variants: Story = {
  name: 'Варианты',
  render: (args) => (
    <Grid columns={2} gap={3}>
      <BoxFrame {...args} variant="single" title="single" />
      <BoxFrame {...args} variant="double" title="double" />
      <BoxFrame {...args} variant="rounded" title="rounded" />
      <BoxFrame {...args} variant="heavy" title="heavy" />
    </Grid>
  ),
};

export const Accent: Story = {
  name: 'Активное окно',
  args: { tone: 'accent', variant: 'double', footer: 'F1 справка' },
};

export const Footer: Story = {
  name: 'Подпись снизу',
  args: { footer: '42 / 128' },
};

export const WithoutTitle: Story = {
  name: 'Без заголовка',
  args: { title: undefined, variant: 'rounded' },
};

export const TuiOff: Story = {
  name: 'Без TUI',
  globals: { tui: 'off' },
  args: { footer: '42 / 128' },
  play: async ({ canvasElement }) => {
    const frame = canvasElement.querySelector('section') as HTMLElement;

    await expect(getComputedStyle(frame).borderTopStyle).toBe('solid');
  },
};
