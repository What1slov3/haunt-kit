import { useEffect, useRef, useState, type KeyboardEvent, type ReactElement } from 'react';

import {
  BookOpen,
  Clapperboard,
  Hash,
  Images,
  Inbox,
  Plus,
  Radio,
  Send,
  Settings,
  User,
} from 'lucide-react';

import {
  AppShell,
  Avatar,
  AvatarGroup,
  Badge,
  Button,
  Center,
  ChatLayout,
  Field,
  FilteredImage,
  Heading,
  Icon,
  IconButton,
  Input,
  JumpToLatest,
  Masonry,
  MessageItem,
  MessageMedia,
  NavItem,
  PageLayout,
  PlaceHeader,
  RailItem,
  SettingsLayout,
  SpaceHeader,
  Spacer,
  Stack,
  Surface,
  Switch,
  Text,
  Textarea,
  ToggleGroup,
  useAppShell,
  type FilteredImageMode,
  type PlaceKind,
} from '@haunt/ui';
import { ImageTransition, type ImageTransitionEffect } from '@haunt/ui/fx';

import { photoList, photos, videos } from '../../lib/stories/demo-photos';

import styles from './space-demo.module.css';

/*
 * Демо-пространство: оболочка, места разных видов и страницы — всё из кита, без своих цветов и отступов.
 * Состояние — useState прямо здесь: это витрина, а не приложение; сервер изображают константы.
 */

type PlaceId = 'design' | 'evening' | 'cinema' | 'gallery' | 'about' | 'settings';

interface Place {
  id: PlaceId;
  name: string;
  kind: PlaceKind;
  topic?: string;
  section: string;
  icon: typeof Hash;
}

const places: Place[] = [
  {
    id: 'design',
    name: 'дизайн',
    kind: 'stream',
    topic: 'Шапки, лейауты и галерея: решения переносим в артефакты',
    section: 'Потоки',
    icon: Hash,
  },
  {
    id: 'evening',
    name: 'вечерний созвон',
    kind: 'scene',
    topic: 'По пятницам с восьми',
    section: 'Сцены',
    icon: Radio,
  },
  {
    id: 'cinema',
    name: 'кино',
    kind: 'screen',
    topic: 'Смотрим вместе и крутим фильтры',
    section: 'Сцены',
    icon: Clapperboard,
  },
  {
    id: 'gallery',
    name: 'галерея',
    kind: 'shelf',
    topic: 'Кадры участников',
    section: 'Полки',
    icon: Images,
  },
  { id: 'about', name: 'о пространстве', kind: 'shelf', section: 'Полки', icon: BookOpen },
];

const people = [
  { name: 'Мария Орлова', status: 'online' as const, src: photos.aurora.src },
  { name: 'Иван Лебедев', status: 'online' as const, src: photos.crab.src },
  { name: 'Аня', status: 'idle' as const, src: photos.bokeh.src },
  { name: 'Лев', status: 'offline' as const },
];

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

interface Message {
  id: number;
  author: string;
  at: string;
  text: string;
  media?: 'photos' | 'video';
}

const initialMessages: Message[] = [
  {
    id: 1,
    author: 'Мария Орлова',
    at: minutesAgo(52),
    text: 'Собрала шапки пространства и места — гляньте до вечера?',
  },
  {
    id: 2,
    author: 'Мария Орлова',
    at: minutesAgo(51),
    text: 'Кадры для обложек — тут',
    media: 'photos',
  },
  {
    id: 3,
    author: 'Иван Лебедев',
    at: minutesAgo(40),
    text: 'Северное сияние на обложку — однозначно.',
  },
  {
    id: 4,
    author: 'Аня',
    at: minutesAgo(31),
    text: 'А это для фона в кинозале, NASA не против',
    media: 'video',
  },
  {
    id: 5,
    author: 'Иван Лебедев',
    at: minutesAgo(12),
    text: 'Перенёс решение в артефакт, ссылка в закрепе.',
  },
];

