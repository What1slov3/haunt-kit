import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Paperclip, Send, Smile } from 'lucide-react';

import { FieldFrame, Icon, IconButton, Textarea, type FieldFrameProps } from '@haunt/ui';

/** Композер: кнопки и голый Textarea в одной рамке — главный случай FieldFrame */
function Composer(props: FieldFrameProps) {
  const [draft, setDraft] = useState('');

  return (
    <FieldFrame
      multiline
      fullWidth
      {...props}
      style={{ padding: '3px 3px 3px 8px', ...props.style }}
    >
      <IconButton label="Прикрепить" size="sm">
        <Icon icon={Paperclip} size="sm" />
      </IconButton>

      <Textarea
        bare
        autoGrow
        rows={1}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Написать в #general"
        aria-label="Сообщение"
        disabled={props.disabled}
        style={{ flex: 1, minWidth: 0, margin: 'calc((var(--control-sm) - 1lh) / 2) 0' }}
      />

      <IconButton label="Эмодзи" size="sm">
        <Icon icon={Smile} size="sm" />
      </IconButton>

      <IconButton label="Отправить" size="sm" variant={draft ? 'accent' : 'ghost'}>
        <Icon icon={Send} size="sm" />
      </IconButton>
    </FieldFrame>
  );
}

const meta = {
  title: 'Поля/FieldFrame',
  component: FieldFrame,
  tags: ['autodocs'],
  render: (args) => <Composer {...args} />,
  args: { size: 'md' },
  argTypes: { as: { control: false } },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 520 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Рамка поля без самого поля: фон, граница, наведение, фокус внутри, ошибка, выключено. `Input`, `Textarea` и `Select.Trigger` построены на тех же стилях; как компонент — для составных полей вроде композера.',
      },
    },
  },
} satisfies Meta<typeof FieldFrame>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Градиентная кромка с бегущим отблеском при фокусе — нажмите в поле */
export const Glow: Story = {
  args: { glow: true },
};

export const Invalid: Story = {
  args: { invalid: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};
