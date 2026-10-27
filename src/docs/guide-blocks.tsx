import { useState, type ReactNode } from 'react';

import { MessagesSquare, PanelLeft, Send, Users } from 'lucide-react';

import {
  AccentScope,
  AppShell,
  Avatar,
  Breadcrumbs,
  Button,
  DateDivider,
  Field,
  Icon,
  IconButton,
  Inline,
  Input,
  Markdown,
  MessageItem,
  NavItem,
  RailItem,
  Stack,
  Surface,
  Text,
  ToggleGroup,
  UnreadDivider,
  groupMessages,
  toast,
  useAppShell,
  useTheme,
  type AccentName,
} from '@haunt/ui';

import styles from './docs-blocks.module.css';

/*
 * Живые примеры руководства. Каждый — в рамке `skip-toc`: заголовки внутри примера не попадают в
 * оглавление страницы. Код рядом на странице — тот же, что здесь, поэтому пример и текст не расходятся.
 */
export function Demo({ children, height }: { children: ReactNode; height?: number }) {
  return (
    <div className={`sb-unstyled skip-toc ${styles.demo}`} style={{ height }}>
      {children}
    </div>
  );
}

function ShellHeader() {
  const shell = useAppShell();

  return (
    <Inline
      align="center"
      gap={2}
      px={3}
      style={{ height: 40, borderBottom: '1px solid var(--border)' }}
    >
      <IconButton
        label="Потоки"
        size="sm"
        active={shell.sidebar === 'docked'}
        onClick={shell.toggleSidebar}
      >
        <Icon icon={PanelLeft} size="sm" />
      </IconButton>

      <Breadcrumbs items={[{ label: 'Haunt', href: '#' }, { label: 'общий' }]} />

      <span style={{ flex: 1 }} />

      <IconButton
        label="Участники"
        size="sm"
        active={shell.members === 'docked'}
        onClick={shell.toggleMembers}
      >
        <Icon icon={Users} size="sm" />
      </IconButton>
    </Inline>
  );
}

/** «Быстрый старт»: первый экран — оболочка, рейл, сайдбар и контент */
export function FirstScreen() {
  return (
    <Demo height={340}>
      <AppShell
        rail={
          <Stack gap={2} align="center" py={2} style={{ width: 56 }}>
            <RailItem label="Haunt" active>
              <Avatar name="Haunt" shape="rounded" size="lg" />
            </RailItem>

            <RailItem label="Дизайн" unread>
              <Avatar name="Дизайн" shape="rounded" size="lg" />
            </RailItem>
          </Stack>
        }
        sidebar={
          <Surface level={1} panel border={false} radius="none">
            <Stack gap={0} p={2}>
              {['общий', 'новости', 'вопросы'].map((name, index) => (
                <NavItem
                  key={name}
                  icon={<Icon icon={MessagesSquare} size="sm" />}
                  active={index === 0}
                >
                  {name}
                </NavItem>
              ))}
            </Stack>
          </Surface>
        }
        members={
          <Surface level={1} panel border={false} radius="none">
            <Stack gap={0} p={2}>
              {['Мария Орлова', 'Аня'].map((name) => (
                <NavItem key={name} icon={<Avatar name={name} size="sm" status="online" />}>
                  {name}
                </NavItem>
              ))}
            </Stack>
          </Surface>
        }
        header={<ShellHeader />}
        breakpoints={{ members: 720, sidebar: 480 }}
      >
        <Surface level={2} panel border={false} radius="none">
          <Stack gap={2} p={4}>
            <Text>Контент получает всё, что не заняли панели.</Text>

            <Text tone="muted">Потяните желоб между островами или сузьте окно.</Text>
          </Stack>
        </Surface>
      </AppShell>
    </Demo>
  );
}

