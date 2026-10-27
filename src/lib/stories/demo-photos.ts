import aurora from './media/aurora.jpg';
import bokeh from './media/bokeh.jpg';
import city from './media/city.jpg';
import clouds from './media/clouds.jpg';
import crab from './media/crab.jpg';
import lichtspiel from './media/lichtspiel.webm';
import nebulaTall from './media/nebula-tall.jpg';
import ocean from './media/ocean.webm';
import orb from './media/orb.jpg';
import ridge from './media/ridge.jpg';

/*
 * Фотографии и видео для историй — CC0 и общественное достояние с Wikimedia Commons, авторы и ссылки —
 * `media/CREDITS.md`. Файлы лежат рядом и отдаются со своего origin: фильтры и переходы читают их пиксели.
 * Для крайних случаев (картинка 32×18, панорама 6:1) остаются генераторы `demo-scenes.ts`.
 */

export interface DemoPhoto {
  src: string;
  /** Подпись по содержанию — для `alt` и проверок историй */
  alt: string;
  width: number;
  height: number;
}

export const photos = {
  orb: { src: orb, alt: 'Светящийся шар над горизонтом', width: 1280, height: 850 },
  ridge: { src: ridge, alt: 'Горная гряда', width: 1280, height: 854 },
  city: { src: city, alt: 'Закат над городом', width: 1280, height: 720 },
  aurora: { src: aurora, alt: 'Северное сияние над озером', width: 1280, height: 850 },
  bokeh: { src: bokeh, alt: 'Огни не в фокусе', width: 1280, height: 853 },
  clouds: { src: clouds, alt: 'Оранжевые облака над горами', width: 1280, height: 853 },
  crab: { src: crab, alt: 'Крабовидная туманность', width: 960, height: 960 },
  nebula: { src: nebulaTall, alt: 'Туманность NGC 6357', width: 960, height: 1546 },
} satisfies Record<string, DemoPhoto>;

/** Все фотографии по порядку — для галерей и мозаик */
export const photoList: DemoPhoto[] = Object.values(photos);

export const videos = {
  ocean: { src: ocean, alt: 'Течения океана', width: 854, height: 480 },
  lichtspiel: {
    src: lichtspiel,
    alt: 'Абстрактный фильм Lichtspiel Opus I',
    width: 480,
    height: 360,
  },
};
