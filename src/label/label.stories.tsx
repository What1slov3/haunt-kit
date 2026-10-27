import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Input, Label, Stack } from '@haunt/ui';

const meta = {
  title: 'Поля/Label',
  component: Label,
  tags: ['autodocs'],
  args: { children: 'Название канала' },
  argTypes: { children: { control: 'text' } },
  parameters: {
    docs: {
      description: {
        component:
          'Метка контрола. Обычно её ставит `Field`; отдельно — когда раскладка своя. Клик по метке фокусирует поле по `htmlFor`.',
      },
    },
  },
} satisfies Meta<typeof Label>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Required: Story = {
  args: { required: true },
};

export const ForInput: Story = {
  render: (args) => (
    <Stack gap={1.5} style={{ maxWidth: 280 }}>
      <Label {...args} htmlFor="label-story-input" />

      <Input id="label-story-input" placeholder="general" fullWidth />
    </Stack>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByText('Название канала'));

    await expect(canvas.getByRole('textbox')).toHaveFocus();
  },
};
