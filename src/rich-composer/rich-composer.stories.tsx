import { useRef, useState, type MouseEvent } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Bold, Code, Italic, Plus, Send, Smile, Strikethrough } from 'lucide-react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import {
  AttachmentCard,
  Avatar,
  composerToMarkdown,
  EmojiPickerPopover,
  Icon,
  IconButton,
  markdownToComposer,
  RichComposer,
  Text,
  Toolbar,
  type ComposerDoc,
  type ComposerSource,
  type RichComposerApi,
  type RichComposerProps,
} from '@haunt/ui';

import { screen } from '../lib/stories/play-helpers';

const members = [
  { name: 'anna', label: 'Анна Волкова', role: 'модератор' },
  { name: 'boris', label: 'Борис Ким', role: 'участник' },
  { name: 'vera', label: 'Вера Ли', role: 'участник' },
  { name: 'mods', label: 'Модераторы', role: 'роль', color: '#3ba55c' },
];

const channels = ['general', 'random', 'design', 'releases', 'voice-lounge'];

const mentionSource: ComposerSource = (query) => {
  const needle = query.toLocaleLowerCase();

  return members
    .filter(
      (member) =>
        member.name.startsWith(needle) || member.label.toLocaleLowerCase().includes(needle),
    )
    .map((member) => ({
      key: member.name,
      label: member.label,
      description: `@${member.name}`,
      icon: <Avatar name={member.label} size="xs" />,
      token: {
        type: 'mention' as const,
        kind: member.role === 'роль' ? ('role' as const) : ('user' as const),
        name: member.name,
        label: member.label,
        ...(member.color ? { color: member.color } : {}),
      },
    }));
};

/** Каналы — «с сервера»: задержка и отмена, как у настоящего запроса */
const channelSource: ComposerSource = (query, signal) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () =>
        resolve(
          channels
            .filter((name) => name.includes(query.toLocaleLowerCase()))
            .map((name) => ({
              key: name,
              label: name,
              icon: <Text tone="subtle">#</Text>,
              token: { type: 'channel' as const, name },
            })),
        ),
      150,
    );

    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });

interface Attachment {
  id: number;
  file: File;
}

