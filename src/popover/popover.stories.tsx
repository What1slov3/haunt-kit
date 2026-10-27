import type { Meta, StoryObj } from '@storybook/react-vite';
import { Search, Smile } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Button, Grid, Heading, Icon, IconButton, Inline, Input, Popover, Stack } from '@haunt/ui';

import {
  clickOutside,
  expectFocused,
  expectGone,
  expectVisible,
  pressEscape,
  screen,
} from '../lib/stories/play-helpers';

interface InvitePopoverProps {
  /** Нажатие «Пригласить» */
  onInvite?: () => void;
  defaultOpen?: boolean;
}

/** Поповер приглашения: заголовок, поле поиска и кнопки */
function InvitePopover({ onInvite, defaultOpen }: InvitePopoverProps) {
  return (
    <Popover.Root defaultOpen={defaultOpen}>
      <Popover.Trigger asChild>
        <Button>Поповер</Button>
      </Popover.Trigger>

      <Popover.Content>
        <Stack gap={2}>
          <Heading level={4} size="md">
            Пригласить в группу
          </Heading>

          <Input
            placeholder="Имя или @ник"
            startSlot={<Icon icon={Search} size="sm" />}
            fullWidth
          />

          <Inline justify="end" gap={1}>
            <Popover.Close asChild>
              <Button variant="ghost" size="sm">
                Отмена
              </Button>
            </Popover.Close>

            <Popover.Close asChild>
              <Button variant="accent" size="sm" onClick={onInvite}>
                Пригласить
              </Button>
            </Popover.Close>
          </Inline>
        </Stack>
      </Popover.Content>
    </Popover.Root>
  );
}

const meta = {
  title: 'Всплывающее/Popover',
  component: InvitePopover,
  subcomponents: { 'Popover.Content': Popover.Content },
  tags: ['autodocs'],
  args: { onInvite: fn() },
  parameters: {
    docs: {
      description: {
        component:
          'Поповер — произвольное содержимое у триггера: форма, пикер. Стекло, отступы 12 px; `flush` снимает отступы для своей раскладки. Закрывается по Esc, клику снаружи и `Popover.Close`, фокус возвращается на триггер.',
      },
    },
  },
} satisfies Meta<typeof InvitePopover>;

export default meta;

type Story = StoryObj<typeof meta>;

const trigger = (canvas: HTMLElement) => within(canvas).getByRole('button', { name: 'Поповер' });
const content = () => screen().queryByRole('dialog');

export const Default: Story = {};

export const Open: Story = {
  args: { defaultOpen: true },
  parameters: { docs: { story: { inline: false, height: '220px' } } },
};

/** flush — без отступов: внутри своя сетка (пикер эмодзи) */
export const Flush: Story = {
  render: () => (
    <Popover.Root defaultOpen>
      <Popover.Trigger asChild>
        <IconButton label="Эмодзи" variant="secondary">
          <Icon icon={Smile} />
        </IconButton>
      </Popover.Trigger>

      <Popover.Content flush aria-label="Эмодзи">
        <Grid columns={6} gap={0} p={1}>
          {['🔥', '👀', '❤️', '🏠', '🎉', '👍', '😂', '🤔', '🙏', '💯', '✨', '👻'].map((emoji) => (
            <Button key={emoji} variant="ghost" size="lg" aria-label={emoji}>
              {emoji}
            </Button>
          ))}
        </Grid>
      </Popover.Content>
    </Popover.Root>
  ),
  parameters: { docs: { story: { inline: false, height: '180px' } } },
};

export const ClosesOnEscape: Story = {
  name: 'Закрывается по Esc, фокус на триггере',
  play: async ({ canvasElement }) => {
    await userEvent.click(trigger(canvasElement));
    await expectVisible(await screen().findByRole('dialog'));

    await pressEscape();

    await expectGone(content);
    await expectFocused(trigger(canvasElement));
  },
};

export const ClosesOnOutsideClick: Story = {
  name: 'Закрывается кликом снаружи',
  play: async ({ canvasElement }) => {
    await userEvent.click(trigger(canvasElement));
    await expectVisible(await screen().findByRole('dialog'));

    await clickOutside();

    await expectGone(content);
  },
};

export const ClosesOnAction: Story = {
  name: 'Закрывается кнопками внутри',
  play: async ({ args, canvasElement }) => {
    await userEvent.click(trigger(canvasElement));
    await userEvent.click(await screen().findByRole('button', { name: 'Отмена' }));

    await expectGone(content);
    await expectFocused(trigger(canvasElement));

    await userEvent.click(trigger(canvasElement));
    await userEvent.click(await screen().findByRole('button', { name: 'Пригласить' }));

    await expectGone(content);
    await expect(args.onInvite).toHaveBeenCalledOnce();
  },
};
