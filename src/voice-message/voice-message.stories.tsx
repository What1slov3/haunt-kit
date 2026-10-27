import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Stack, VoiceMessage } from '@haunt/ui';

import { voiceWav } from '../lib/stories/demo-media';

/** Пики «от сервера» для истории: огибающая речи без расшифровки аудио */
const serverPeaks = Array.from({ length: 120 }, (_, i) =>
  Math.abs(Math.sin(i / 3.1) * Math.sin(i / 11) + 0.15 * Math.sin(i * 1.7)),
);

const meta = {
  title: 'Медиа/VoiceMessage',
  component: VoiceMessage,
  tags: ['autodocs'],
  args: { src: voiceWav(6) },
  argTypes: { src: { control: false }, peaks: { control: false } },
  parameters: {
    docs: {
      description: {
        component:
          'Голосовое сообщение: play / pause, волна из пиков — пройденное заливается акцентом, перемотка кликом, перетаскиванием и клавишами (slider: стрелки ±5 с, PageUp / PageDown ±15 с, Home / End), время и длительность моно, скорость ×1 / ×1.5 / ×2. Источник — `<audio src>`; `peaks` — от сервера любой длины, без них пики считаются из самого аудио (Web Audio, `decodeAudioData`). Одно голосовое играет за раз. Ошибка загрузки — сообщение и повтор.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 360 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof VoiceMessage>;

export default meta;

type Story = StoryObj<typeof meta>;

const slider = (canvas: HTMLElement) => within(canvas).getByRole('slider', { name: 'Перемотка' });

const metadataLoaded = (canvas: HTMLElement) =>
  waitFor(() => expect(slider(canvas)).toHaveAttribute('aria-valuemax', '6'), { timeout: 4000 });

export const Default: Story = {
  name: 'Пики из аудио',
  play: async ({ canvasElement }) => {
    await waitFor(
      () =>
        expect(within(canvasElement).getByRole('group')).toHaveAttribute('data-peaks', 'computed'),
      { timeout: 4000 },
    );
    await metadataLoaded(canvasElement);
    await expect(within(canvasElement).getByText('/ 0:06')).toBeVisible();
  },
};

export const ServerPeaks: Story = {
  name: 'Пики от сервера',
  args: { peaks: serverPeaks, duration: 6 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('group')).toHaveAttribute(
      'data-peaks',
      'provided',
    );
  },
};

export const KeyboardSeek: Story = {
  name: 'Перемотка с клавиатуры',
  play: async ({ canvasElement }) => {
    await metadataLoaded(canvasElement);

    const wave = slider(canvasElement);

    wave.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(wave).toHaveAttribute('aria-valuenow', '5');
    await expect(wave).toHaveAttribute('aria-valuetext', '0:05 из 0:06');
    await userEvent.keyboard('{Home}');
    await expect(wave).toHaveAttribute('aria-valuenow', '0');
    await userEvent.keyboard('{End}');
    await expect(wave).toHaveAttribute('aria-valuenow', '6');
  },
};

export const ClickSeek: Story = {
  name: 'Перемотка кликом',
  play: async ({ canvasElement }) => {
    await metadataLoaded(canvasElement);

    const wave = slider(canvasElement);
    const rect = wave.getBoundingClientRect();

    await userEvent.pointer({
      keys: '[MouseLeft]',
      target: wave,
      coords: { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 },
    });
    await expect(wave).toHaveAttribute('aria-valuenow', '3');
  },
};

export const Speed: Story = {
  name: 'Скорость',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Скорость ×1' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Скорость ×1.5' }));
    await expect(canvas.getByRole('button', { name: 'Скорость ×2' })).toHaveTextContent('×2');
  },
};

export const Broken: Story = {
  name: 'Ошибка загрузки',
  args: { src: 'data:audio/wav;base64,AAAA', duration: 12 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByRole('alert', {}, { timeout: 4000 })).toHaveTextContent(
      'Не удалось загрузить',
    );
    await expect(canvas.getByRole('button', { name: 'Повторить' })).toBeVisible();
  },
};

export const InMessages: Story = {
  name: 'В ленте: одно играет за раз',
  render: () => (
    <Stack gap={2}>
      <VoiceMessage src={voiceWav(6)} />
      <VoiceMessage src={voiceWav(14, 3)} peaks={serverPeaks} />
      <VoiceMessage src={voiceWav(3, 11)} bars={24} />
    </Stack>
  ),
};
