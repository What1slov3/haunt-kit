import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor } from 'storybook/test';

import { Button, Heading, ScrambleText, Stack } from '@haunt/ui';

const meta = {
  title: 'Текст/ScrambleText',
  component: ScrambleText,
  tags: ['autodocs'],
  args: { text: 'Добро пожаловать в Haunt', trigger: 'mount', duration: 700 },
  argTypes: {
    trigger: { control: 'inline-radio', options: ['mount', 'hover', 'both'] },
    duration: { control: { type: 'range', min: 200, max: 3000, step: 100 } },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Текст «расшифровывается» из случайных моно-символов при появлении (`mount`, и при смене текста), при наведении (`hover`) или в обоих случаях. Символы меняются ступенями по 40 мс, пробелы не шумят. При «эффекты: без» и `prefers-reduced-motion` — сразу итог. Скринридер читает настоящий текст (скрытая копия), шум скрыт. Всегда моно: строка не прыгает по ширине.',
      },
    },
  },
} satisfies Meta<typeof ScrambleText>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Видимые символы (шум или итог), без скрытой копии для скринридера */
function glyphs(canvasElement: HTMLElement): HTMLElement {
  return canvasElement.querySelector('[aria-hidden="true"]') as HTMLElement;
}

export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    // Скринридер всё время видит итог, а не шум
    await expect(canvasElement).toHaveTextContent(args.text);
    await waitFor(() => expect(glyphs(canvasElement)).toHaveTextContent(args.text), {
      timeout: 2000,
    });
    await expect(glyphs(canvasElement)).not.toHaveAttribute('data-scrambling');
  },
};

export const AsHeading: Story = {
  name: 'В заголовке',
  render: (args) => (
    <Heading level={2} marker>
      <ScrambleText {...args} text="настройки пространства" />
    </Heading>
  ),
};

export const OnHover: Story = {
  name: 'По наведению',
  args: { trigger: 'hover', text: '#общий-голос' },
  play: async ({ canvasElement }) => {
    const target = glyphs(canvasElement);

    await expect(target).not.toHaveAttribute('data-scrambling');
    await userEvent.hover(target);
    await waitFor(() => expect(target).toHaveAttribute('data-scrambling'));
    await waitFor(() => expect(target).not.toHaveAttribute('data-scrambling'), { timeout: 2000 });
    await expect(target).toHaveTextContent('#общий-голос');
  },
};

export const EffectsOff: Story = {
  name: 'Эффекты выключены — сразу итог',
  decorators: [
    (Story) => (
      <div data-effects="off">
        <Story />
      </div>
    ),
  ],
  play: async ({ args, canvasElement }) => {
    await expect(glyphs(canvasElement)).not.toHaveAttribute('data-scrambling');
    await expect(glyphs(canvasElement)).toHaveTextContent(args.text);
  },
};

const sections = ['журнал аудита', 'роли и права', 'участники'];

function ChangingTitle(props: Story['args']) {
  const [index, setIndex] = useState(0);

  return (
    <Stack gap={2} align="start">
      <Button size="sm" onClick={() => setIndex((current) => (current + 1) % sections.length)}>
        Следующий раздел
      </Button>

      <Heading level={3}>
        <ScrambleText {...props} text={sections[index] ?? ''} />
      </Heading>
    </Stack>
  );
}

export const ChangingText: Story = {
  name: 'Смена текста',
  render: (args) => <ChangingTitle {...args} />,
};
