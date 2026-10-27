import type { Meta, StoryObj } from '@storybook/react-vite';
import { Terminal } from 'lucide-react';
import { expect, spyOn, userEvent, waitFor, within } from 'storybook/test';

import { CodeBlock, Icon } from '@haunt/ui';

const botExample = `import { Client } from '@haunt/bot';

const client = new Client({ token: process.env.HAUNT_TOKEN });

client.on('message', async (message) => {
  if (message.content === '!ping') {
    await message.reply('pong');
  }
});

await client.connect();`;

const meta = {
  title: 'Блоки/CodeBlock',
  component: CodeBlock,
  tags: ['autodocs'],
  args: {
    code: botExample,
    title: 'bot.ts',
    language: 'ts',
  },
  argTypes: {
    title: { control: 'text' },
    icon: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 640 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Блок кода в духе Fumadocs: шапка с именем файла и копированием, моно на тихом фоне, номера строк и выделение строк полосой акцента. Подсветка синтаксиса — shiki, лениво: ядро, JS-движок регулярок и грамматика языка грузятся при первом блоке кода, до этого блок показан простым текстом той же раскладки. Цвета — из токенов темы и акцента (`--code-*`). Языки — `languages.ts`; незнакомый язык или `syntax={false}` — без подсветки.',
      },
    },
  },
} satisfies Meta<typeof CodeBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Highlighted: Story = {
  name: 'Выделенные строки и номера',
  args: { lineNumbers: true, highlight: [5, 6, 7] },
};

/** Без шапки: команда в одну строку, кнопка копирования появляется по наведению */
export const Command: Story = {
  name: 'Команда без шапки',
  args: { code: 'pnpm --filter @haunt/ui storybook', title: undefined, language: 'sh' },
};

export const WithIcon: Story = {
  name: 'Терминал',
  args: {
    title: 'Терминал',
    icon: <Icon icon={Terminal} size="sm" />,
    language: undefined,
    code: 'haunt login\nhaunt spaces create "Котики" --accent teal',
  },
};

export const Scrolls: Story = {
  name: 'Прокрутка',
  args: { maxHeight: 140, lineNumbers: true },
};

export const CopiesCode: Story = {
  name: 'Копирует код',
  args: { code: 'haunt login', title: 'Терминал' },
  play: async ({ canvasElement, args }) => {
    // Буфер обмена в headless Chromium без разрешения отказывает — подменяем запись
    const write = spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Копировать код' }));

    await expect(write).toHaveBeenCalledWith(args.code);
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Скопировано' })).toBeVisible());

    write.mockRestore();
  },
};

const rustExample = `#[derive(Debug, Clone)]
pub struct Space {
    pub id: Uuid,
    pub name: String,
}

// Пространство без каналов — всё равно пространство
impl Space {
    pub fn new(name: impl Into<String>) -> Self {
        Self { id: Uuid::now_v7(), name: name.into() }
    }
}`;

const sqlExample = `SELECT id, name
FROM spaces
WHERE owner_id = $1
ORDER BY created_at DESC;`;

const jsonExample = `{
  "name": "@haunt/ui",
  "private": true
}`;

/** Подсветка грузится лениво: сначала простой текст, затем токены с цветами из темы */
export const Syntax: Story = {
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector('figure');

    await waitFor(() => expect(root).toHaveAttribute('data-syntax', 'on'), { timeout: 8000 });

    const keyword = [...canvasElement.querySelectorAll<HTMLElement>('code span span')].find(
      (span) => span.textContent === 'import',
    );

    await expect(keyword?.style.color).toContain('--code-token-keyword');
  },
};

export const Languages: Story = {
  name: 'Языки',
  render: (args) => (
    <div style={{ display: 'grid', gap: 12 }}>
      <CodeBlock {...args} code={rustExample} title="space.rs" language="rust" />

      <CodeBlock {...args} code={sqlExample} title="spaces.sql" language="sql" />

      <CodeBlock {...args} code={jsonExample} title="package.json" language="json" />
    </div>
  ),
};

/** Незнакомый язык и `syntax={false}` — моно без подсветки, shiki не грузится */
export const NoSyntax: Story = {
  name: 'Без подсветки',
  args: { syntax: false },
  play: async ({ canvasElement }) => {
    await new Promise((resolve) => setTimeout(resolve, 300));

    await expect(canvasElement.querySelector('figure')).not.toHaveAttribute('data-syntax');
  },
};
