import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { ColorPicker, Field } from '@haunt/ui';

const roleColors = [
  { value: '#e5484d', label: 'Красный' },
  { value: '#f5a524', label: 'Оранжевый' },
  { value: '#ffd84d', label: 'Жёлтый' },
  { value: '#30a46c', label: 'Зелёный' },
  { value: '#3e63dd', label: 'Синий' },
  { value: '#8e4ec6', label: 'Фиолетовый' },
  { value: '#6b7280', label: 'Серый' },
];

const meta = {
  title: 'Поля/ColorPicker',
  component: ColorPicker,
  tags: ['autodocs'],
  args: {
    label: 'Акцент пространства',
    onValueChange: fn(),
  },
  argTypes: {
    presets: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Цвет роли и акцент пространства: свотчи пресетов (`radiogroup`, стрелки ходят по кругу), hex-поле `Input prompt="#"` и свой цвет из системной палитры (`allowCustom`). Под свотчами — образец подписи и контраст текста `contrastWith` (по умолчанию белого) на выбранном цвете по WCAG: от 4.5 — AA, от 3 — только крупный текст, ниже — не читается. Значение — `#rrggbb` в нижнем регистре; hex принимает 3 и 6 знаков, неверный ввод на blur откатывается. `palette` — своя HSV-палитра: квадрат насыщенность × яркость и полоса оттенка, оба `role="slider"` (стрелки — 1 %, Shift и PageUp / PageDown — 10 %, Home / End — к краю), мышью — с захватом указателя; у серого и чёрного оттенок не теряется. Пипетка — кнопка только там, где есть EyeDropper API (Chromium, WebView2). `formats` (`rgb`, `hsl`) — подписи цвета моно.',
      },
    },
  },
} satisfies Meta<typeof ColorPicker>;

export default meta;

type Story = StoryObj<typeof meta>;

const swatch = (canvas: HTMLElement, name: string) => within(canvas).getByRole('radio', { name });
const hex = (canvas: HTMLElement) => within(canvas).getByRole('textbox', { name: 'Hex' });

export const Default: Story = {};

export const RoleColors: Story = {
  name: 'Цвета ролей',
  args: { presets: roleColors, defaultValue: '#30a46c', label: 'Цвет роли' },
};

export const LowContrast: Story = {
  name: 'Белый не читается',
  args: { presets: roleColors, defaultValue: '#ffd84d', label: 'Цвет роли' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('текст не читается')).toBeInTheDocument();
  },
};

export const CustomColor: Story = {
  name: 'Свой цвет',
  args: { defaultValue: '#123456' },
  play: async ({ canvasElement }) => {
    const radios = within(canvasElement).getAllByRole('radio');

    for (const radio of radios) await expect(radio).toHaveAttribute('aria-checked', 'false');

    await expect(hex(canvasElement)).toHaveValue('123456');
  },
};

export const PresetsOnly: Story = {
  args: { allowCustom: false, showContrast: false },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const InField: Story = {
  render: (args) => (
    <Field label="Цвет роли" hint="Им подписан ник в чате">
      <ColorPicker {...args} presets={roleColors} label="Цвет роли" />
    </Field>
  ),
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('radiogroup', { name: 'Цвет роли' }),
    ).toHaveAccessibleDescription('Им подписан ник в чате');
  },
};

export const PickPreset: Story = {
  name: 'Выбор свотча мышью и стрелками',
  play: async ({ args, canvasElement }) => {
    await userEvent.click(swatch(canvasElement, 'Бирюзовый'));

    await expect(swatch(canvasElement, 'Бирюзовый')).toHaveAttribute('aria-checked', 'true');
    await expect(args.onValueChange).toHaveBeenLastCalledWith('#0b7f77');
    await expect(hex(canvasElement)).toHaveValue('0b7f77');

    // Radix выбирает пункт при фокусе, пока стрелка зажата, а фокус переводит в setTimeout — мгновенный
    // keyup от userEvent успел бы раньше, поэтому клавиша держится до проверки (как в RadioGroup)
    await userEvent.keyboard('{ArrowRight>}');
    await waitFor(() => expect(args.onValueChange).toHaveBeenLastCalledWith('#457a0f'));
    await userEvent.keyboard('{/ArrowRight}');

    await expect(swatch(canvasElement, 'Лаймовый')).toHaveFocus();
  },
};

