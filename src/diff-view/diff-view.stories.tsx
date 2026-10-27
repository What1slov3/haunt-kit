import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { DiffView } from '@haunt/ui';

const rulesBefore = `# Правила пространства

1. Уважайте участников.
2. Без спама и рекламы.
3. Спойлеры — только под тегом.
4. Голосовые каналы — без музыки на фоне.
5. Ники — читаемые, без символов-заглушек.
6. Боты — только в #bots.
7. Мемы — в #memes.
8. Жалобы — модераторам в личку.
9. Споры — без перехода на личности.
10. Новичкам помогаем, а не высмеиваем.
11. Правила могут меняться — следите за #news.
`;

const rulesAfter = rulesBefore
  .replace('2. Без спама и рекламы.', '2. Без спама, рекламы и реферальных ссылок.')
  .replace('6. Боты — только в #bots.\n', '')
  .replace(
    '11. Правила могут меняться — следите за #news.',
    '11. Правила могут меняться — следите за #announcements.\n12. Модераторы решают спорные случаи.',
  );

const codeBefore = `export function greet(name: string) {
  return 'Привет, ' + name;
}
`;

const codeAfter = `export function greet(name: string, excited = false) {
  return \`Привет, \${name}\${excited ? '!' : ''}\`;
}
`;

const meta = {
  title: 'Данные/DiffView',
  component: DiffView,
  tags: ['autodocs'],
  args: { oldText: rulesBefore, newText: rulesAfter, mode: 'unified', context: 2 },
  argTypes: { mode: { control: 'inline-radio', options: ['unified', 'split', 'words'] } },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 760 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Разница двух текстов — свой Майерс (`diff.ts`, без зависимостей). `unified` — строки подряд с двумя колонками номеров, `split` — было / стало рядом (замена в одной горизонтали), `words` — текст с правками по словам для истории правки сообщения. Изменённые слова внутри пары строк подсвечены плотнее; длинные неизменённые участки свёрнуты («Показать N неизменённых строк»). `language` — подсветка синтаксиса shiki, лениво, цвета — общие `--code-*`.',
      },
    },
  },
} satisfies Meta<typeof DiffView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Unified: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('+3')).toBeInTheDocument();
    await expect(canvas.getByText('−3')).toBeInTheDocument();
    await expect(
      [...canvasElement.querySelectorAll('ins')].some((ins) =>
        /реферальных/.test(ins.textContent ?? ''),
      ),
    ).toBe(true);
  },
};

export const Split: Story = {
  args: { mode: 'split' },
};

export const ExpandFold: Story = {
  name: 'Раскрыть неизменённое',
  args: { context: 0 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const fold = canvas.getAllByRole('button', { name: /Показать \d+ неизменённ/ })[1]!;

    await expect(canvas.queryByText('5. Ники — читаемые, без символов-заглушек.')).toBeNull();
    await userEvent.click(fold);
    await waitFor(() =>
      expect(canvas.getByText('5. Ники — читаемые, без символов-заглушек.')).toBeInTheDocument(),
    );
  },
};

export const Words: Story = {
  name: 'По словам — правка сообщения',
  args: {
    mode: 'words',
    oldText: 'Встречаемся в пятницу в 20:00 в голосовом канале raid.',
    newText: 'Встречаемся в субботу в 21:00 в голосовом канале raid, не опаздывайте!',
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('del')?.textContent).toMatch(/пятницу/);
  },
};

export const Code: Story = {
  name: 'Код с подсветкой',
  args: {
    oldText: codeBefore,
    newText: codeAfter,
    language: 'ts',
    mode: 'split',
    oldLabel: 'greet.ts',
    newLabel: 'greet.ts',
  },
};

export const NoChanges: Story = {
  name: 'Без изменений',
  args: { oldText: 'одно и то же', newText: 'одно и то же' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Изменений нет')).toBeInTheDocument();
  },
};
