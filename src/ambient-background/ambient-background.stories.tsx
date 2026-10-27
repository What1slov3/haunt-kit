import type { Meta, StoryObj } from '@storybook/react-vite';

import { ambient, AmbientBackground, Button, Stack, Surface, Text } from '@haunt/ui';
import { FX_BACKGROUNDS } from '@haunt/ui/fx';

const meta = {
  title: 'Фон/AmbientBackground',
  component: AmbientBackground,
  tags: ['autodocs'],
  args: {
    variant: 'blobs',
    reaction: 'quiet',
    intensity: 'normal',
    fixed: false,
  },
  argTypes: {
    variant: { control: 'select', options: ['blobs', 'dots', 'scanlines', ...FX_BACKGROUNDS] },
    reaction: { control: 'inline-radio', options: ['off', 'quiet', 'vivid'] },
    intensity: { control: 'inline-radio', options: ['low', 'normal'] },
  },
  // Фон внутри рамки (fixed={false}): рамке нужен свой контекст позиционирования и наложения
  decorators: [
    (Story) => (
      <div
        style={{
          position: 'relative',
          isolation: 'isolate',
          height: 280,
          overflow: 'hidden',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Живой фон под экраном: `blobs` — три размытых пятна на CSS, `dots` — точечная сетка с частицами на canvas, остальные варианты — фоны `@haunt/ui/fx` (см. «Эффекты/FxBackground»). `reaction` — отклик на курсор, клики и `ambient.pulse()`. Кладётся один раз под экран; в истории — внутри рамки (`fixed={false}`). Весь фон Storybook включается в тулбаре «Фон».',
      },
    },
  },
} satisfies Meta<typeof AmbientBackground>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Blobs: Story = {};

export const BlobsLow: Story = {
  args: { intensity: 'low' },
};

export const BlobsNoNoise: Story = {
  args: { noise: false },
};

export const Dots: Story = {
  args: { variant: 'dots' },
};

export const ReactionOff: Story = {
  args: { variant: 'dots', reaction: 'off' },
};

export const ReactionVivid: Story = {
  args: { variant: 'dots', reaction: 'vivid' },
};

/** `ambient.pulseFrom(element)` — волна от кнопки, как при отправке сообщения */
export const Pulse: Story = {
  args: { variant: 'dots', reaction: 'vivid' },
  render: (args) => (
    <>
      <AmbientBackground {...args} />

      <Stack gap={2} align="center" justify="center" style={{ height: '100%' }}>
        <Surface level={3} panel p={3}>
          <Stack gap={2} align="center">
            <Text size="sm" tone="muted">
              Фон просвечивает вокруг панели
            </Text>

            <Button variant="accent" onClick={(event) => ambient.pulseFrom(event.currentTarget)}>
              Отправить волну
            </Button>
          </Stack>
        </Surface>
      </Stack>
    </>
  ),
};
