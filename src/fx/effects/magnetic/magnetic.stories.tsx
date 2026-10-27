import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { Button, Inline } from '@haunt/ui';
import { Magnetic } from '@haunt/ui/fx';

import { movePointer } from '../story-pointer';

const meta = {
  title: 'Эффекты/Magnetic',
  component: Magnetic,
  tags: ['autodocs'],
  args: { strength: 0.3, max: 6, reach: 16 },
  argTypes: {
    strength: { control: { type: 'range', min: 0.1, max: 1, step: 0.05 } },
    max: { control: { type: 'range', min: 2, max: 20, step: 1 } },
    reach: { control: { type: 'range', min: 0, max: 60, step: 2 } },
  },
  render: (args) => (
    <Inline gap={4} style={{ padding: 32 }}>
      <Magnetic {...args}>
        <Button variant="accent">Войти в голос</Button>
      </Magnetic>
    </Inline>
  ),
  parameters: {
    docs: {
      description: {
        component:
          'Обёртка из `@haunt/ui/fx`, которая слегка тянет кнопку к курсору — в меру: доля пути `strength`, не дальше `max`, притяжение начинается за `reach` px от края. Один слушатель `pointermove` на окно для всех магнитов, сдвиг — только transform содержимого, обёртка стоит. На тач и при «эффекты: без» / reduced-motion — не двигается.',
      },
    },
  },
} satisfies Meta<typeof Magnetic>;

export default meta;

type Story = StoryObj<typeof meta>;

const content = (canvasElement: HTMLElement) =>
  within(canvasElement).getByRole('button', { name: 'Войти в голос' }).parentElement!;

export const Default: Story = {
  name: 'Тянется к курсору',
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Войти в голос' });
    const rect = button.getBoundingClientRect();

    movePointer(button, rect.right + 8, rect.top + rect.height / 2);
    await waitFor(() => expect(content(canvasElement).style.transform).toContain('translate('));

    // Курсор справа — кнопка сдвинулась вправо, но не дальше max
    const shift = Number.parseFloat(
      content(canvasElement).style.transform.slice('translate('.length),
    );

    await expect(shift).toBeGreaterThan(0);
    await expect(shift).toBeLessThanOrEqual(6);

    movePointer(document.body, rect.right + 400, rect.top);
    await waitFor(() => expect(content(canvasElement).style.transform).toBe(''));
  },
};

export const Strong: Story = { name: 'Сильнее', args: { strength: 0.5, max: 12, reach: 32 } };

export const EffectsOff: Story = {
  name: 'Эффекты выключены — стоит',
  globals: { effects: 'off' },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Войти в голос' });
    const rect = button.getBoundingClientRect();

    movePointer(button, rect.right - 2, rect.top + 2);
    await new Promise((resolve) => setTimeout(resolve, 50));
    await expect(content(canvasElement).style.transform).toBe('');
  },
};
