import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Soundboard, type SoundboardProps, type SoundboardSound } from '@haunt/ui';

const sounds: SoundboardSound[] = [
  { id: 'airhorn', label: 'Гудок', emoji: '📯' },
  { id: 'drums', label: 'Барабаны', emoji: '🥁' },
  { id: 'clap', label: 'Аплодисменты', emoji: '👏' },
  { id: 'cricket', label: 'Сверчки', emoji: '🦗' },
  { id: 'ghost', label: 'Призрак', emoji: '👻' },
  { id: 'sad', label: 'Грустный тромбон', emoji: '🎺' },
  { id: 'wow', label: 'Ого', emoji: '😮' },
  { id: 'locked', label: 'Только бустерам', emoji: '🔒', disabled: true },
];

/** Панель со своим состоянием: звук «играет» секунду — как приложение снимет его по окончании */
function LiveSoundboard(props: Partial<SoundboardProps>) {
  const [playing, setPlaying] = useState<string[]>(props.playing ? [...props.playing] : []);
  const [volume, setVolume] = useState(70);

  return (
    <Soundboard
      sounds={props.sounds ?? sounds}
      {...props}
      playing={playing}
      onPlay={(id) => {
        props.onPlay?.(id);
        setPlaying((current) => [...current, id]);
      }}
      onStop={(id) => setPlaying((current) => current.filter((value) => value !== id))}
      onStopAll={() => setPlaying([])}
      volume={volume}
      onVolumeChange={setVolume}
    />
  );
}

const meta = {
  title: 'Сообщество/Soundboard',
  component: LiveSoundboard,
  subcomponents: { Soundboard },
  tags: ['autodocs'],
  args: { onPlay: fn() },
  decorators: [
    (Story) => (
      <div style={{ width: 440 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Звуковая панель: сетка кнопок (эмодзи или иконка, подпись), играющая нажата (`aria-pressed`) и с эквалайзером (только `scaleY`; без эффектов стоит, «играет» видно подписью), повторное нажатие — `onStop`. Громкость — `Slider` в шапке, «Остановить все» — пока что-то играет. Стрелки ходят по сетке во все стороны, Home / End — к краям. Звук играет приложение.',
      },
    },
  },
} satisfies Meta<typeof LiveSoundboard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const drums = canvas.getByRole('button', { name: 'Барабаны' });

    await userEvent.click(drums);
    await expect(args.onPlay).toHaveBeenCalledWith('drums');
    await expect(drums).toHaveAttribute('aria-pressed', 'true');
    await expect(within(drums).getByText('играет')).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: 'Остановить все' }));
    await expect(drums).toHaveAttribute('aria-pressed', 'false');
  },
};

export const GridKeyboard: Story = {
  name: 'Стрелки по сетке',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    canvas.getByRole('button', { name: 'Гудок' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getByRole('button', { name: 'Барабаны' })).toHaveFocus();
    // В 440 px — четыре колонки: вниз на ряд от второй — шестая
    await userEvent.keyboard('{ArrowDown}');
    await expect(canvas.getByRole('button', { name: 'Грустный тромбон' })).toHaveFocus();
    await userEvent.keyboard('{Home}');
    await expect(canvas.getByRole('button', { name: 'Гудок' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByRole('button', { name: 'Гудок' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  },
};

export const Playing: Story = { name: 'Играют два', args: { playing: ['ghost', 'clap'] } };

export const Empty: Story = { name: 'Пусто', args: { sounds: [] } };
