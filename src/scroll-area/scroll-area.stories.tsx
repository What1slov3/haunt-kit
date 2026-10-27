import type { Meta, StoryObj } from '@storybook/react-vite';

import { Avatar, Inline, NavItem, ScrollArea, Stack, Surface, Text } from '@haunt/ui';

function Members({ count = 30 }: { count?: number }) {
  return (
    <Stack gap={0} p={1}>
      {Array.from({ length: count }, (_, index) => (
        <NavItem
          key={index}
          density="default"
          icon={<Avatar name={`Участник ${index + 1}`} size="sm" />}
        >
          Участник {index + 1} с очень длинным именем для проверки обрезания
        </NavItem>
      ))}
    </Stack>
  );
}

const meta = {
  title: 'Раскладка/ScrollArea',
  component: ScrollArea,
  tags: ['autodocs'],
  args: {
    style: { height: 220 },
    children: <Members />,
  },
  argTypes: {
    children: { control: false },
  },
  decorators: [
    (Story) => (
      <Surface level={1} style={{ width: 280 }}>
        <Story />
      </Surface>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Прокрутка с тонкой полосой в стиле системы (Radix ScrollArea). Высоту задаёт родитель: явно или через `grow` внутри флекс-колонки — иначе скроллить нечему.',
      },
    },
  },
} satisfies Meta<typeof ScrollArea>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Vertical: Story = {};

export const AlwaysVisible: Story = {
  args: { type: 'always' },
};

export const Horizontal: Story = {
  args: {
    orientation: 'horizontal',
    style: { height: 'auto' },
    children: (
      <Inline gap={2} p={2} style={{ width: 'max-content' }}>
        {Array.from({ length: 16 }, (_, index) => (
          <Avatar key={index} name={`Пространство ${index + 1}`} shape="rounded" size="lg" />
        ))}
      </Inline>
    ),
  },
};

/** `grow` — остаток флекс-колонки: шапка фиксирована, список прокручивается */
export const GrowInColumn: Story = {
  args: { grow: true, style: undefined },
  decorators: [
    (Story) => (
      <div style={{ display: 'flex', flexDirection: 'column', height: 240 }}>
        <Text weight="semibold" style={{ padding: 8 }}>
          Участники — 30
        </Text>

        <Story />
      </div>
    ),
  ],
};
