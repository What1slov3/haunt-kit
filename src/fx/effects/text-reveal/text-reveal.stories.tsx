import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { TextReveal } from '@haunt/ui/fx';

const paragraph =
  'Пространство — это несколько каналов, люди и их голоса. Здесь можно говорить вслух, писать длинно и оставлять следы, которые не исчезнут через сутки.';

const meta = {
  title: 'Эффекты/TextReveal',
  component: TextReveal,
  tags: ['autodocs'],
  args: { text: paragraph, by: 'line', trigger: 'mount', duration: 520, as: 'p' },
  argTypes: {
    by: { control: 'inline-radio', options: ['line', 'word', 'char'] },
    trigger: { control: 'inline-radio', options: ['view', 'mount'] },
    as: { control: 'select', options: ['span', 'p', 'div', 'h1', 'h2', 'h3', 'h4'] },
  },
  decorators: [
    (Story) => (
      <div
        style={{ maxWidth: 420, fontSize: 'var(--text-xl)', lineHeight: 'var(--leading-relaxed)' }}
      >
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Появление текста каскадом из `@haunt/ui/fx`: строками (по настоящим переносам — позиции слов меряются после раскладки и при смене ширины), словами или символами. По умолчанию — когда текст попадает в окно (`trigger="view"`). Только opacity, transform и filter. Скринридер читает текст целиком, разбивка скрыта. «Эффекты: без» и reduced-motion — текст сразу на месте.',
      },
    },
  },
} satisfies Meta<typeof TextReveal>;

export default meta;

type Story = StoryObj<typeof meta>;

const root = (canvasElement: HTMLElement) =>
  canvasElement.querySelector('[data-revealed], [data-static], p, h2') as HTMLElement;

export const ByLine: Story = {
  name: 'Строками',
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(root(canvasElement)).toHaveAttribute('data-revealed'));

    // Слова одной строки получили один номер, следующая строка — следующий
    const indexes = [...canvasElement.querySelectorAll<HTMLElement>('[data-word]')].map((word) =>
      Number(word.style.getPropertyValue('--i')),
    );

    await expect(indexes[0]).toBe(0);
    await expect(Math.max(...indexes)).toBeGreaterThan(1);
  },
};

export const ByWord: Story = { name: 'Словами', args: { by: 'word' } };

export const ByChar: Story = {
  name: 'Символами — в заголовке',
  args: { by: 'char', text: 'Голос пространства', as: 'h2' },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('heading', { name: 'Голос пространства' }),
    ).toBeInTheDocument();
  },
};

export const OnScroll: Story = {
  name: 'При прокрутке',
  args: { trigger: 'view' },
  render: (args) => (
    <div style={{ height: 240, overflow: 'auto', border: '1px solid var(--border)' }}>
      <div style={{ height: 320, color: 'var(--text-muted)' }}>Прокрутите вниз ↓</div>
      <TextReveal {...args} />
    </div>
  ),
};

export const EffectsOff: Story = {
  name: 'Эффекты выключены — сразу на месте',
  globals: { effects: 'off' },
  play: async ({ canvasElement }) => {
    const element = canvasElement.querySelector('p') as HTMLElement;
    const firstWord = element.querySelector('[data-word]') as HTMLElement;

    await expect(element).toHaveAttribute('data-static');
    await expect(getComputedStyle(firstWord).opacity).toBe('1');
  },
};
