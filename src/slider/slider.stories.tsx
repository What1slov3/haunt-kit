import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Field, Slider } from '@haunt/ui';

const meta = {
  title: 'Поля/Slider',
  component: Slider,
  tags: ['autodocs'],
  args: {
    defaultValue: [64],
    max: 100,
    step: 1,
    label: 'Громкость',
    onValueChange: fn(),
  },
  argTypes: {
    formatValue: { control: false },
    label: { control: 'text' },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 280, paddingTop: 24 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Ползунок на Radix: громкость, чувствительность микрофона. Одно значение или диапазон (`[20, 80]`). Клавиатура — стрелки, Home / End, PageUp / PageDown.',
      },
    },
  },
} satisfies Meta<typeof Slider>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const thumb = within(canvasElement).getByRole('slider', { name: 'Громкость' });

    await expect(thumb).toHaveAttribute('aria-valuenow', '64');

    thumb.focus();
    await userEvent.keyboard('{ArrowRight}');

    await expect(thumb).toHaveAttribute('aria-valuenow', '65');
    await expect(args.onValueChange).toHaveBeenLastCalledWith([65]);

    await userEvent.keyboard('{End}');
    await expect(thumb).toHaveAttribute('aria-valuenow', '100');
  },
};

export const WithValue: Story = {
  render: function WithValueStory(args) {
    const [volume, setVolume] = useState([64]);

    return (
      <Field label={`Громкость — ${volume[0]}%`}>
        <Slider
          {...args}
          defaultValue={undefined}
          value={volume}
          onValueChange={setVolume}
          showValue
          formatValue={(value) => `${value}%`}
        />
      </Field>
    );
  },
};

export const Range: Story = {
  args: { defaultValue: [20, 80], label: ['От', 'До'] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('slider', { name: 'От' })).toHaveAttribute('aria-valuenow', '20');
    await expect(canvas.getByRole('slider', { name: 'До' })).toHaveAttribute('aria-valuenow', '80');
  },
};

export const Stepped: Story = {
  args: { defaultValue: [50], step: 25, label: 'Качество' },
};

export const Disabled: Story = {
  args: { defaultValue: [40], disabled: true, label: 'Выключен' },
};
