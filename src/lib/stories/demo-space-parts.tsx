import { Bell, MoreHorizontal, Pin, Search, UserPlus, Users } from 'lucide-react';

import { Button, Icon, IconButton, Tabs } from '@haunt/ui';

/* Действия и вкладки демо-пространства для историй шапок и лейаутов (данные — demo-space.ts) */

export function SpaceActions() {
  return (
    <>
      <Button size="sm" variant="secondary" iconStart={<Icon icon={UserPlus} size="sm" />}>
        Пригласить
      </Button>

      <Button size="sm" variant="accent">
        Вступить
      </Button>

      <IconButton label="Ещё" size="sm" variant="ghost">
        <Icon icon={MoreHorizontal} size="sm" />
      </IconButton>
    </>
  );
}

export function SpaceTabs() {
  return (
    <Tabs.Root defaultValue="feed">
      <Tabs.List aria-label="Разделы пространства">
        <Tabs.Trigger value="feed">Лента</Tabs.Trigger>
        <Tabs.Trigger value="places">Места</Tabs.Trigger>
        <Tabs.Trigger value="events">События</Tabs.Trigger>
        <Tabs.Trigger value="artifacts">Артефакты</Tabs.Trigger>
      </Tabs.List>
    </Tabs.Root>
  );
}

export function PlaceActions() {
  return (
    <>
      <IconButton label="Закреплённые" size="sm" variant="ghost">
        <Icon icon={Pin} size="sm" />
      </IconButton>

      <IconButton label="Уведомления" size="sm" variant="ghost">
        <Icon icon={Bell} size="sm" />
      </IconButton>

      <IconButton label="Участники" size="sm" variant="ghost">
        <Icon icon={Users} size="sm" />
      </IconButton>

      <IconButton label="Поиск" size="sm" variant="ghost">
        <Icon icon={Search} size="sm" />
      </IconButton>
    </>
  );
}
