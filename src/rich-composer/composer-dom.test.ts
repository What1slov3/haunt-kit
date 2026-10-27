import { beforeEach, describe, expect, it } from 'vitest';

import {
  createTokenRegistry,
  domPoint,
  positionFromDom,
  readDocFromDom,
  renderDoc,
  type TokenRegistry,
} from './composer-dom';
import type { ComposerDoc, ComposerToken } from './composer-model';

const text = (value: string) => ({ type: 'text' as const, text: value });
const anna: ComposerToken = { type: 'mention', kind: 'user', name: 'anna' };
const general: ComposerToken = { type: 'channel', name: 'general' };

let root: HTMLElement;
let registry: TokenRegistry;

beforeEach(() => {
  root = document.createElement('div');
  registry = createTokenRegistry((token) => {
    const element = document.createElement('span');

    element.textContent = token.type === 'emoji' ? token.char : `@${token.name}`;

    return element;
  });
});

const kinds = () =>
  Array.from(root.childNodes, (node) => {
    if (node.nodeType === 3)
      return (node as Text).data === String.fromCharCode(0x200b)
        ? 'spacer'
        : `"${(node as Text).data}"`;

    return (node as HTMLElement).tagName === 'BR' ? 'br' : 'token';
  });

describe('renderDoc', () => {
  it('распорки там, где у токена нет текста рядом', () => {
    renderDoc(root, [anna, general, text(' ok')], registry);

    expect(kinds()).toEqual(['spacer', 'token', 'spacer', 'token', '" ok"']);
  });

  it('конечный перевод строки — с <br>', () => {
    renderDoc(root, [text('раз\n')], registry);

    expect(kinds()).toEqual(['"раз\n"', 'br']);
  });

  it('узлы переиспользуются, лишние узлы браузера уходят', () => {
    const doc: ComposerDoc = [text('привет '), anna];

    renderDoc(root, doc, registry);

    const [textNode, token] = Array.from(root.childNodes);

    root.append(document.createElement('div'));
    renderDoc(root, [text('привет, '), anna], registry);

    expect(root.childNodes[0]).toBe(textNode);
    expect((root.childNodes[0] as Text).data).toBe('привет, ');
    expect(root.childNodes[1]).toBe(token);
    expect(kinds()).toEqual(['"привет, "', 'token', 'spacer']);
  });

  it('элемент токена нередактируемый', () => {
    renderDoc(root, [anna], registry);

    expect((root.childNodes[1] as HTMLElement).contentEditable).toBe('false');
  });
});

describe('позиции', () => {
  const doc: ComposerDoc = [text('ab'), anna, general, text('cd')];

  beforeEach(() => renderDoc(root, doc, registry));

  it('в обе стороны совпадают на каждой позиции', () => {
    for (let position = 0; position <= 6; position++) {
      const [node, offset] = domPoint(root, position, registry);

      expect(positionFromDom(root, node, offset, registry)).toBe(position);
    }
  });

  it('точка внутри токена — к краю', () => {
    const token = root.childNodes[1] as HTMLElement;

    expect(positionFromDom(root, token.firstChild!, 0, registry)).toBe(2);
    expect(positionFromDom(root, token.firstChild!, 5, registry)).toBe(3);
  });

  it('точка на корне — по детям', () => {
    expect(positionFromDom(root, root, 0, registry)).toBe(0);
    expect(positionFromDom(root, root, root.childNodes.length, registry)).toBe(6);
  });

  it('пустой документ — корень', () => {
    renderDoc(root, [], registry);

    expect(domPoint(root, 0, registry)).toEqual([root, 0]);
  });
});

describe('readDocFromDom', () => {
  it('читает текст, токены и блоки браузера', () => {
    renderDoc(root, [text('раз'), anna], registry);

    const block = document.createElement('div');

    block.append('два', document.createElement('br'));
    root.append(block);

    expect(readDocFromDom(root, registry)).toEqual([text('раз'), anna, text('\nдва\n')]);
  });
});
