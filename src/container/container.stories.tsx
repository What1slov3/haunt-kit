import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Box, Container, Stack, Text } from '@haunt/ui';

const cell = { background: 'var(--surface-2)', border: '1px solid var(--border)' };

const meta = {
  title: 'Раскладка/Container',
  component: Container,
  tags: ['autodocs'],
  args: { size: 'reading', gutter: 4 },
  argTypes: {
    size: { control: 'inline-radio', options: ['narrow', 'reading', 'wide', 'full'] },
    children: { control: false },
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Колонка страницы по центру: предел ширины из токенов — `narrow` 560 px (форма), `reading` 720 (текст), `wide` 1120 (лента с колонкой), `full` — без предела; `gutter` — поле по бокам, чтобы на узком месте содержимое не липло к краю. Предел — у содержимого, поле сверху: 720 px текста при любом `gutter`. Основа `PageLayout`.',
      },
    },
  },
  render: (args) => (
    <Container {...args}>
      <Box p={4} radius="md" style={cell}>
        <Text>Колонка {args.size}</Text>
      </Box>
    </Container>
  ),
} satisfies Meta<typeof Container>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const column = canvasElement.querySelector<HTMLElement>('[data-size="reading"]')!;

    // Ширина содержимого — ровно предел, поля — сверху
    await expect(column.clientWidth - 2 * 16).toBeLessThanOrEqual(720);
    await expect(within(canvasElement).getByText('Колонка reading')).toBeVisible();
  },
};

export const Sizes: Story = {
  name: 'Все ширины',
  render: () => (
    <Stack gap={3} style={{ paddingBlock: 16 }}>
      {(['narrow', 'reading', 'wide', 'full'] as const).map((size) => (
        <Container key={size} size={size}>
          <Box p={3} radius="md" style={cell}>
            <Text size="sm" mono>
              {size}
            </Text>
          </Box>
        </Container>
      ))}
    </Stack>
  ),
};
