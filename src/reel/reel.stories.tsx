import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { InviteCard, Reel } from '@haunt/ui';

const spaces = ['Холмы', 'Тёплая лампа', 'Rust по вечерам', 'Настолки', 'Кино в пятницу', 'Звук'];

const meta = {
  title: 'Раскладка/Reel',
  component: Reel,
  tags: ['autodocs'],
  args: { itemWidth: '260px', gap: 3, snap: true, label: 'Пространства для вас' },
  argTypes: { children: { control: false } },
  parameters: {
    docs: {
      description: {
        component:
          'Горизонтальная лента с прокруткой: карусель пространств, вложения, плитки в одну строку. Элементы не сжимаются; `itemWidth` — ширина каждого, `snap` — прокрутка останавливается на начале элемента. С `label` лента — область с фокусом, листается стрелками с клавиатуры; без него — только мышью и пальцем.',
      },
    },
  },
  render: (args) => (
    <div style={{ width: 640 }}>
      <Reel {...args}>
        {spaces.map((name, index) => (
          <InviteCard key={name} name={name} members={120 + index * 87} online={4 + index * 3} />
        ))}
      </Reel>
    </div>
  ),
} satisfies Meta<typeof Reel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const reel = within(canvasElement).getByRole('region', { name: 'Пространства для вас' });

    await expect(reel.scrollWidth).toBeGreaterThan(reel.clientWidth);

    // С клавиатуры: фокус на ленту и стрелка вправо листают её
    reel.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(reel).toHaveFocus();
  },
};
