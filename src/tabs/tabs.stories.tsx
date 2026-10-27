import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Tabs, Text } from '@haunt/ui';

interface InboxTabsProps {
  /** line — подчёркивание (навигация), segment — компактный сегмент (режим), card — шапка карточки */
  variant?: 'line' | 'segment' | 'card';
  /** Растянуть вкладки на всю ширину */
  fullWidth?: boolean;
  /** Активная вкладка при первом рендере; без неё ни одна не активна */
  defaultValue?: string;
}

const tabs = [
  { value: 'all', title: 'Все', body: 'Все разговоры.' },
  { value: 'unread', title: 'Непрочитанные', body: 'Только непрочитанные.' },
  { value: 'archive', title: 'Архив', body: 'Архив.', disabled: true },
  { value: 'mentions', title: 'Упоминания', body: 'Где упомянули вас.' },
];

/** Вкладки списка разговоров; «Архив» выключен */
function InboxTabs({ variant, fullWidth, defaultValue }: InboxTabsProps) {
  return (
    <Tabs.Root defaultValue={defaultValue} variant={variant}>
      <Tabs.List fullWidth={fullWidth} aria-label="Разговоры">
        {tabs.map((tab) => (
          <Tabs.Trigger key={tab.value} value={tab.value} disabled={tab.disabled}>
            {tab.title}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {tabs.map((tab) => (
        <Tabs.Content key={tab.value} value={tab.value}>
          <Text size="sm" tone="muted" style={{ paddingTop: 8, display: 'block' }}>
            {tab.body}
          </Text>
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}

const meta = {
  title: 'Списки/Tabs',
  component: InboxTabs,
  subcomponents: {
    'Tabs.Root': Tabs.Root,
    'Tabs.List': Tabs.List,
  },
  tags: ['autodocs'],
  args: { variant: 'line', defaultValue: 'all' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['line', 'segment', 'card'] },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Вкладки на Radix: `line` — подчёркивание для навигации, `segment` — сегмент для режима, `card` — вкладки в шапке карточки, как примеры кода у Fumadocs. Индикатор переезжает между пунктами (Motion `layoutId`, свой на каждый экземпляр). Стрелки переключают вкладки, выключенные пропускаются.',
      },
    },
  },
} satisfies Meta<typeof InboxTabs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Line: Story = {};

export const Segment: Story = {
  args: { variant: 'segment' },
};

/** Вкладки в шапке карточки — как примеры кода у Fumadocs */
export const Card: Story = {
  args: { variant: 'card' },
};

export const FullWidth: Story = {
  args: { variant: 'segment', fullWidth: true },
};

export const NoneSelected: Story = {
  args: { defaultValue: undefined },
};

export const SwitchesByClick: Story = {
  name: 'Клик переключает панель',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('tab', { name: 'Непрочитанные' }));

    await expect(canvas.getByRole('tab', { name: 'Непрочитанные' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(canvas.getByRole('tabpanel')).toHaveTextContent('Только непрочитанные.');
  },
};

export const KeyboardSkipsDisabled: Story = {
  name: 'Стрелки переключают, выключенная пропускается',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('tab', { name: 'Непрочитанные' }));
    await userEvent.keyboard('{ArrowRight}');

    const mentions = canvas.getByRole('tab', { name: 'Упоминания' });

    await expect(mentions).toHaveFocus();
    await expect(mentions).toHaveAttribute('aria-selected', 'true');
    await expect(canvas.getByRole('tabpanel')).toHaveTextContent('Где упомянули вас.');
    await expect(canvas.getByRole('tab', { name: 'Архив' })).toBeDisabled();
  },
};
