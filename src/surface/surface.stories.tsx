import type { Meta, StoryObj } from '@storybook/react-vite';

import { Grid, Stack, Surface, Text } from '@haunt/ui';

function Content({ title, hint }: { title: string; hint: string }) {
  return (
    <Stack gap={0.5}>
      <Text weight="semibold">{title}</Text>

      <Text size="sm" tone="muted">
        {hint}
      </Text>
    </Stack>
  );
}

const meta = {
  title: 'Раскладка/Surface',
  component: Surface,
  tags: ['autodocs'],
  args: {
    level: 2,
    p: 3,
    children: <Content title="level 2" hint="карточка внутри панели" />,
  },
  argTypes: {
    children: { control: false },
    as: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          '`Surface panel level={1|2|3}` — слои приложения поверх живого фона (рейл → боковая панель → содержимое), почти непрозрачные, с бликом по кромке, зерном и прожектором. `Surface level` без `panel` — карточки внутри. `glass` — только плавающее. Включите живой фон в тулбаре, чтобы увидеть, как слои лежат на нём.',
      },
    },
  },
} satisfies Meta<typeof Surface>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Card: Story = {};

export const Panels: Story = {
  render: (args) => (
    <Grid minColumnWidth="160px" gap={2}>
      <Surface {...args} level={1} panel>
        <Content title="panel 1" hint="рейл" />
      </Surface>

      <Surface {...args} level={2} panel>
        <Content title="panel 2" hint="боковая панель" />
      </Surface>

      <Surface {...args} level={3} panel>
        <Content title="panel 3" hint="содержимое" />
      </Surface>
    </Grid>
  ),
};

export const Glass: Story = {
  args: { glass: true, children: <Content title="glass" hint="плавающий слой" /> },
};

export const Floating: Story = {
  args: {
    glass: true,
    floating: true,
    children: <Content title="glass floating" hint="шапка над прокруткой: тень и стекло" />,
  },
};

/** Наведите: подсветка и прожектор за курсором */
export const Interactive: Story = {
  args: { interactive: true, children: <Content title="interactive" hint="карточка-ссылка" /> },
};

export const WithoutEffects: Story = {
  args: {
    panel: true,
    spotlight: false,
    grain: false,
    children: <Content title="panel без эффектов" hint="spotlight={false} grain={false}" />,
  },
};

export const NoBorder: Story = {
  args: { border: false, children: <Content title="без границы" hint="border={false}" /> },
};
