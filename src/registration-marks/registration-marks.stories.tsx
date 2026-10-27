import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Heading, RegistrationMarks, Stack, Text } from '@haunt/ui';

const meta = {
  title: 'Сигнал/RegistrationMarks',
  component: RegistrationMarks,
  tags: ['autodocs'],
  args: {
    variant: 'full',
    tone: 'default',
    children: (
      <Stack gap={1}>
        <Heading level={3}>Лист 01</Heading>
        <Text tone="muted">Разметка лежит в полях и не перекрывает содержимое.</Text>
      </Stack>
    ),
  },
  argTypes: { children: { control: false } },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 360 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Типографская разметка вокруг блока, как у листа перед печатью: метки обреза продолжают кромки наружу с зазором, кресты совмещения по сторонам, шкала цвета из палитры темы (акцент, второй акцент, статусы, чернила).',
      },
    },
  },
} satisfies Meta<typeof RegistrationMarks>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Crop: Story = {
  args: { variant: 'crop' },
};

export const Target: Story = {
  args: { variant: 'target' },
};

export const Accent: Story = {
  args: { tone: 'accent' },
};

export const MarksAreDecorative: Story = {
  name: 'Разметка скрыта от чтения с экрана',
  play: async ({ canvasElement }) => {
    const root = within(canvasElement).getByText('Лист 01').closest('div')
      ?.parentElement as HTMLElement;
    const decorative = root.querySelectorAll(':scope > [aria-hidden]');

    // 4 метки обреза, 2 креста, шкала цвета
    await expect(decorative).toHaveLength(7);
  },
};