const avatarOf = (name: string) => people.find((person) => person.name === name);

function Rail() {
  return (
    <Stack gap={2} align="center" py={2} style={{ width: 56 }}>
      <RailItem label="Личные сообщения" variant="accent">
        <Icon icon={Inbox} />
      </RailItem>

      <RailItem label="Холмы" active>
        <Avatar name="Холмы" src={photos.ridge.src} shape="rounded" size="lg" />
      </RailItem>

      <RailItem label="Ночное небо" unread={3}>
        <Avatar name="Ночное небо" src={photos.nebula.src} shape="rounded" size="lg" />
      </RailItem>

      <RailItem label="Город" unread>
        <Avatar name="Город" src={photos.city.src} shape="rounded" size="lg" />
      </RailItem>

      <RailItem label="Новое пространство" variant="ghost">
        <Icon icon={Plus} />
      </RailItem>
    </Stack>
  );
}

function Sidebar({ place, onPlace }: { place: PlaceId; onPlace: (id: PlaceId) => void }) {
  const shell = useAppShell();
  const sections = [...new Set(places.map((item) => item.section))];

  const open = (id: PlaceId) => {
    onPlace(id);
    shell.closeSheet();
  };

  return (
    <Surface level={1} panel border={false} radius="none" className={styles.sidebar}>
      <Stack gap={0} p={2} grow>
        <div className={styles.spaceTitle}>
          <Avatar name="Холмы" src={photos.ridge.src} shape="rounded" size="sm" />

          <Text weight="semibold">Холмы</Text>
        </div>

        {sections.map((section) => (
          <Stack key={section} gap={0}>
            <Heading level={4} overline className={styles.section}>
              {section}
            </Heading>

            {places
              .filter((item) => item.section === section)
              .map((item) => (
                <NavItem
                  key={item.id}
                  icon={<Icon icon={item.icon} size="sm" />}
                  active={place === item.id}
                  hasUnread={item.id === 'gallery'}
                  description={item.id === 'evening' ? '3 в эфире' : undefined}
                  onClick={() => open(item.id)}
                >
                  {item.name}
                </NavItem>
              ))}
          </Stack>
        ))}

        <Spacer />

        <NavItem
          icon={<Icon icon={Settings} size="sm" />}
          active={place === 'settings'}
          onClick={() => open('settings')}
        >
          Настройки
        </NavItem>
      </Stack>
    </Surface>
  );
}

function Members() {
  return (
    <Surface level={1} panel border={false} radius="none">
      <Stack gap={0} p={2}>
        <Heading level={4} overline className={styles.section}>
          В пространстве — {people.length}
        </Heading>

        {people.map((person) => (
          <NavItem
            key={person.name}
            icon={<Avatar name={person.name} src={person.src} status={person.status} size="sm" />}
            muted={person.status === 'offline'}
          >
            {person.name}
          </NavItem>
        ))}
      </Stack>
    </Surface>
  );
}

