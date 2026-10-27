import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { screen } from '../../lib/stories/play-helpers';

import { SpaceDemo } from './space-demo';

const meta = {
  title: 'Демо/Пространство',
  component: SpaceDemo,
  // AppShell занимает высоту родителя: демо — на весь экран просмотра
  decorators: [
    (Story) => (
      <div style={{ height: '100vh' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    // Демо смотрят, а не настраивают: нижняя панель аддонов на нём только отнимает экран
    options: { showPanel: false },
    controls: { disable: true },
    docs: {
      description: {
        component:
          'Пространство «Холмы» целиком из кита: AppShell, места разных видов (поток, сцена, экран, полка), чат с фото и видео, эфир, кинозал с фильтрами, галерея с переходами и мозаикой, страница пространства и настройки. Переключатели темы, акцента, эффектов и TUI — в тулбаре Storybook сверху. Фото и видео — CC0 и общественное достояние с Wikimedia Commons (`lib/stories/media/CREDITS.md`).',
      },
    },
  },
} satisfies Meta<typeof SpaceDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Пространство «Холмы»',
};

/** Проверка для тестов: в боковой панели Storybook её нет, демо открывается нетронутым */
export const Smoke: Story = {
  name: 'Проверка: чат и места',
  tags: ['!dev', '!autodocs'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Отправка в чат по Enter
    await userEvent.type(
      canvas.getByPlaceholderText(/Написать в #дизайн/),
      'Привет из демо{Enter}',
    );
    await expect(await canvas.findByText('Привет из демо')).toBeVisible();

    // Смена места — другой экран
    await userEvent.click(canvas.getByRole('button', { name: /галерея/ }));
    await expect(await canvas.findByRole('heading', { level: 1, name: 'галерея' })).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: /о пространстве/ }));
    await expect(await screen().findByText('1 204 участника')).toBeVisible();
  },
};