/** «Как пользоваться»: тема и уровень эффектов из useTheme */
export function ThemeControls() {
  const { theme, toggleTheme, effects, setEffects } = useTheme();

  return (
    <Demo>
      <Inline gap={3} align="center" wrap>
        <Button variant="secondary" onClick={toggleTheme}>
          Тема: {theme === 'dark' ? 'тёмная' : 'светлая'}
        </Button>

        <ToggleGroup.Root
          type="single"
          size="sm"
          value={effects}
          aria-label="Уровень эффектов"
          onValueChange={(next) => next && setEffects(next as typeof effects)}
        >
          {(['off', 'subtle', 'rich'] as const).map((level) => (
            <ToggleGroup.Item key={level} value={level}>
              {level}
            </ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>
      </Inline>
    </Demo>
  );
}

const accents: AccentName[] = ['violet', 'teal', 'amber', 'rose'];

/** «Как пользоваться»: акцент пространства на контейнере */
export function AccentDemo() {
  const [accent, setAccent] = useState<AccentName>('teal');

  return (
    <Demo>
      <Stack gap={3}>
        <Inline gap={1.5} wrap>
          {accents.map((name) => (
            <Button
              key={name}
              size="sm"
              variant={name === accent ? 'secondary' : 'ghost'}
              onClick={() => setAccent(name)}
            >
              {name}
            </Button>
          ))}
        </Inline>

        <AccentScope accent={accent}>
          <Inline gap={2} align="center">
            <Button variant="accent">Вступить</Button>

            {/* Пункт рейла тянется на ширину колонки рейла — здесь колонка в его плитку */}
            <span style={{ width: 48 }}>
              <RailItem label="Пространство" active>
                <Avatar name="Пространство" shape="rounded" size="lg" />
              </RailItem>
            </span>

            <Text tone="muted">— акцент меняется только внутри AccentScope</Text>
          </Inline>
        </AccentScope>
      </Stack>
    </Demo>
  );
}

/** «Как пользоваться»: поле формы по соглашению кита */
export function FieldDemo() {
  const [name, setName] = useState('');
  const invalid = name.length > 0 && name.length < 3;

  return (
    <Demo>
      <Stack gap={4} style={{ maxWidth: 360 }}>
        <Field
          label="Имя пространства"
          hint="Его видят все участники"
          error={invalid ? 'Не короче трёх знаков' : undefined}
          count={name.length}
          maxLength={32}
        >
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            invalid={invalid}
            placeholder="Haunt"
          />
        </Field>

        <Inline gap={2}>
          <Button
            variant="accent"
            disabled={name.length < 3}
            onClick={() => toast.success(`Создано: ${name}`)}
          >
            Создать
          </Button>

          <Button variant="ghost" onClick={() => setName('')}>
            Сбросить
          </Button>
        </Inline>
      </Stack>
    </Demo>
  );
}

const feed = [
  {
    id: 'a',
    author: 'Ада',
    color: 'var(--success)',
    at: '2026-10-26T18:01:00',
    text: 'Созвон в девять?',
  },
  {
    id: 'b',
    author: 'Ада',
    color: 'var(--success)',
    at: '2026-10-26T18:02:00',
    text: 'Я возьму доску.',
  },
  {
    id: 'c',
    author: 'Лев',
    color: 'var(--info)',
    at: '2026-10-27T10:15:00',
    text: 'Буду **к началу**.',
  },
  { id: 'd', author: 'Лев', color: 'var(--info)', at: '2026-10-27T10:16:00', text: 'И пиццу.' },
];

/** «Как пользоваться»: лента — группы, след автора, разделители */
export function FeedDemo() {
  const grouped = groupMessages(feed, { author: (m) => m.author, time: (m) => m.at });

  return (
    <Demo>
      <div data-message-list="" style={{ maxWidth: 560 }}>
        {feed.map((message, index) => (
          <div key={message.id}>
            {(index === 0 || message.at.slice(0, 10) !== feed[index - 1]!.at.slice(0, 10)) && (
              <DateDivider
                date={message.at}
                now="2026-10-27T12:00:00"
                style={{ padding: '4px 16px' }}
              />
            )}

            {message.id === 'c' && <UnreadDivider count={2} style={{ padding: '2px 16px' }} />}

            <MessageItem
              author={message.author}
              authorColor={message.color}
              avatar={<Avatar name={message.author} size="lg" shape="rounded" />}
              timestamp={message.at}
              timeMode="time"
              grouped={grouped[index]}
              groupEnd={!grouped[index + 1]}
              actions={
                <IconButton label="Ответить" size="sm">
                  <Icon icon={Send} size="sm" />
                </IconButton>
              }
            >
              <Markdown>{message.text}</Markdown>
            </MessageItem>
          </div>
        ))}
      </div>
    </Demo>
  );
}
