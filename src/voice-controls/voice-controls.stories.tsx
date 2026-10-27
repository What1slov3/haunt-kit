import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { VoiceControls, type VoiceControlsProps } from '@haunt/ui';

/** Панель со своим состоянием и «живым» уровнем микрофона — как её подключит приложение */
function LiveVoice(props: VoiceControlsProps) {
  const [muted, setMuted] = useState(props.muted ?? false);
  const [deafened, setDeafened] = useState(props.deafened ?? false);
  const [sharing, setSharing] = useState(false);
  const [camera, setCamera] = useState(false);
  const [level, setLevel] = useState(props.level ?? 0.5);

  useEffect(() => {
    if (props.level !== undefined) return;

    let tick = 0;
    const timer = setInterval(() => setLevel(Math.abs(Math.sin(++tick / 3))), 160);

    return () => clearInterval(timer);
  }, [props.level]);

  return (
    <VoiceControls
      {...props}
      level={level}
      muted={muted}
      onMutedChange={(value) => {
        props.onMutedChange?.(value);
        setMuted(value);
      }}
      deafened={deafened}
      onDeafenedChange={(value) => {
        setDeafened(value);
        // Выключить звук — значит и замолчать, как в Discord
        if (value) setMuted(true);
      }}
      screenSharing={sharing}
      onScreenSharingChange={setSharing}
      camera={camera}
      onCameraChange={setCamera}
    />
  );
}

const meta = {
  title: 'Сообщество/VoiceControls',
  component: LiveVoice,
  subcomponents: { VoiceControls },
  tags: ['autodocs'],
  args: { channel: 'Голосовая · Штаб', ping: 42, onLeave: fn(), onMutedChange: fn() },
  decorators: [
    (Story) => (
      <div style={{ width: 300 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Панель голоса: микрофон, звук, демонстрация экрана, камера, выход, индикатор уровня микрофона и состояние соединения с задержкой (полоски сигнала по `ping`). Только кнопки и состояния — LiveKit и устройства подключает приложение. Кнопки — `Toggle` с постоянной подписью и `aria-pressed`; выключенный микрофон и звук — тревожным тоном. Кнопки без обработчика не показываются. `layout="bar"` — ряд кнопок на стекле для сцены звонка.',
      },
    },
  },
} satisfies Meta<typeof LiveVoice>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Connected: Story = {
  name: 'Подключено',
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const mic = canvas.getByRole('button', { name: 'Выключить микрофон' });

    await expect(canvas.getByRole('status')).toHaveTextContent('Подключено42 мс');
    await userEvent.click(mic);
    await expect(mic).toHaveAttribute('aria-pressed', 'true');
    await expect(args.onMutedChange).toHaveBeenCalledWith(true);
  },
};

export const Keyboard: Story = {
  name: 'Клавиатура',
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Выключить микрофон' })).toHaveFocus();
    await userEvent.tab();
    await userEvent.keyboard(' ');
    await expect(canvas.getByRole('button', { name: 'Выключить звук' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(canvas.getByRole('button', { name: 'Выключить микрофон' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Отключиться' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onLeave).toHaveBeenCalled();
  },
};

export const Reconnecting: Story = {
  name: 'Переподключение',
  args: { connection: 'reconnecting', ping: undefined },
};

export const PoorConnection: Story = { name: 'Плохая связь', args: { ping: 380 } };

export const Disconnected: Story = {
  name: 'Отключено',
  args: { connection: 'disconnected', ping: undefined },
};

export const Muted: Story = { name: 'Микрофон выключен', args: { muted: true, level: 0.8 } };

export const Bar: Story = {
  name: 'Ряд на сцене звонка',
  args: { layout: 'bar' },
  decorators: [
    (Story) => (
      <div
        style={{ width: 360, padding: 24, background: 'var(--accent-gradient)', borderRadius: 12 }}
      >
        <Story />
      </div>
    ),
  ],
};
