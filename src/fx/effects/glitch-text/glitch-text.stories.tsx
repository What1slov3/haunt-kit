import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Button, Heading, Stack } from '@haunt/ui';
import { GlitchText } from '@haunt/ui/fx';

const meta = {
  title: 'Эффекты/GlitchText',
  component: GlitchText,
  tags: ['autodocs'],
  args: { text: 'СИГНАЛ ПОТЕРЯН', trigger: 'both', intensity: 2, duration: 420 },
  argTypes: {
    trigger: { control: 'inline-radio', options: ['hover', 'change', 'both'] },
    intensity: { control: { type: 'range', min: 1, max: 6, step: 0.5 } },
    duration: { control: { type: 'range', min: 150, max: 1200, step: 50 } },
  },
  render: (args) => (
    <Heading level={2}>
      <GlitchText {...args} />
    </Heading>
  ),
  parameters: {
    docs: {
      description: {
        component:
          'Сбой сигнала из `@haunt/ui/fx`: короткая вспышка RGB-сдвига (красная и бирюзовая копии строки за текстом, `--danger` / `--info`) и дрожь части символов ступенями — на наведении (`hover`), при смене текста (`change`) или в обоих случаях. Только transform и opacity. Скринридер читает настоящий текст, вспышка скрыта. «Эффекты: без» и reduced-motion — просто текст.',
      },
    },
  },
} satisfies Meta<typeof GlitchText>;

export default meta;

type Story = StoryObj<typeof meta>;

const glyphs = (canvasElement: HTMLElement) =>
  canvasElement.querySelector('[data-text]') as HTMLElement;

export const OnHover: Story = {
  name: 'Сбой на наведении',
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    // Доступное имя — настоящий текст, без копий каналов
    await expect(canvas.getByRole('heading', { name: args.text })).toBeInTheDocument();
    await expect(glyphs(canvasElement)).not.toHaveAttribute('data-glitching');
    await userEvent.hover(glyphs(canvasElement));
    await waitFor(() => expect(glyphs(canvasElement)).toHaveAttribute('data-glitching'));
    await waitFor(() => expect(glyphs(canvasElement)).not.toHaveAttribute('data-glitching'), {
      timeout: 2000,
    });
    await expect(glyphs(canvasElement)).toHaveTextContent(args.text);
  },
};

const statuses = ['ПОДКЛЮЧЕНИЕ', 'В ЭФИРЕ', 'СИГНАЛ ПОТЕРЯН'];

function ChangingStatus(props: Story['args']) {
  const [index, setIndex] = useState(0);

  return (
    <Stack gap={2} align="start">
      <Button size="sm" onClick={() => setIndex((current) => (current + 1) % statuses.length)}>
        Сменить статус
      </Button>

      <Heading level={3}>
        <GlitchText {...props} text={statuses[index] ?? ''} />
      </Heading>
    </Stack>
  );
}

export const OnChange: Story = {
  name: 'Сбой при смене текста',
  args: { trigger: 'change' },
  render: (args) => <ChangingStatus {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Сменить статус' }));
    await waitFor(() => expect(glyphs(canvasElement)).toHaveAttribute('data-glitching'));
    await expect(canvas.getByRole('heading', { name: 'В ЭФИРЕ' })).toBeInTheDocument();
  },
};

export const Strong: Story = {
  name: 'Сильный сбой',
  args: { intensity: 5, duration: 800, text: 'ДОСТУП ЗАПРЕЩЁН' },
};

export const EffectsOff: Story = {
  name: 'Эффекты выключены — просто текст',
  globals: { effects: 'off' },
  play: async ({ args, canvasElement }) => {
    await userEvent.hover(glyphs(canvasElement));
    await expect(glyphs(canvasElement)).not.toHaveAttribute('data-glitching');
    await expect(glyphs(canvasElement)).toHaveTextContent(args.text);
    await expect(
      within(canvasElement).getByRole('heading', { name: args.text }),
    ).toBeInTheDocument();
  },
};
