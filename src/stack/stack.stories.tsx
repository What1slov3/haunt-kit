import type { Meta, StoryObj } from '@storybook/react-vite';

import { Box, Stack, Text } from '@haunt/ui';

const cell = { background: 'var(--surface-2)', border: '1px solid var(--border)' };

function Cells({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <Box key={index} px={3} py={1.5} radius="sm" style={cell}>
          <Text size="sm">Элемент {index + 1}</Text>
        </Box>
      ))}
    </>
  );
}

const meta = {
  title: 'Раскладка/Stack',
  component: Stack,
  tags: ['autodocs'],
  args: {
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
          'Вертикальная колонка с промежутком `gap` из шкалы отступов. `align` и `justify` — короткие имена флекс-значений, `grow` растягивает колонку и даёт `min-width: 0`, чтобы текст внутри обрезался.',
      },
    },
  },
} satisfies Meta<typeof Stack>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Tight: Story = {
  args: { gap: 0.5 },
};

export const AlignCenter: Story = {
  args: { align: 'center' },
};

/** Распределение по высоте: колонке нужна высота от родителя */
export const JustifyBetween: Story = {
  args: { justify: 'between', style: { height: 200 } },
};
