import type { Meta, StoryObj } from '@storybook/react-vite';

import { Box, Grid, Text } from '@haunt/ui';

const cell = { background: 'var(--surface-2)', border: '1px solid var(--border)' };

function Cells({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <Box key={index} p={3} radius="md" style={cell}>
          <Text size="sm">Карточка {index + 1}</Text>
        </Box>
      ))}
    </>
  );
}

const meta = {
  title: 'Раскладка/Grid',
  component: Grid,
  tags: ['autodocs'],
  args: {
    columns: 3,
    gap: 3,
    children: <Cells />,
  },
  argTypes: {
    children: { control: false },
    as: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Сетка: `columns` — число равных колонок или строка `grid-template-columns`; `minColumnWidth` — авто-сетка, колонок столько, сколько влезет. Промежутки — из шкалы отступов.',
      },
    },
  },
} satisfies Meta<typeof Grid>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Columns: Story = {};

/** Авто-сетка: сузьте холст — колонки перестроятся сами */
export const AutoFill: Story = {
  args: { columns: undefined, minColumnWidth: '160px' },
};

export const TemplateString: Story = {
  args: { columns: '200px 1fr', children: <Cells count={4} /> },
};

export const SeparateGaps: Story = {
  args: { gap: undefined, rowGap: 1, columnGap: 6 },
};