function Chat() {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState('');
  const [unread, setUnread] = useState(0);
  const feed = useRef<HTMLDivElement>(null);

  // Своё сообщение — сразу вниз ленты, как в любом мессенджере
  useEffect(() => {
    feed.current?.scrollTo({ top: feed.current.scrollHeight });
  }, [messages.length]);

  const send = () => {
    const text = draft.trim();

    if (!text) return;

    setMessages((current) => [
      ...current,
      { id: current.length + 1, author: 'Вы', at: new Date().toISOString(), text },
    ]);
    setDraft('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') send();
  };

  return (
    <ChatLayout
      composer={
        <div className={styles.composer}>
          <Input
            placeholder="Написать в #дизайн — Enter отправляет"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            fullWidth
          />

          <IconButton label="Отправить" variant="accent" onClick={send}>
            <Icon icon={Send} size="sm" />
          </IconButton>
        </div>
      }
      overlay={
        <JumpToLatest
          visible={unread > 0}
          count={unread}
          onJump={() => {
            setUnread(0);
            feed.current?.scrollTo({ top: feed.current.scrollHeight, behavior: 'smooth' });
          }}
        />
      }
    >
      <div
        ref={feed}
        className={styles.feed}
        onScroll={(event) => {
          const node = event.currentTarget;

          if (node.scrollHeight - node.scrollTop - node.clientHeight < 40) setUnread(0);
          else if (unread === 0) setUnread(2);
        }}
      >
        {messages.map((message, index) => {
          const previous = messages[index - 1];
          const person = avatarOf(message.author);

          return (
            <MessageItem
              key={message.id}
              author={message.author}
              avatar={<Avatar name={message.author} src={person?.src} size="lg" shape="rounded" />}
              timestamp={message.at}
              grouped={previous?.author === message.author}
              attachments={
                message.media === 'photos' ? (
                  <MessageMedia
                    items={[photos.aurora, photos.clouds, photos.city].map((photo) => ({
                      src: photo.src,
                      alt: photo.alt,
                      width: photo.width,
                      height: photo.height,
                      name: `${photo.alt}.jpg`,
                    }))}
                  />
                ) : message.media === 'video' ? (
                  <MessageMedia
                    items={[
                      {
                        src: videos.ocean.src,
                        kind: 'video',
                        type: 'video/webm',
                        width: videos.ocean.width,
                        height: videos.ocean.height,
                        alt: videos.ocean.alt,
                        name: 'ocean.webm',
                      },
                    ]}
                  />
                ) : undefined
              }
            >
              {message.text}
            </MessageItem>
          );
        })}
      </div>
    </ChatLayout>
  );
}

function Scene() {
  const [joined, setJoined] = useState(false);
  const here = joined
    ? [...people.slice(0, 3), { name: 'Вы', status: 'online' as const }]
    : people.slice(0, 3);

  return (
    <Center fill className={styles.scene}>
      <Stack gap={3} align="center">
        <AvatarGroup items={here} size="lg" max={5} />

        <Heading level={2} size="lg">
          {joined ? 'Вы в эфире' : `${here.length} в эфире`}
        </Heading>

        <Text tone="muted">Вечерний созвон: по пятницам с восьми, без повестки.</Text>

        <Button variant={joined ? 'secondary' : 'accent'} onClick={() => setJoined(!joined)}>
          {joined ? 'Выйти' : 'Войти'}
        </Button>
      </Stack>
    </Center>
  );
}

const cinemaModes = ['none', 'pixel', 'dither', 'halftone', 'ascii', 'crt'] as const;

