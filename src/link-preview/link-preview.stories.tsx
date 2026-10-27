import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { LinkPreview, Stack, Text } from '@haunt/ui';

import { photos } from '../lib/stories/demo-photos';

const meta = {
  title: 'Медиа/LinkPreview',
  component: LinkPreview,
  tags: ['autodocs'],
  args: {
    url: 'https://www.github.com/haunt/haunt/pull/42',
    title: 'Голосовые комнаты на LiveKit: первая итерация',
    description:
      'Комнаты создаются по требованию, токены выдаёт сервер, клиент подключается через SFU. В PR — схема, миграции и тесты на права доступа к каналу.',
    color: '#8250df',
    imagePosition: 'end',
  },
  argTypes: {
    image: { control: false },
    color: { control: 'color' },
    imagePosition: { control: 'inline-radio', options: ['end', 'bottom'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Превью ссылки под сообщением: полоса цвета сайта слева (`color` — данные страницы, без него — нейтральная), домен моно (или `siteName`), заголовок-ссылка в новой вкладке, описание обрезается до двух строк, картинка справа миниатюрой или снизу обложкой. `loading` — скелетон той же формы, чтобы лента не прыгала.',
      },
    },
  },
} satisfies Meta<typeof LinkPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { image: photos.bokeh.src, imageAlt: '' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const link = canvas.getByRole('link', { name: /Голосовые комнаты/ });

    await expect(canvas.getByText('github.com')).toBeVisible();
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noreferrer');
  },
};

export const ImageBottom: Story = {
  name: 'Картинка снизу',
  args: {
    url: 'https://blog.haunt.dev/spaces',
    siteName: 'Блог Haunt',
    title: 'Пространства вместо серверов',
    description:
      'Почему сообщество — это не машина в дата-центре, и что из этого следует для прав.',
    color: '#1fb6a8',
    image: photos.ridge.src,
    imagePosition: 'bottom',
  },
};

export const WithoutImage: Story = {
  name: 'Без картинки и цвета',
  args: { color: undefined, url: 'https://docs.rs/axum/latest/axum/' },
};

export const LongText: Story = {
  name: 'Длинные заголовок и описание',
  args: {
    title:
      'Очень длинный заголовок страницы, который никак не помещается в две строки превью и должен аккуратно обрезаться многоточием',
    description:
      'Описание тоже длинное: в нём три-четыре предложения, ссылки и перечисления. Превью показывает только две строки, остальное — на самой странице. Так карточка не растягивает ленту сообщений.',
    image: photos.bokeh.src,
  },
};

export const Loading: Story = {
  args: { loading: true },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[aria-busy="true"]')).not.toBeNull();
    await expect(within(canvasElement).queryByRole('link')).toBeNull();
  },
};

export const InMessage: Story = {
  name: 'Под сообщением',
  args: { image: photos.bokeh.src },
  render: (args) => (
    <Stack gap={1.5}>
      <Text size="lg">
        Смотрите, что получилось: <Text tone="accent">github.com/haunt/haunt/pull/42</Text>
      </Text>

      <LinkPreview {...args} />
    </Stack>
  ),
};
