import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import {
  AccentScope,
  accentPresets,
  Badge,
  Button,
  DropdownMenu,
  Grid,
  Inline,
  Stack,
  Surface,
  Switch,
  Text,
  type AccentName,
} from '@haunt/ui';

import { expectVisible, screen } from '../lib/stories/play-helpers';

const accentNames = Object.keys(accentPresets) as AccentName[];

/** Кусок экрана сообщества: кнопка, бейдж, переключатель и меню, которое порталится */
function CommunityCard({ name }: { name: string }) {
  return (
    <Surface level={2} p={3}>
      <Stack gap={2}>
        <Inline justify="between">
          <Text weight="semibold">{name}</Text>

          <Badge tone="accent">акцент</Badge>
        </Inline>

        <Inline gap={1}>
          <Button variant="accent" size="sm">
            Акцент
          </Button>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button size="sm">Меню</Button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Content>
              <DropdownMenu.CheckboxItem checked>Галочка цвета акцента</DropdownMenu.CheckboxItem>

              <DropdownMenu.Item>
                <Text tone="accent">Текст цвета акцента</Text>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </Inline>

        <Switch label="Уведомления" defaultChecked />
      </Stack>
    </Surface>
  );
}

const meta = {
  title: 'Тема/AccentScope',
  component: AccentScope,
  tags: ['autodocs'],
  args: {
    accent: 'teal',
    children: <CommunityCard name="AccentScope" />,
  },
  argTypes: {
    accent: { control: 'select', options: accentNames },
    children: { control: false },
    as: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 280 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Контейнер со своим акцентом — экран сообщества. Переопределяет `--accent`, `--accent-2`, `--accent-contrast`; мягкий фон, текст, градиент и фокус выводятся из них сами. Всплывающее порталится в хост с теми же переменными, поэтому меню внутри тоже в цвете пространства. Глобальный акцент Storybook — в тулбаре.',
      },
    },
  },
} satisfies Meta<typeof AccentScope>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Teal: Story = {};

export const Rose: Story = {
  args: { accent: 'rose' },
};

/** Свои три цвета вместо пресета */
export const CustomColors: Story = {
  args: { accent: { accent: '#b4532a', accent2: '#c93d5a', contrast: '#ffffff' } },
};

export const AllPresets: Story = {
  render: () => (
    <Grid minColumnWidth="200px" gap={3}>
      {accentNames.map((name) => (
        <AccentScope key={name} accent={name}>
          <CommunityCard name={name} />
        </AccentScope>
      ))}
    </Grid>
  ),
  decorators: [(Story) => <Story />],
};

export const PortalInheritsAccent: Story = {
  name: 'Меню внутри наследует акцент',
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Меню' }));

    const menu = await screen().findByRole('menu');

    await expectVisible(menu);

    // Меню в портале, вне контейнера — акцент приходит через хост в <body>
    await waitFor(() =>
      expect(getComputedStyle(menu).getPropertyValue('--accent').trim()).toBe(
        accentPresets.teal.accent,
      ),
    );
  },
};
