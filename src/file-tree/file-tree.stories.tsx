import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { FileTree } from '@haunt/ui';

/** Файлы канала #design: папки сворачиваются, текущий файл подсвечен */
function ChannelFiles({ defaultOpen = true }: { defaultOpen?: boolean }) {
  return (
    <FileTree.Root aria-label="Файлы канала">
      <FileTree.Folder name="макеты" defaultOpen={defaultOpen}>
        <FileTree.Folder name="мессенджер" defaultOpen={defaultOpen}>
          <FileTree.File name="чат.fig" meta="2.4 МБ" active />
          <FileTree.File name="рейл.fig" meta="880 КБ" />
        </FileTree.Folder>
        <FileTree.File name="токены.json" meta="12 КБ" />
      </FileTree.Folder>

      <FileTree.Folder name="звуки">
        <FileTree.File name="упоминание.ogg" />
      </FileTree.Folder>

      <FileTree.File name="README.md" meta="3 КБ" />
    </FileTree.Root>
  );
}

const meta = {
  title: 'Блоки/FileTree',
  component: ChannelFiles,
  subcomponents: {
    'FileTree.Root': FileTree.Root,
    'FileTree.Folder': FileTree.Folder,
    'FileTree.File': FileTree.File,
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 360 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Дерево файлов в духе Fumadocs: папки сворачиваются (Radix Collapsible), вложенность видна направляющей, текущий файл — тоном акцента. Для файлов канала, вложений, содержимого архива.',
      },
    },
  },
} satisfies Meta<typeof ChannelFiles>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Collapsed: Story = {
  name: 'Свёрнуто',
  args: { defaultOpen: false },
};

export const TogglesFolder: Story = {
  name: 'Клик сворачивает папку',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const folder = canvas.getByRole('button', { name: 'мессенджер' });

    await expect(folder).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(folder);
    await expect(folder).toHaveAttribute('aria-expanded', 'false');
    await waitFor(() => expect(canvas.queryByText('чат.fig')).toBeNull());
  },
};
