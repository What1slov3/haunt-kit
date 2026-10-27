import type { Meta, StoryObj } from '@storybook/react-vite';

import { Center, Spinner, Stack, Text } from '@haunt/ui';

const meta = {
  title: 'Раскладка/Center',
  component: Center,
  tags: ['autodocs'],
  args: { fill: true },
  argTypes: { children: { control: false } },
  parameters: {
    docs: {
      description: {
        component:
          'Содержимое по центру по обеим осям: загрузка или пустое состояние посреди панели. `fill` — занять высоту родителя (min-height, так что высокое содержимое растягивает рамку, а не вылезает), `inline` — строчный, по ширине содержимого.',
      },
    },
  },
  render: (args) => (
    <div
      style={{
        height: 220,
        display: 'flex',
        border: '1px dashed var(--border)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <Center {...args}>
        <Stack gap={2} align="center">
          <Spinner />

          <Text size="sm" tone="muted">
            Загружаем ленту
          </Text>
        </Stack>
      </Center>
    </div>
  ),
} satisfies Meta<typeof Center>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
