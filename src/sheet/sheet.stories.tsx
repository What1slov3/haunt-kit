import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import {
  Avatar,
  Button,
  Field,
  Inline,
  Input,
  Sheet,
  Stack,
  Switch,
  Text,
  type SheetSide,
  type SheetSize,
} from '@haunt/ui';

import {
  clickOutside,
  expectFocused,
  expectGone,
  expectVisible,
  pressEscape,
  screen,
} from '../lib/stories/play-helpers';

interface ChannelSheetProps {
  /** Сторона: right — профиль и настройки, left — навигация */
  side?: SheetSide;
  /** sm 320 / md 400 / lg 560 */
  size?: SheetSize;
  /** Крестик в шапке */
  showClose?: boolean;
  /** Нажатие «Сохранить» */
  onSave?: () => void;
  defaultOpen?: boolean;
}

/** Настройки канала сбоку: шапка, форма в теле, кнопки в подвале */
function ChannelSheet({ side, size, showClose, onSave, defaultOpen }: ChannelSheetProps) {
  return (
    <Sheet.Root defaultOpen={defaultOpen}>
      <Sheet.Trigger asChild>
        <Button>Настройки канала</Button>
      </Sheet.Trigger>

      <Sheet.Content side={side} size={size} showClose={showClose}>
        <Sheet.Header>
          <Sheet.Title>#design-review</Sheet.Title>
          <Sheet.Description>Видят все участники пространства.</Sheet.Description>
        </Sheet.Header>

        <Sheet.Body>
          <Stack gap={4}>
            <Field label="Название" hint="Строчные буквы, цифры и дефис">
              <Input defaultValue="design-review" fullWidth />
            </Field>

            <Field label="Тема канала" optional>
              <Input placeholder="О чём здесь говорят" fullWidth />
            </Field>

            <Switch label="Медленный режим" description="Одно сообщение в 30 секунд" />
          </Stack>
        </Sheet.Body>

        <Sheet.Footer>
          <Sheet.Close asChild>
            <Button variant="ghost">Отмена</Button>
          </Sheet.Close>

          <Sheet.Close asChild>
            <Button variant="accent" onClick={onSave}>
              Сохранить
            </Button>
          </Sheet.Close>
        </Sheet.Footer>
      </Sheet.Content>
    </Sheet.Root>
  );
}

const meta = {
  title: 'Всплывающее/Sheet',
  component: ChannelSheet,
  subcomponents: {
    'Sheet.Content': Sheet.Content,
    'Sheet.Header': Sheet.Header,
    'Sheet.Body': Sheet.Body,
    'Sheet.Footer': Sheet.Footer,
  },
  tags: ['autodocs'],
  args: { side: 'right', size: 'md', showClose: true, onSave: fn() },
  argTypes: {
    side: { control: 'inline-radio', options: ['right', 'left'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Боковая панель на Radix Dialog: профиль участника, настройки канала. Стекло, отступ от края экрана, въезд сбоку (`transform`), затемнение со свечением акцента с той же стороны. Части — `Sheet.Header` (`Title`, `Description`), прокручиваемое `Sheet.Body`, `Sheet.Footer`. Закрывается по Esc, клику по затемнению, крестику и `Sheet.Close`; фокус заперт внутри и возвращается на триггер.',
      },
    },
  },
} satisfies Meta<typeof ChannelSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

const trigger = (canvas: HTMLElement) =>
  within(canvas).getByRole('button', { name: 'Настройки канала' });
const sheet = () => screen().queryByRole('dialog', { name: '#design-review' });

async function openSheet(canvas: HTMLElement) {
  await userEvent.click(trigger(canvas));
  await expectVisible(await screen().findByRole('dialog', { name: '#design-review' }));
}

const docsFrame = { docs: { story: { inline: false, height: '480px' } } };

export const Default: Story = {};

export const Open: Story = { args: { defaultOpen: true }, parameters: docsFrame };

export const Left: Story = {
  args: { defaultOpen: true, side: 'left', size: 'sm' },
  parameters: docsFrame,
};

/** Профиль участника: узкая панель без подвала, длинное тело прокручивается, шапка на месте */
export const Profile: Story = {
  render: () => (
    <Sheet.Root defaultOpen>
      <Sheet.Trigger asChild>
        <Button>Профиль</Button>
      </Sheet.Trigger>

      <Sheet.Content size="sm" aria-describedby={undefined}>
        <Sheet.Header>
          <Inline gap={3}>
            <Avatar name="Мира Лебедева" size="lg" status="online" />
            <Sheet.Title>Мира Лебедева</Sheet.Title>
          </Inline>
        </Sheet.Header>

        <Sheet.Body>
          <Stack gap={3}>
            {Array.from({ length: 14 }, (_, index) => (
              <Text key={index} tone="muted">
                Запись {index + 1}: участвует в обсуждениях дизайна, отвечает за витрину.
              </Text>
            ))}
          </Stack>
        </Sheet.Body>
      </Sheet.Content>
    </Sheet.Root>
  ),
  parameters: docsFrame,
};

export const ClosesOnEscape: Story = {
  name: 'Закрывается по Esc, фокус на триггере',
  play: async ({ canvasElement }) => {
    await openSheet(canvasElement);

    await pressEscape();

    await expectGone(sheet);
    await expectFocused(trigger(canvasElement));
  },
};

export const ClosesOnOverlayClick: Story = {
  name: 'Закрывается кликом по затемнению',
  play: async ({ canvasElement }) => {
    await openSheet(canvasElement);

    const overlay = sheet()?.previousElementSibling;

    await expect(overlay).toBeTruthy();
    await clickOutside(overlay!);

    await expectGone(sheet);
  },
};

export const TrapsFocus: Story = {
  name: 'Фокус заперт внутри панели',
  play: async ({ args, canvasElement }) => {
    await openSheet(canvasElement);

    const panel = sheet()!;
    const name = within(panel).getByRole('textbox', { name: 'Название' });

    // Radix фокусирует первое поле; Shift+Tab с него уходит не на страницу, а на последний контрол панели
    await expectFocused(name);
    await userEvent.tab({ shift: true });
    await expectFocused(within(panel).getByRole('button', { name: 'Закрыть' }));

    await userEvent.tab();
    await expectFocused(name);

    await userEvent.click(within(panel).getByRole('button', { name: 'Сохранить' }));

    await expectGone(sheet);
    await expect(args.onSave).toHaveBeenCalledOnce();
  },
};

export const LeftSide: Story = {
  name: 'Слева — своя сторона и у затемнения',
  args: { side: 'left' },
  play: async ({ canvasElement }) => {
    await openSheet(canvasElement);

    await expect(sheet()).toHaveAttribute('data-side', 'left');
    await expect(sheet()?.previousElementSibling).toHaveAttribute('data-side', 'left');

    const rect = sheet()!.getBoundingClientRect();

    await expect(rect.left).toBeLessThan(window.innerWidth / 2);
  },
};
