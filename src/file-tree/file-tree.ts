import { FileTreeFile, FileTreeFolder, FileTreeRoot } from './file-tree-parts';

/**
 * Дерево файлов в духе Fumadocs — вложения сообщения, файлы канала, структура архива:
 * <FileTree.Root><FileTree.Folder name="docs" defaultOpen><FileTree.File name="a.md" /></…></…>
 * Папка — Radix Collapsible: open / defaultOpen / onOpenChange.
 */
export const FileTree = {
  Root: FileTreeRoot,
  Folder: FileTreeFolder,
  File: FileTreeFile,
};

export type { FileTreeFileProps, FileTreeFolderProps, FileTreeRootProps } from './file-tree-parts';
