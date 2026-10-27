import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import {
  Checkbox,
  Field,
  Input,
  RadioGroup,
  Stack,
  Text,
  Wizard,
  type WizardProps,
  type WizardStep,
} from '@haunt/ui';

const templates = [
  { value: 'friends', label: 'Друзья', description: 'Общий чат, голосовой, мемы' },
  { value: 'gaming', label: 'Игровой клан', description: 'Лобби, рейды, стримы' },
  { value: 'study', label: 'Учёба', description: 'Объявления, вопросы, материалы' },
];

const channelsByTemplate: Record<string, string[]> = {
  friends: ['general', 'voice', 'memes'],
  gaming: ['lobby', 'raids', 'streams', 'voice'],
  study: ['announcements', 'questions', 'materials'],
};

/** Имя «проверяется на сервере»: занятое — ошибка шага */
const checkName = (name: string) =>
  new Promise<string | true>((resolve) =>
    setTimeout(
      () => resolve(name.trim().toLowerCase() === 'haunt' ? 'Имя «haunt» уже занято' : true),
      300,
    ),
  );

/** Создание пространства из шаблона: шаблон → имя → каналы → проверка */
function CreateSpace(props: Partial<WizardProps>) {
  const [template, setTemplate] = useState('');
  const [name, setName] = useState('');
  const [channels, setChannels] = useState<string[]>([]);
  const [created, setCreated] = useState(false);

  const steps: WizardStep[] = [
    {
      id: 'template',
      title: 'Шаблон',
      description: 'С чего начать — каналы и роли можно поменять потом.',
      validate: () => (template ? true : 'Выберите шаблон'),
      content: (
        <RadioGroup.Root
          value={template}
          onValueChange={(value) => {
            setTemplate(value);
            setChannels(channelsByTemplate[value] ?? []);
          }}
          aria-label="Шаблон"
        >
          {templates.map((item) => (
            <RadioGroup.Item
              key={item.value}
              value={item.value}
              label={item.label}
              description={item.description}
            />
          ))}
        </RadioGroup.Root>
      ),
    },
    {
      id: 'name',
      title: 'Название',
      description: 'Его увидят в приглашении и в рейле пространств.',
      validate: () => (name.trim() ? checkName(name) : 'Введите название'),
      content: (
        <Field label="Название пространства" hint="От 2 до 40 символов">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={40}
            fullWidth
          />
        </Field>
      ),
    },
    {
      id: 'channels',
      title: 'Каналы',
      validate: () => channels.length > 0,
      content: (
        <Stack gap={2}>
          {(channelsByTemplate[template] ?? []).map((channel) => (
            <Checkbox
              key={channel}
              label={`#${channel}`}
              checked={channels.includes(channel)}
              onCheckedChange={(checked) =>
                setChannels((current) =>
                  checked ? [...current, channel] : current.filter((item) => item !== channel),
                )
              }
            />
          ))}
        </Stack>
      ),
    },
    {
      id: 'review',
      title: 'Проверка',
      content: (
        <Stack gap={1}>
          <Text>
            «{name}» из шаблона «{templates.find((item) => item.value === template)?.label}»
          </Text>

          <Text tone="muted" size="sm">
            Каналы: {channels.map((channel) => `#${channel}`).join(', ')}
          </Text>

          {created && <Text tone="success">Пространство создано</Text>}
        </Stack>
      ),
    },
  ];

  return (
    <Wizard
      {...props}
      steps={steps}
      finishLabel="Создать"
      onFinish={async () => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        setCreated(true);
        await props.onFinish?.();
      }}
    />
  );
}

