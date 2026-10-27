import { useState } from 'react';

import { Bell, Hash, Pin, Users } from 'lucide-react';

import { Avatar } from '../avatar/avatar';
import { Chip } from '../chip/chip';
import { Heading } from '../heading/heading';
import { Icon } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';
import { Inline } from '../inline/inline';
import { Spacer } from '../spacer/spacer';
import { Stack } from '../stack/stack';
import { Surface } from '../surface/surface';
import { Text } from '../text/text';
import { ThemeProvider } from '../theme/theme-provider';
import { Tooltip } from '../tooltip/tooltip';

import styles from './docs-blocks.module.css';

/*
 * Живые примеры страницы «Как собирать экраны». Код в MDX рядом повторяет их один в один —
 * если правите пример, правьте и код на странице. ThemeProvider — ради подсказок (провайдер Radix).
 */

export function ChannelHeaderExample() {
  return (
    <ThemeProvider>
      <div className={styles.example}>
        <Surface level={3} panel px={3} py={2}>
          <Inline gap={2}>
            <Icon icon={Hash} />

            <Heading level={2} size="md" truncate>
              general
            </Heading>

            <Text size="sm" tone="muted" truncate>
              Обо всём понемногу
            </Text>

            <Spacer />

            <Inline gap={0.5}>
              {[
                { label: 'Закреплённые', icon: Pin },
                { label: 'Уведомления', icon: Bell },
                { label: 'Участники', icon: Users },
              ].map((action) => (
                <Tooltip key={action.label} content={action.label}>
                  <IconButton label={action.label} size="sm">
                    <Icon icon={action.icon} size="sm" />
                  </IconButton>
                </Tooltip>
              ))}
            </Inline>
          </Inline>
        </Surface>
      </div>
    </ThemeProvider>
  );
}

export function MessageExample() {
  const [mine, setMine] = useState(false);

  return (
    <ThemeProvider>
      <div className={styles.example}>
        <Inline gap={3} align="start">
          <Avatar name="Мария Орлова" status="online" />

          <Stack gap={1} grow>
            <Inline gap={2} align="baseline">
              <Text weight="semibold">Мария Орлова</Text>

              <Text size="xs" tone="subtle" mono>
                12:40
              </Text>
            </Inline>

            <Text size="lg" wrap>
              Собрала экран из примитивов: ни одного своего цвета, только токены.
            </Text>

            <Inline gap={1}>
              <Chip
                icon="🔥"
                count={mine ? 13 : 12}
                selected={mine}
                onClick={() => setMine(!mine)}
                size="sm"
              />
            </Inline>
          </Stack>
        </Inline>
      </div>
    </ThemeProvider>
  );
}
