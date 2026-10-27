import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { CornerFrame, Inline, QrCode, Stack, Text } from '@haunt/ui';

const meta = {
  title: 'Сигнал/QrCode',
  component: QrCode,
  tags: ['autodocs'],
  args: { value: 'https://haunt.chat/i/7Kq2', size: 160 },
  parameters: {
    docs: {
      description: {
        component:
          'QR-код из строки без зависимостей (`qr-code/qr-encode.ts`): режим byte (UTF-8), коррекция M, версии 1–10 (до 213 байт), Reed–Solomon и выбор маски по штрафу стандарта. Генератор грузится лениво при первом коде; пока грузится — штриховка на месте кода. Плашка по умолчанию светлая: сканер читает тёмное на светлом в любой теме.',
      },
    },
  },
} satisfies Meta<typeof QrCode>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutPlate: Story = {
  name: 'Без плашки — цвет текста',
  args: { plate: false },
};

export const Invite: Story = {
  name: 'Приглашение',
  render: (args) => (
    <Inline gap={4} align="center">
      <CornerFrame tone="accent" inline active>
        <QrCode {...args} size={120} />
      </CornerFrame>

      <Stack gap={1}>
        <Text weight="semibold">Ночной рейд</Text>

        <Text mono size="sm" tone="muted">
          haunt.chat/i/7Kq2
        </Text>
      </Stack>
    </Inline>
  ),
};

export const Versions: Story = {
  name: 'Версии по длине',
  render: (args) => (
    <Inline gap={4} align="end" wrap>
      <QrCode {...args} value="HAUNT" size={84} />
      <QrCode {...args} value="https://haunt.chat/i/7Kq2" size={100} />
      <QrCode {...args} value={'Приглашение в «Ночной рейд» — haunt.chat/i/ab12'} size={120} />
      <QrCode {...args} value={'x'.repeat(200)} size={160} />
    </Inline>
  ),
  play: async ({ canvasElement }) => {
    const codes = within(canvasElement).getAllByRole('img');

    await waitFor(() => expect(codes.every((code) => code.hasAttribute('data-ready'))).toBe(true));
    await expect(codes.map((code) => code.dataset.version)).toEqual(['1', '2', '5', '10']);
  },
};

export const TooLong: Story = {
  name: 'Длиннее 213 байт — не рисуется',
  args: { value: 'x'.repeat(214) },
  play: async ({ canvasElement }) => {
    // Пока генератор не загружен, на месте кода — заглушка; после загрузки строка не влезает и код исчезает
    await waitFor(() => expect(within(canvasElement).queryByRole('img')).toBeNull());
  },
};

export const DrawsModules: Story = {
  name: 'Рисует модули',
  play: async ({ canvasElement }) => {
    const code = within(canvasElement).getByRole('img', {
      name: 'QR-код: https://haunt.chat/i/7Kq2',
    });

    await waitFor(() => expect(code).toHaveAttribute('data-ready'));
    // Версия 2: 25 модулей и тихая зона по 4
    await expect(code.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 33 33');
  },
};