const meta = {
  title: 'Блоки/Wizard',
  component: Wizard,
  tags: ['autodocs'],
  render: (args) => <CreateSpace {...args} />,
  args: { steps: [], onFinish: fn(), onStepChange: fn() },
  argTypes: { steps: { control: false } },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 720 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Многошаговая форма на `Steps`: шаги данными, «Назад / Далее / Готово», проверка шага перед переходом (`validate` — true, false, текст ошибки или промис), пройденные шаги в списке — кнопки назад. Шаг — форма: Enter в поле ведёт дальше. `storageKey` помнит текущий шаг в localStorage. Фокус при смене шага — на заголовок. В узком контейнере список прячется, вместо него полоса прогресса. Пример — создание пространства из шаблона.',
      },
    },
  },
} satisfies Meta<typeof Wizard>;

export default meta;

type Story = StoryObj<typeof meta>;

const canvasOf = (element: HTMLElement) => within(element);

export const CreateFromTemplate: Story = {
  name: 'Пространство из шаблона',
};

export const Narrow: Story = {
  name: 'Узкий контейнер',
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420 }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    await expect(canvasOf(canvasElement).getByRole('progressbar')).toBeVisible();
    // Список шагов спрятан — для скринридера его тоже нет, шаг читается по счётчику
    await expect(canvasOf(canvasElement).queryByRole('navigation', { name: 'Шаги' })).toBeNull();
  },
};

export const Flow: Story = {
  name: 'Проверка шагов и завершение',
  play: async ({ args, canvasElement }) => {
    const canvas = canvasOf(canvasElement);
    const next = () => canvas.getByRole('button', { name: /Далее|Создать/ });

    await userEvent.click(next());

    await expect(canvas.getByRole('alert')).toHaveTextContent('Выберите шаблон');

    await userEvent.click(canvas.getByRole('radio', { name: /Игровой клан/ }));
    await userEvent.click(next());

    await expect(canvas.getByRole('heading', { name: 'Название' })).toHaveFocus();
    await expect(args.onStepChange).toHaveBeenLastCalledWith(1);

    // Асинхронная проверка имени: Enter в поле — «Далее», занятое имя — ошибка
    await userEvent.type(
      canvas.getByRole('textbox', { name: 'Название пространства' }),
      'haunt{Enter}',
    );

    await expect(await canvas.findByRole('alert')).toHaveTextContent('Имя «haunt» уже занято');

    await userEvent.clear(canvas.getByRole('textbox', { name: 'Название пространства' }));
    await userEvent.type(
      canvas.getByRole('textbox', { name: 'Название пространства' }),
      'Рейд-клуб{Enter}',
    );

    await waitFor(() => expect(canvas.getByRole('heading', { name: 'Каналы' })).toHaveFocus());

    // Назад кликом по пройденному шагу и обратно
    await userEvent.click(canvas.getByRole('button', { name: 'Шаблон' }));

    await expect(canvas.getByRole('heading', { name: 'Шаблон' })).toBeInTheDocument();

    await userEvent.click(next());
    await waitFor(() =>
      expect(canvas.getByRole('heading', { name: 'Название' })).toBeInTheDocument(),
    );
    await userEvent.click(next());
    await waitFor(() =>
      expect(canvas.getByRole('heading', { name: 'Каналы' })).toBeInTheDocument(),
    );
    await userEvent.click(next());

    await expect(canvas.getByRole('heading', { name: 'Проверка' })).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: 'Создать' }));

    await expect(await canvas.findByText('Пространство создано')).toBeInTheDocument();
    await expect(args.onFinish).toHaveBeenCalledOnce();
  },
};

export const RemembersStep: Story = {
  name: 'Помнит шаг (storageKey)',
  args: { storageKey: 'haunt-story-wizard' },
  beforeEach: () => {
    localStorage.setItem('haunt-story-wizard', '2');

    return () => localStorage.removeItem('haunt-story-wizard');
  },
  play: async ({ canvasElement }) => {
    await expect(
      canvasOf(canvasElement).getByRole('heading', { name: 'Каналы' }),
    ).toBeInTheDocument();
    await expect(canvasOf(canvasElement).getByText('Шаг 3 из 4')).toBeInTheDocument();
  },
};