function Cinema() {
  const [mode, setMode] = useState<(typeof cinemaModes)[number]>('dither');

  return (
    <PageLayout width="wide">
      <Stack gap={3}>
        <ToggleGroup.Root
          type="single"
          size="sm"
          value={mode}
          aria-label="Фильтр экрана"
          onValueChange={(next) => next && setMode(next as typeof mode)}
        >
          {cinemaModes.map((item) => (
            <ToggleGroup.Item key={item} value={item}>
              {item === 'none' ? 'без фильтра' : item}
            </ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>

        {mode === 'none' ? (
          <video
            src={videos.ocean.src}
            autoPlay
            muted
            loop
            playsInline
            className={styles.screen}
            aria-label={videos.ocean.alt}
          />
        ) : (
          <FilteredImage
            src={videos.ocean.src}
            media="video"
            alt={videos.ocean.alt}
            mode={mode as FilteredImageMode}
            className={styles.screen}
          />
        )}

        <Text size="sm" tone="muted">
          Течения океана — NASA Perpetual Ocean, общественное достояние. Фильтр считается покадрово
          на WebGL, без него — на Canvas.
        </Text>
      </Stack>
    </PageLayout>
  );
}

const effects: ImageTransitionEffect[] = ['fade', 'reveal', 'wipe', 'focus'];

function Gallery() {
  const [index, setIndex] = useState(0);
  const photo = photoList[index % photoList.length]!;

  useEffect(() => {
    const timer = setInterval(() => setIndex((current) => current + 1), 3500);

    return () => clearInterval(timer);
  }, []);

  return (
    <PageLayout width="wide">
      <ImageTransition
        src={photo.src}
        alt={photo.alt}
        effect={effects[index % effects.length]}
        aspectRatio="21 / 9"
        radius="xl"
      />

      <Text size="sm" tone="muted">
        {photo.alt} · переход {effects[index % effects.length]}
      </Text>

      <Masonry minColumnWidth={220}>
        {photoList.map((item) => (
          <img key={item.src} src={item.src} alt={item.alt} className={styles.tile} />
        ))}
      </Masonry>
    </PageLayout>
  );
}

function About() {
  return (
    <PageLayout
      header={
        <SpaceHeader
          name="Холмы"
          address="haunt.chat/s/hills"
          description="Вечерние созвоны, походы по выходным и доска идей. Новичкам — в #знакомство."
          iconSrc={photos.ridge.src}
          banner={photos.clouds.src}
          members={1204}
          online={48}
          tags={['походы', 'созвоны', 'фото']}
          actions={<Button variant="accent">Вступить</Button>}
        />
      }
      aside={
        <Surface level={1} border className={styles.card}>
          <Stack gap={2}>
            <Heading level={2} size="sm">
              Ближайшее
            </Heading>

            <Text size="sm">Поход на хребет — суббота, 9:00</Text>

            <Badge tone="success" bracket>
              12 идут
            </Badge>
          </Stack>
        </Surface>
      }
      asideLabel="Ближайшее"
    >
      {[photos.aurora, photos.city, photos.orb].map((photo, index) => (
        <Surface key={photo.src} level={1} border className={styles.post}>
          <img src={photo.src} alt={photo.alt} className={styles.postImage} />

          <Stack gap={1} p={4}>
            <Text weight="semibold">
              {['Как мы снимали сияние', 'Город с крыши', 'Восход с орбиты'][index]}
            </Text>

            <Text size="sm" tone="muted">
              {photo.alt}. Пост из ленты пространства: обложка во всю ширину карточки, текст — с
              полями.
            </Text>
          </Stack>
        </Surface>
      ))}
    </PageLayout>
  );
}

const savedProfile = { name: 'Вы', bio: 'Снимаю небо', mentions: true };

function Preferences() {
  const [saved, setSaved] = useState(savedProfile);
  const [draft, setDraft] = useState(savedProfile);
  const unsaved = JSON.stringify(draft) !== JSON.stringify(saved);

  return (
    <SettingsLayout
      title="Профиль"
      description="Так тебя видят в пространствах."
      nav={
        <NavItem active icon={<Icon icon={User} size="sm" />}>
          Профиль
        </NavItem>
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

const screens: Record<PlaceId, () => ReactElement> = {
  design: Chat,
  evening: Scene,
  cinema: Cinema,
  gallery: Gallery,
  about: About,
  settings: Preferences,
};

/** Пространство «Холмы» целиком: переключение мест слева меняет экран справа */
export function SpaceDemo() {
  const [place, setPlace] = useState<PlaceId>('design');
  const current = places.find((item) => item.id === place);
  const Screen = screens[place];

  return (
    <AppShell
      rail={<Rail />}
      sidebar={<Sidebar place={place} onPlace={setPlace} />}
      members={<Members />}
      header={
        <PlaceHeader
          name={current?.name ?? 'настройки'}
          kind={current?.kind}
          icon={current ? undefined : <Icon icon={Settings} size="sm" />}
          topic={current?.topic}
          live={
            place === 'evening'
              ? { count: 3, people: people.slice(0, 3), onJoin: () => undefined }
              : undefined
          }
        />
      }
    >
      <Surface level={2} panel border={false} radius="none" className={styles.content}>
        <Screen />
      </Surface>
    </AppShell>
  );
}
