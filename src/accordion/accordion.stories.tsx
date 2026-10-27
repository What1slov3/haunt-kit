import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Accordion } from '@haunt/ui';

import { expectGone, expectVisible } from '../lib/stories/play-helpers';

interface FaqProps {
  /** single — открыта одна секция, multiple — сколько угодно */
  type: 'single' | 'multiple';
  /** Можно закрыть последнюю открытую секцию (только для single) */
  collapsible?: boolean;
}

const items = [
  {
    value: 'a',
    title: 'Что такое пространство?',
    body: 'Сообщество со своими каналами, ролями и акцентом.',
  },
  { value: 'b', title: 'Как пригласить друга?', body: 'Ссылкой из меню пространства.' },
  {
    value: 'c',
    title: 'Можно ли перенести историю сообщений из другого мессенджера в новое пространство?',
    body: 'Пока нет: импорт появится вместе с публичным API. Длинный заголовок переносится, шеврон остаётся справа.',
  },
];

/** FAQ — три секции, третья с длинным заголовком */
function Faq({ type, collapsible }: FaqProps) {
  const children = items.map((item) => (
    <Accordion.Item key={item.value} value={item.value}>
      <Accordion.Trigger>{item.title}</Accordion.Trigger>
      <Accordion.Content>{item.body}</Accordion.Content>
    </Accordion.Item>
  ));

  return type === 'single' ? (
    <Accordion.Root type="single" collapsible={collapsible} defaultValue="a">
      {children}
    </Accordion.Root>
  ) : (
    <Accordion.Root type="multiple" defaultValue={['a', 'b']}>
      {children}
    </Accordion.Root>
  );
}

const meta = {
  title: 'Списки/Accordion',
  component: Faq,
  subcomponents: {
    'Accordion.Trigger': Accordion.Trigger,
    'Accordion.Content': Accordion.Content,
  },
  tags: ['autodocs'],
  args: { type: 'single', collapsible: true },
  argTypes: {
    type: { control: 'inline-radio', options: ['single', 'multiple'] },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 360 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Аккордеон — секции настроек, FAQ. Триггер обёрнут в заголовок `h3`, как требует разметка аккордеона; высота анимируется по `--radix-accordion-content-height`.',
      },
    },
  },
} satisfies Meta<typeof Faq>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Single: Story = {};

export const Multiple: Story = {
  args: { type: 'multiple' },
};

export const SwitchesPanels: Story = {
  name: 'Переключает панели',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const first = canvas.getByRole('button', { name: 'Что такое пространство?' });
    const second = canvas.getByRole('button', { name: 'Как пригласить друга?' });
    const firstBody = () => canvas.queryByText('Сообщество со своими каналами, ролями и акцентом.');

    await expectVisible(firstBody()!);

    await userEvent.click(second);

    await expectVisible(await canvas.findByText('Ссылкой из меню пространства.'));
    await expectGone(firstBody);

    // collapsible: повторный клик закрывает и последнюю открытую секцию
    await userEvent.click(second);

    await expectGone(() => canvas.queryByText('Ссылкой из меню пространства.'));
    await expect(first).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(first);

    await expectVisible(
      await canvas.findByText('Сообщество со своими каналами, ролями и акцентом.'),
    );
  },
};