/** Композер мессенджера: прикрепить слева, эмодзи и отправить справа, вложения над текстом */
function Messenger(props: RichComposerProps) {
  const [doc, setDoc] = useState<ComposerDoc>(props.defaultValue ?? []);
  const [files, setFiles] = useState<Attachment[]>([]);
  const [sent, setSent] = useState<string[]>([]);
  const nextId = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);

  const addFiles = (list: File[]) => {
    setFiles((current) => [...current, ...list.map((file) => ({ id: nextId.current++, file }))]);
    props.onFiles?.(list);
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <RichComposer
        {...props}
        value={doc}
        onValueChange={(next) => {
          setDoc(next);
          props.onValueChange?.(next);
        }}
        allowEmptySubmit={files.length > 0}
        onSubmit={(message) => {
          setSent((current) => [...current, message.text]);
          setDoc([]);
          setFiles([]);
          props.onSubmit?.(message);
        }}
        onFiles={addFiles}
        attachments={
          files.length > 0 &&
          files.map(({ id, file }) => (
            <AttachmentCard
              key={id}
              name={file.name}
              size={file.size}
              type={file.type}
              style={{ width: 240 }}
              onRemove={() => setFiles((current) => current.filter((item) => item.id !== id))}
            />
          ))
        }
        start={
          <>
            <IconButton label="Прикрепить" size="sm" onClick={() => fileInput.current?.click()}>
              <Icon icon={Plus} size="sm" />
            </IconButton>

            <input
              ref={fileInput}
              type="file"
              multiple
              hidden
              onChange={(event) => {
                addFiles(Array.from(event.target.files ?? []));
                event.target.value = '';
              }}
            />
          </>
        }
        end={(api) => (
          <>
            <EmojiPickerPopover
              onSelect={(emoji) => {
                api.insertToken({ type: 'emoji', char: emoji.char, shortcode: emoji.shortcode });
                // Поповер на закрытии вернёт фокус своему триггеру — поле забирает его после
                requestAnimationFrame(() => api.focus());
              }}
            >
              <IconButton label="Эмодзи" size="sm">
                <Icon icon={Smile} size="sm" />
              </IconButton>
            </EmojiPickerPopover>

            <IconButton
              label="Отправить"
              size="sm"
              variant={doc.length > 0 || files.length > 0 ? 'accent' : 'ghost'}
              onClick={api.submit}
            >
              <Icon icon={Send} size="sm" />
            </IconButton>
          </>
        )}
      />

      {sent.length > 0 && (
        <ol aria-label="Отправлено" style={{ margin: 0, paddingLeft: 20 }}>
          {sent.map((text, index) => (
            <li key={index}>
              <Text mono size="sm">
                {text || '(только вложения)'}
              </Text>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

const meta = {
  title: 'Поля/RichComposer',
  component: RichComposer,
  tags: ['autodocs'],
  render: (args) => <Messenger {...args} />,
  args: {
    sources: { mention: mentionSource, channel: channelSource },
    placeholder: 'Написать в #general',
    onSubmit: fn(),
    onValueChange: fn(),
    onEditLast: fn(),
    onFiles: fn(),
  },
  argTypes: {
    start: { control: false },
    end: { control: false },
    toolbar: { control: false },
    attachments: { control: false },
    sources: { control: false },
    value: { control: false },
    defaultValue: { control: false },
    apiRef: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 560, paddingTop: 240 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Поле сообщения на contenteditable с управляемой моделью: документ — массив сегментов (текст, упоминание, канал, эмодзи), DOM рисует компонент. `@` — участники, `#` — каналы, `:` — эмодзи (встроенный набор лениво); источники — функции с `AbortSignal`. Упоминание — атомарный токен: Backspace стирает его целиком, стрелка проходит за один шаг. Enter — отправить, Shift+Enter — строка, ↑ в пустом поле — `onEditLast`, Ctrl+Z / Ctrl+Shift+Z — своя история (набор сливается по словам). Вставка — только текст без HTML, файлы — в `onFiles`. Черновик ⇄ текст сообщения — `composerToMarkdown` / `markdownToComposer` (`@ник`, `#канал`). Рамка — `FieldFrame glow`, счётчик с 80 % лимита.',
      },
    },
  },
} satisfies Meta<typeof RichComposer>;

export default meta;

type Story = StoryObj<typeof meta>;

const editor = (canvas: HTMLElement) => within(canvas).getByRole('textbox', { name: 'Сообщение' });

export const Default: Story = {};

export const WithDraft: Story = {
  name: 'Черновик из текста',
  args: {
    defaultValue: markdownToComposer('привет @anna, глянь #design :smile:', {
      emoji: { smile: '😄' },
      resolve: (kind, name) =>
        kind === 'user' ? { label: members.find((member) => member.name === name)?.label } : {},
    }),
  },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: markdownToComposer('только чтение') },
  play: async ({ canvasElement }) => {
    await expect(editor(canvasElement)).toHaveAttribute('aria-disabled', 'true');
    await expect(editor(canvasElement)).toHaveAttribute('contenteditable', 'false');
  },
};

export const Limit: Story = {
  name: 'Лимит символов',
  args: {
    maxLength: 40,
    defaultValue: markdownToComposer('Это сообщение уже почти упёрлось в лимит длины, да'),
  },
  play: async ({ args, canvasElement }) => {
    const field = editor(canvasElement);

    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(within(canvasElement).getByText(/^-\d+$/)).toBeInTheDocument();

    await userEvent.click(field);
    await userEvent.keyboard('{Enter}');

    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

/** Тулбар разметки: кнопки не забирают фокус (`mousedown` погашен) и оборачивают выделение маркерами */
function WithToolbarDemo(props: RichComposerProps) {
  const [doc, setDoc] = useState<ComposerDoc>(markdownToComposer('выделите слово и нажмите B'));
  const keep = (event: MouseEvent) => event.preventDefault();
  const format = (api: RichComposerApi, marker: string) => () => api.wrapSelection(marker);

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <RichComposer
        {...props}
        value={doc}
        onValueChange={setDoc}
        toolbar={(api) => (
          <Toolbar.Root size="sm" aria-label="Разметка">
            <Toolbar.Button label="Жирный" onMouseDown={keep} onClick={format(api, '**')}>
              <Icon icon={Bold} size="sm" />
            </Toolbar.Button>

            <Toolbar.Button label="Курсив" onMouseDown={keep} onClick={format(api, '_')}>
              <Icon icon={Italic} size="sm" />
            </Toolbar.Button>

            <Toolbar.Button label="Зачёркнутый" onMouseDown={keep} onClick={format(api, '~~')}>
              <Icon icon={Strikethrough} size="sm" />
            </Toolbar.Button>

            <Toolbar.Button label="Код" onMouseDown={keep} onClick={format(api, '`')}>
              <Icon icon={Code} size="sm" />
            </Toolbar.Button>
          </Toolbar.Root>
        )}
      />

      <Text mono size="sm" tone="muted" data-testid="markdown">
        {composerToMarkdown(doc)}
      </Text>
    </div>
  );
}

export const WithToolbar: Story = {
  name: 'Тулбар разметки',
  render: (args) => <WithToolbarDemo {...args} />,
  play: async ({ canvasElement }) => {
    const field = editor(canvasElement);
    const output = within(canvasElement).getByTestId('markdown');

    await userEvent.click(field);
    await userEvent.keyboard('{Control>}a{/Control}');
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Жирный' }));

    await expect(output).toHaveTextContent('**выделите слово и нажмите B**');
  },
};

export const TypeAndSend: Story = {
  name: 'Набор, Shift+Enter и отправка',
  play: async ({ args, canvasElement }) => {
    const field = editor(canvasElement);

    await userEvent.click(field);
    await userEvent.keyboard('привет{Shift>}{Enter}{/Shift}мир');

    await expect(field.textContent).toBe('привет\nмир');

    await userEvent.keyboard('{Enter}');

    await expect(args.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'привет\nмир' }),
    );
    await waitFor(() => expect(field).toHaveTextContent(''));
  },
};

export const MentionAutocomplete: Story = {
  name: 'Упоминание: подсказка, токен, Backspace',
  play: async ({ args, canvasElement }) => {
    const field = editor(canvasElement);

    await userEvent.click(field);
    await userEvent.keyboard('спроси @в');

    const list = await screen().findByRole('listbox', { name: 'Участники' });

    await expect(within(list).getAllByRole('option')).toHaveLength(2);
    await expect(field).toHaveAttribute('aria-activedescendant');

    await userEvent.keyboard('{ArrowDown}{Enter}');

    await waitFor(() => expect(screen().queryByRole('listbox')).toBeNull());
    await expect(field).toHaveTextContent('спроси @Вера Ли');

    const lastDoc = () =>
      (args.onValueChange as ReturnType<typeof fn>).mock.lastCall?.[0] as ComposerDoc;

    await expect(composerToMarkdown(lastDoc())).toBe('спроси @vera ');

    // Пробел за токеном, затем токен целиком
    await userEvent.keyboard('{Backspace}{Backspace}');

    await expect(composerToMarkdown(lastDoc())).toBe('спроси ');
  },
};

export const ChannelAutocomplete: Story = {
  name: 'Канал: асинхронный источник, Tab вставляет',
  play: async ({ args, canvasElement }) => {
    const field = editor(canvasElement);

    await userEvent.click(field);
    await userEvent.keyboard('#des');

    const list = await screen().findByRole('listbox', { name: 'Каналы' });

    await waitFor(() => expect(within(list).getAllByRole('option')).toHaveLength(1));
    await userEvent.keyboard('{Tab}');

    await expect(field).toHaveFocus();
    await expect(
      composerToMarkdown(
        (args.onValueChange as ReturnType<typeof fn>).mock.lastCall?.[0] as ComposerDoc,
      ),
    ).toBe('#design ');
  },
};

export const EmojiAutocomplete: Story = {
  name: 'Эмодзи по двоеточию, Esc закрывает',
  play: async ({ canvasElement }) => {
    const field = editor(canvasElement);

    await userEvent.click(field);
    await userEvent.keyboard(':smi');

    const list = await screen().findByRole('listbox', { name: 'Эмодзи' }, { timeout: 3000 });

    await waitFor(() => expect(within(list).getAllByRole('option').length).toBeGreaterThan(0));
    await userEvent.keyboard('{Escape}');

    await waitFor(() => expect(screen().queryByRole('listbox')).toBeNull());
    await expect(field).toHaveTextContent(':smi');
  },
};

export const UndoRedo: Story = {
  name: 'Ctrl+Z и Ctrl+Shift+Z',
  play: async ({ canvasElement }) => {
    const field = editor(canvasElement);

    await userEvent.click(field);
    await userEvent.keyboard('раз два');
    await userEvent.keyboard('{Control>}z{/Control}');

    await expect(field).toHaveTextContent('раз');

    await userEvent.keyboard('{Control>}z{/Control}');

    await expect(field.textContent).toBe('');

    await userEvent.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');

    await expect(field).toHaveTextContent('раз');
  },
};

export const EditLast: Story = {
  name: '↑ в пустом поле — правка последнего',
  play: async ({ args, canvasElement }) => {
    await userEvent.click(editor(canvasElement));
    await userEvent.keyboard('{ArrowUp}');

    await expect(args.onEditLast).toHaveBeenCalledOnce();
  },
};

export const PastePlainText: Story = {
  name: 'Вставка: только текст, файлы — в onFiles',
  play: async ({ args, canvasElement }) => {
    const field = editor(canvasElement);
    const html = new DataTransfer();

    await userEvent.click(field);

    html.setData('text/html', '<b style="color:red">жирный</b> <script>x</script>');
    html.setData('text/plain', 'жирный');
    field.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: html, bubbles: true, cancelable: true }),
    );

    await expect(field.innerHTML).not.toContain('<b');
    await expect(field).toHaveTextContent('жирный');

    const files = new DataTransfer();

    files.items.add(new File(['x'], 'скриншот.png', { type: 'image/png' }));
    field.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: files, bubbles: true, cancelable: true }),
    );

    await expect(args.onFiles).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'скриншот.png' }),
    ]);
    await expect(
      await within(canvasElement).findByText('скриншот.png', { exact: false }),
    ).toBeInTheDocument();
  },
};

export const Composition: Story = {
  name: 'Набор через IME',
  play: async ({ args, canvasElement }) => {
    const field = editor(canvasElement);

    await userEvent.click(field);
    await userEvent.keyboard('a');

    // Браузер сам пишет промежуточный текст композиции в DOM — здесь это делает тест
    field.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    field.append(document.createTextNode('にほ'));
    field.dispatchEvent(new CompositionEvent('compositionend', { data: '日本', bubbles: true }));

    await waitFor(() => expect(field).toHaveTextContent('a日本'));
    await expect(
      composerToMarkdown(
        (args.onValueChange as ReturnType<typeof fn>).mock.lastCall?.[0] as ComposerDoc,
      ),
    ).toBe('a日本');
  },
};
