import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Box, Stack, Text, WithSidebar } from '@haunt/ui';

const cell = { background: 'var(--surface-2)', border: '1px solid var(--border)' };

function Parts() {
  return (
    <>
      <Box p={4} radius="md" style={cell}>
        <Text>Основная — лента</Text>
      </Box>

      <Box p={4} radius="md" style={cell}>
        <Text>Боковая — о пространстве</Text>
      </Box>
    </>
  );
}

const meta = {
  title: 'Раскладка/WithSidebar',
  component: WithSidebar,
  tags: ['autodocs'],
  args: { side: 'end', sideWidth: '240px', contentMin: '50%', gap: 4 },
  argTypes: {
    side: { control: 'inline-radio', options: ['start', 'end'] },
    align: { control: 'inline-radio', options: ['stretch', 'start'] },
    children: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Две части рядом — основная и боковая; боковая уходит под основную, когда основной становится тесно (`contentMin`). Без точек перелома по окну: решает ширина самого контейнера — в AppShell её меняют панели. `side` — какой из двух детей боковой, `sideWidth` — его ширина рядом (по умолчанию `--aside-width`, 300 px). Приём «Sidebar» из Every Layout; основа `PageLayout` и `SettingsLayout`.',
      },
    },
  },
  render: (args) => (
    <Stack gap={4}>
      {[720, 400].map((width) => (
        <Stack key={width} gap={1}>
          <Text size="sm" tone="muted" mono>
            {width} px
          </Text>

          <WithSidebar {...args} style={{ width }} data-width={width}>
            <Parts />
          </WithSidebar>
        </Stack>
      ))}
    </Stack>
  ),
} satisfies Meta<typeof WithSidebar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const top = (width: number, text: string) =>
      within(canvasElement.querySelector<HTMLElement>(`[data-width="${width}"]`)!)
        .getByText(text)
        .getBoundingClientRect().top;

    // Широко — рядом, одна высота; узко — боковая под основной
    await expect(top(720, 'Боковая — о пространстве')).toBe(top(720, 'Основная — лента'));
    await expect(top(400, 'Боковая — о пространстве')).toBeGreaterThan(
      top(400, 'Основная — лента'),
    );
  },
};
