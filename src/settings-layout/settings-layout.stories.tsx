import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Bell, Palette, Shield, User } from 'lucide-react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Field, Icon, Input, NavItem, SettingsLayout, Switch, Textarea } from '@haunt/ui';

const initial = { name: 'Мария Орлова', bio: 'Дизайн и витрины', mentions: true };

function Demo() {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const unsaved = JSON.stringify(draft) !== JSON.stringify(saved);

  return (
    <SettingsLayout
      title="Профиль"
      description="Так тебя видят в пространствах: имя, пара строк о себе и что приходит в уведомления."
      nav={
        <>
          <NavItem active icon={<Icon icon={User} size="sm" />}>
            Профиль
          </NavItem>
          <NavItem icon={<Icon icon={Bell} size="sm" />}>Уведомления</NavItem>
          <NavItem icon={<Icon icon={Palette} size="sm" />}>Оформление</NavItem>
          <NavItem icon={<Icon icon={Shield} size="sm" />}>Приватность</NavItem>
        </>
      }
      unsaved={unsaved}
      onSave={() => setSaved(draft)}
      onReset={() => setDraft(saved)}
    >
      <Field label="Имя">
        <Input
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          fullWidth
        />
      </Field>

      <Field label="О себе">
        <Textarea
          value={draft.bio}
          onChange={(event) => setDraft({ ...draft, bio: event.target.value })}
        />
      </Field>

      <Switch
        label="Уведомлять об упоминаниях"
        checked={draft.mentions}
        onCheckedChange={(mentions) => setDraft({ ...draft, mentions })}
      />
    </SettingsLayout>
  );
}

const meta = {
  title: 'Лейауты/SettingsLayout',
  component: SettingsLayout,
  tags: ['autodocs'],
  args: { nav: null, children: null },
  argTypes: { nav: { control: false }, children: { control: false } },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Настройки: разделы слева (`nav` — список `NavItem`; уходят над формой, когда ей тесно), справа — заголовок раздела и форма шириной до 560 px. `unsaved` — внизу прилипает полоса «Сбросить · Сохранить» (`onReset`, `onSave`, `saving` — спиннер на кнопке): изменения видно при любой прокрутке. Что сохранять и что сбросить — решает экран.',
      },
    },
  },
  render: () => <Demo />,
} satisfies Meta<typeof SettingsLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Правка — полоса сохранения',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.queryByText('Есть несохранённые изменения')).toBeNull();

    await userEvent.type(canvas.getByLabelText('Имя'), '!');
    // Полоса появляется с анимацией — первый кадр прозрачный
    await waitFor(() => expect(canvas.getByText('Есть несохранённые изменения')).toBeVisible());

    await userEvent.click(canvas.getByRole('button', { name: 'Сбросить' }));
    await expect(canvas.queryByText('Есть несохранённые изменения')).toBeNull();
    await expect(canvas.getByLabelText('Имя')).toHaveValue('Мария Орлова');
  },
};
