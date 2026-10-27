import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Button, Steps, Text } from '@haunt/ui';

/** Онбординг пространства: три шага, второй — текущий */
function OnboardingSteps({ progress = 1 }: { progress?: number }) {
  const items = [
    { title: 'Создайте пространство', body: 'Название и цвет акцента можно поменять позже.' },
    {
      title: 'Пригласите людей',
      body: (
        <>
          Ссылка-приглашение живёт 7 дней:{' '}
          <Text mono size="sm">
            haunt.app/i/x7Kp
          </Text>
        </>
      ),
    },
    { title: 'Заведите каналы', body: 'Текстовые для обсуждений, голосовые — для эфиров.' },
  ];

  return (
    <Steps.Root>
      {items.map((item, index) => (
        <Steps.Item
          key={index}
          title={item.title}
          done={index < progress}
          current={index === progress}
        >
          {item.body}
        </Steps.Item>
      ))}
    </Steps.Root>
  );
}

const meta = {
  title: 'Блоки/Steps',
  component: OnboardingSteps,
  subcomponents: { 'Steps.Root': Steps.Root, 'Steps.Item': Steps.Item },
  tags: ['autodocs'],
  args: { progress: 1 },
  argTypes: { progress: { control: { type: 'range', min: 0, max: 3 } } },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 520 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Шаги в духе Fumadocs: номер в круге (моно-цифра) и линия до следующего шага. `done` — галочка акцента, `current` — кольцо акцента и `aria-current="step"`.',
      },
    },
  },
} satisfies Meta<typeof OnboardingSteps>;

export default meta;

type Story = StoryObj<typeof meta>;

export const InProgress: Story = {
  play: async ({ canvasElement }) => {
    const items = within(canvasElement).getAllByRole('listitem');

    await expect(items).toHaveLength(3);
    await expect(items[1]).toHaveAttribute('aria-current', 'step');
  },
};

export const NotStarted: Story = {
  args: { progress: 0 },
};

export const Done: Story = {
  args: { progress: 3 },
};

/** Шаги без описаний, с действием внутри */
export const Plain: Story = {
  name: 'Без описаний',
  render: () => (
    <Steps.Root>
      <Steps.Item title="Подключите микрофон" />

      <Steps.Item title="Проверьте громкость">
        <Button size="sm" variant="secondary">
          Тест микрофона
        </Button>
      </Steps.Item>

      <Steps.Item title="Готово">
        <Text tone="muted">Можно заходить в голосовой канал.</Text>
      </Steps.Item>
    </Steps.Root>
  ),
};