export const TypeHex: Story = {
  name: 'Ввод hex',
  play: async ({ args, canvasElement }) => {
    const input = hex(canvasElement);

    await userEvent.clear(input);
    await userEvent.type(input, '#D13A6C');

    await expect(args.onValueChange).toHaveBeenLastCalledWith('#d13a6c');
    await expect(swatch(canvasElement, 'Розовый')).toHaveAttribute('aria-checked', 'true');

    // Короткая запись разворачивается на blur
    await userEvent.clear(input);
    await userEvent.type(input, 'fa0');
    await userEvent.tab();

    await expect(args.onValueChange).toHaveBeenLastCalledWith('#ffaa00');
    await expect(input).toHaveValue('ffaa00');
  },
};

export const InvalidHexReverts: Story = {
  name: 'Неверный hex откатывается',
  play: async ({ args, canvasElement }) => {
    const input = hex(canvasElement);

    await userEvent.clear(input);
    await userEvent.type(input, '12zz');
    await userEvent.tab();

    await expect(input).toHaveValue('6e5ce6');
    await expect(args.onValueChange).not.toHaveBeenCalled();
  },
};

const slider = (canvas: HTMLElement, name: string) => within(canvas).getByRole('slider', { name });

export const Palette: Story = {
  name: 'Своя палитра: квадрат и оттенок',
  args: { palette: true, presets: roleColors, defaultValue: '#e5484d', formats: ['rgb', 'hsl'] },
};

export const PaletteKeyboard: Story = {
  name: 'Палитра с клавиатуры',
  args: { palette: true, defaultValue: '#ff0000', presets: roleColors },
  play: async ({ args, canvasElement }) => {
    const area = slider(canvasElement, 'Насыщенность и яркость');
    const hue = slider(canvasElement, 'Оттенок');

    await expect(area).toHaveAttribute('aria-valuetext', 'насыщенность 100 %, яркость 100 %');

    // Насыщенность в ноль — белый; оттенок при этом не теряется
    area.focus();
    await userEvent.keyboard('{Home}');
    await expect(args.onValueChange).toHaveBeenLastCalledWith('#ffffff');
    await expect(hex(canvasElement)).toHaveValue('ffffff');

    hue.focus();
    await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}');
    await expect(hue).toHaveAttribute('aria-valuenow', '10');
    await expect(args.onValueChange).toHaveBeenLastCalledWith('#ffffff');

    area.focus();
    await userEvent.keyboard('{End}');
    await expect(args.onValueChange).toHaveBeenLastCalledWith('#ff2a00');

    // Hex снаружи палитры двигает ручки
    await userEvent.clear(hex(canvasElement));
    await userEvent.type(hex(canvasElement), '0000ff');
    await expect(hue).toHaveAttribute('aria-valuenow', '240');
  },
};

export const PalettePointer: Story = {
  name: 'Палитра мышью: оттенок не теряется в чёрном',
  args: { palette: true, defaultValue: '#3e63dd', presets: roleColors },
  play: async ({ args, canvasElement }) => {
    const area = slider(canvasElement, 'Насыщенность и яркость');
    const hue = slider(canvasElement, 'Оттенок');
    const box = area.getBoundingClientRect();
    const before = hue.getAttribute('aria-valuenow');

    await userEvent.pointer({
      keys: '[MouseLeft]',
      target: area,
      coords: { clientX: box.left - 10, clientY: box.bottom + 10 },
    });
    await expect(args.onValueChange).toHaveBeenLastCalledWith('#000000');
    await expect(hue).toHaveAttribute('aria-valuenow', before);
    await expect(area).toHaveFocus();

    await userEvent.pointer({
      keys: '[MouseLeft]',
      target: area,
      // Фокус мог прокрутить страницу — прямоугольник меряется заново
      coords: {
        clientX: area.getBoundingClientRect().right + 10,
        clientY: area.getBoundingClientRect().top - 10,
      },
    });
    await expect(area).toHaveAttribute('aria-valuetext', 'насыщенность 100 %, яркость 100 %');
    await expect(args.onValueChange).toHaveBeenLastCalledWith(
      expect.stringMatching(/^#00[0-9a-f]{2}ff$/),
    );
  },
};

export const Formats: Story = {
  name: 'rgb и hsl моно',
  args: { defaultValue: '#0b7f77', formats: ['rgb', 'hsl'] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('rgb(11, 127, 119)')).toBeInTheDocument();
    await expect(within(canvasElement).getByText('hsl(176, 84%, 27%)')).toBeInTheDocument();
  },
};

export const EyeDropper: Story = {
  name: 'Пипетка — только где есть EyeDropper',
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).queryByRole('button', { name: 'Взять цвет с экрана' });

    await expect(Boolean(button)).toBe('EyeDropper' in window);
  },
};
