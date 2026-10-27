import { describe, expect, it } from 'vitest';

import { collapseBreadcrumbs } from './breadcrumbs-collapse';

describe('collapseBreadcrumbs', () => {
  it('короткий путь не сворачивается', () => {
    expect(collapseBreadcrumbs(4, 4)).toEqual({ before: [0, 1, 2, 3], hidden: [], after: [] });
    expect(collapseBreadcrumbs(0, 4)).toEqual({ before: [], hidden: [], after: [] });
  });

  it('длинный: корень, многоточие, хвост — всего maxItems элементов', () => {
    expect(collapseBreadcrumbs(6, 4)).toEqual({ before: [0], hidden: [1, 2, 3], after: [4, 5] });
  });

  it('на один длиннее лимита — сворачивает два, а не один', () => {
    const path = collapseBreadcrumbs(5, 4);

    expect(path.hidden).toHaveLength(2);
    expect(path.before.length + 1 + path.after.length).toBe(4);
  });

  it('itemsBefore оставляет больше начала, но место текущей странице остаётся', () => {
    expect(collapseBreadcrumbs(7, 4, 2)).toEqual({
      before: [0, 1],
      hidden: [2, 3, 4, 5],
      after: [6],
    });
    expect(collapseBreadcrumbs(7, 4, 10)).toEqual({
      before: [0, 1],
      hidden: [2, 3, 4, 5],
      after: [6],
    });
  });

  it('без начала: только многоточие и текущая', () => {
    expect(collapseBreadcrumbs(5, 3, 0)).toEqual({ before: [], hidden: [0, 1, 2], after: [3, 4] });
    expect(collapseBreadcrumbs(5, 2)).toEqual({ before: [], hidden: [0, 1, 2, 3], after: [4] });
  });

  it('лимит меньше двух считается двумя', () => {
    expect(collapseBreadcrumbs(3, 1)).toEqual({ before: [], hidden: [0, 1], after: [2] });
  });
});
