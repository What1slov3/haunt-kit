import type { AchievementRarity } from '../achievement/achievement-rarity';
import type { AvatarStatus } from '../avatar/avatar';
import type { ContrastLevel } from '../color-picker/color';
import type { CountdownUnit } from '../countdown/countdown-math';
import type { EmojiCategoryId, EmojiItem } from '../emoji-picker/emoji-types';
import type { InboxFilter } from '../inbox/inbox';
import type { PasswordHint, PasswordScore } from '../password-strength/password-score';
import type { SignalFont } from '../signal-scope/signal-options';
import type { SortableMessages } from '../sortable-list/sortable-math';
import type { AccentName } from '../theme/accent';
import type { VoiceConnection } from '../voice-controls/voice-connection';

/*
 * Словарь кита разбит по компонентам, а не по общим словам. «Закрыть» диалога и «Закрыть» тоста на другом
 * языке могут разойтись («Close» / «Dismiss»), а в русском одно слово меняет род и падеж вместе с
 * соседом («Предыдущее» изображение, «Предыдущий» месяц). Ключ на компонент — перевод одного места не
 * ломает другое, а частичная перезапись точная: `{ toast: { close: 'Dismiss' } }`. Повторы внутри
 * словаря одного языка сняты общими константами в его файле, а не общими ключами.
 *
 * Строки с числом и параметрами — функции: порядок слов, падеж и множественное число решает язык,
 * а не компонент.
 */

/** id пресетов из defaultDateRangePresets */
export type DateRangePresetKey = 'today' | 'last-7-days' | 'last-30-days' | 'this-month';

export interface UiStrings {
  appShell: {
    sidebar: string;
    members: string;
    sidebarHandle: string;
    membersHandle: string;
  };
  attachmentCard: {
    complete: string;
    uploading: (name: string) => string;
    retry: string;
    cancelUpload: string;
    remove: (name: string) => string;
  };
  avatar: {
    status: Record<AvatarStatus, string>;
  };
  avatarGroup: {
    /** Подпись «+N» для скринридера: число и имена (уже обрезанные списком) */
    more: (count: number, names: string) => string;
    /** Хвост обрезанного списка имён в подсказке: «и ещё 3» */
    andMore: (count: number) => string;
  };
  banner: {
    dismiss: string;
  };
  breadcrumbs: {
    label: string;
    hidden: (count: number) => string;
  };
  browserTabs: {
    label: string;
    close: (label: string) => string;
    allTabs: string;
    pinned: string;
    unread: (count: number) => string;
    unreadDot: string;
    /** Подсказка у каждой вкладки (aria-describedby) */
    instructions: string;
    moved: (label: string, position: number, total: number) => string;
  };
  button: {
    /** Добавка к подписи кнопки с удержанием — читается сразу после неё, поэтому с разделителем */
    holdToConfirm: string;
  };
  calendar: {
    previousMonth: string;
    nextMonth: string;
  };
  codeBlock: {
    copy: string;
    copied: string;
  };
  colorPicker: {
    label: string;
    accents: Record<AccentName, string>;
    /** Вердикт контраста словами; уровень WCAG (AA, AAA) рядом остаётся кодом */
    contrast: Record<ContrastLevel, string>;
    /** Как подписать уровень AA-large рядом с вердиктом */
    aaLarge: string;
    custom: string;
    eyeDropper: string;
    hex: string;
    saturationBrightness: string;
    saturationBrightnessValue: (saturation: number, brightness: number) => string;
    hue: string;
  };
  combobox: {
    placeholder: string;
    searchPlaceholder: string;
    empty: string;
    emptyFor: (query: string) => string;
    more: (count: number) => string;
  };
  commandLine: {
    label: string;
    placeholder: string;
    suggestions: string;
    loading: string;
    /** Объявление скринридеру, сколько подсказок открылось */
    count: (count: number) => string;
  };
  commandPalette: {
    label: string;
    placeholder: string;
    empty: string;
    loading: string;
    loadFailed: string;
    recent: string;
    hintSelect: string;
    hintOpen: string;
    hintRun: string;
    hintBack: string;
    hintClose: string;
  };
  confirmDialog: {
    confirm: string;
    cancel: string;
    /** Текст вокруг слова, которое надо ввести: «Введите <слово>, чтобы подтвердить» */
    typeBefore: string;
    typeAfter: string;
  };
  copyButton: {
    copy: string;
    copied: string;
    failed: string;
  };
  copyField: {
    copy: string;
  };
  dataTable: {
    empty: string;
  };
  datePicker: {
    placeholder: string;
    clear: string;
    dialog: string;
  };
  dateRangePicker: {
    placeholder: string;
    clear: string;
    dialog: string;
    presetsLabel: string;
    presets: Record<DateRangePresetKey, string>;
  };
  dialog: {
    close: string;
  };
  dock: {
    label: string;
    unread: (count: number) => string;
  };
  emojiPicker: {
    dialog: string;
    search: string;
    sections: string;
    grid: string;
    loading: string;
    loadFailed: string;
    retry: string;
    empty: string;
    hint: string;
    recent: string;
    results: string;
    categories: Record<EmojiCategoryId, string>;
    /** Подпись эмодзи в предпросмотре и для скринридера; в наборе названия русские */
    emojiName: (emoji: EmojiItem) => string;
  };
  field: {
    /** Счётчик без лимита для скринридера: «12 символов» */
    count: (count: number) => string;
    /** Счётчик с лимитом: «12 из 190 символов» — на экране он «12/190», и читался бы как дробь */
    countOf: (count: number, max: number) => string;
  };
  fileDropzone: {
    title: string;
    titleMultiple: string;
    reject: string;
    maxSize: (size: string) => string;
    maxFiles: (count: number) => string;
    onlyOne: string;
    tooMany: (limit: number) => string;
    badType: (name: string) => string;
    tooBig: (name: string, size: string) => string;
    /** Единицы для formatBytes, по степеням 1024: Б, КБ, МБ, ГБ, ТБ */
    byteUnits: readonly string[];
  };
  fileDropOverlay: {
    /** Пока тянут файл над окном: что произойдёт, если отпустить */
    title: string;
    titleMultiple: string;
    reject: string;
  };
  floatingPanel: {
    collapse: string;
    expand: string;
    close: string;
    /** Подсказка у шапки-ручки (aria-describedby) */
    instructions: string;
    resize: string;
  };
  imageLightbox: {
    title: string;
    position: (index: number, total: number) => string;
    zoomOut: string;
    zoomReset: string;
    zoomIn: string;
    download: string;
    openOriginal: string;
    close: string;
    loading: string;
    loadFailed: string;
    previous: string;
    next: string;
  };
  inbox: {
    title: string;
    filters: Record<InboxFilter, string>;
    filterLabel: string;
    empty: Record<InboxFilter, { title: string; text: string }>;
    unread: (count: number) => string;
    markAllRead: string;
    /** Подпись ленты: заголовок и вкладка */
    listLabel: (title: string, filter: string) => string;
  };
  keyHints: {
    /** Объявление при показе подсказок */
    active: (count: number) => string;
  };
  label: {
    optional: string;
  };
  logView: {
    label: string;
    inputPlaceholder: string;
    input: (label: string) => string;
    newLines: string;
  };
  markdown: {
    spoiler: string;
  };
  mediaTile: {
    speaking: string;
    muted: string;
    deafened: string;
    pinned: string;
  };
  navItem: {
    unread: (count: number) => string;
  };
  notificationItem: {
    /** Начало строки для скринридера перед заголовком непрочитанного */
    unread: string;
    markRead: string;
  };
  numberInput: {
    increment: string;
    decrement: string;
  };
  pager: {
    label: string;
    /** Строка внизу страницы: «ещё (42%)»; рамка «-- … --» — знаками TUI в CSS */
    more: (percent: number) => string;
    end: string;
    hint: string;
  };
  pinInput: {
    label: string;
    cell: (index: number, total: number) => string;
  };
  railItem: {
    unread: (count: number) => string;
  };
  sheet: {
    close: string;
  };
  shortcutList: {
    or: string;
  };
  sortableList: SortableMessages & {
    handle: (label: string) => string;
  };
  spinner: {
    label: string;
  };
  stat: {
    up: string;
    down: string;
    flat: string;
  };
  tagInput: {
    list: string;
    remove: (tag: string) => string;
    added: (tags: readonly string[]) => string;
    removed: (tag: string) => string;
    max: (max: number) => string;
  };
  timePicker: {
    hour: string;
    minute: string;
    period: string;
    list: string;
    empty: string;
  };
  titleBar: {
    /** Подпись группы кнопок окна */
    label: string;
    minimize: string;
    maximize: string;
    restore: string;
    close: string;
  };
  toast: {
    close: string;
    /** Подпись области уведомлений; `{hotkey}` Radix заменяет на сочетание (F8) */
    region: string;
  };
  tour: {
    back: string;
    next: string;
    finish: string;
    skip: string;
    step: (index: number, total: number) => string;
  };
  tuiSpinner: {
    label: string;
  };
  tuiTable: {
    empty: string;
  };
  voiceMessage: {
    label: string;
    play: string;
    pause: string;
    retry: string;
    seek: string;
    position: (time: string, duration: string) => string;
    loadFailed: string;
    rate: (rate: number) => string;
  };
  // Волна 3: ввод
  richComposer: {
    label: string;
    placeholder: string;
    /** Подпись списка подсказок: `@` — участники, `#` — каналы, `:` — эмодзи */
    suggestions: Record<'mention' | 'channel' | 'emoji', string>;
    loading: string;
    empty: string;
    /** Объявление скринридеру: сколько подсказок и как выбрать */
    results: (count: number) => string;
    /** Сколько символов сверх лимита — фраза для скринридера рядом со счётчиком */
    overLimit: (count: number) => string;
  };
  searchQuery: {
    label: string;
    placeholder: string;
    /** Подпись списка чипов-фильтров */
    filters: string;
    /** Заголовок подсказок ключей (`from:`, `in:`) */
    keys: string;
    /** Заголовок подсказок значений ключа */
    values: (key: string) => string;
    remove: (filter: string) => string;
    added: (filter: string) => string;
    removed: (filter: string) => string;
    clear: string;
    loading: string;
    empty: string;
    results: (count: number) => string;
  };
  rangeSlider: {
    min: string;
    max: string;
  };
  inlineEdit: {
    /** Подпись текста-кнопки: значение и что будет по нажатию */
    edit: (value: string) => string;
    empty: string;
    input: string;
    saving: string;
    saveFailed: string;
  };
  keybindingRecorder: {
    none: string;
    recording: string;
    /** Подпись кнопки с текущим сочетанием */
    change: (combo: string) => string;
    record: string;
    clear: string;
    reset: string;
    conflict: (action: string) => string;
    /** Сочетание без модификатора; keys — модификаторы платформы через запятую */
    needsModifier: (keys: string) => string;
    cancelHint: string;
    recorded: (combo: string) => string;
  };
  wizard: {
    back: string;
    next: string;
    finish: string;
    steps: string;
    step: (index: number, total: number) => string;
    /** Проверка шага вернула false без своего текста */
    stepInvalid: string;
    finishFailed: string;
  };
  passwordStrength: {
    label: string;
    levels: Record<PasswordScore, string>;
    hintsLabel: string;
    hints: Record<Exclude<PasswordHint, 'tooShort'>, string> & {
      tooShort: (minLength: number) => string;
    };
  };
  // Волна 3: сообщество
  messageMedia: {
    /** Подпись списка вложений */
    label: (count: number) => string;
    /** Подпись вложения без alt и имени файла */
    item: (index: number, total: number) => string;
    gif: string;
    video: string;
    spoiler: string;
    /** Подпись закрытого спойлера для скринридера: что будет по нажатию */
    showSpoiler: string;
    /** Плитка «+N»: сколько вложений не поместилось */
    more: (count: number) => string;
    /** Пометка у превью, показанного фрагментом */
    cropped: string;
    loadFailed: string;
    retry: string;
  };
  reactionBar: {
    label: string;
    add: string;
    /** Реакция для скринридера: название, число, своя ли */
    reaction: (name: string, count: number, mine: boolean) => string;
    /** Подсказка «кто поставил»: имена уже обрезаны списком, `rest` — сколько не названо */
    who: (names: string, rest: number) => string;
  };
  reactionPicker: {
    dialog: string;
    quick: string;
  };
  profileCard: {
    roles: string;
    badges: string;
    about: string;
  };
  xpBar: {
    label: string;
    /** Единица рядом с числом: «XP» */
    unit: string;
    /** Значение полосы для скринридера */
    value: (xp: number, next: number) => string;
    levelUp: (level: number) => string;
    maxLevel: string;
  };
  levelBadge: {
    label: (level: number) => string;
    /** Короткая приставка на значке: «ур.»; пустая строка — только число */
    short: string;
  };
  achievement: {
    rarity: Record<AchievementRarity, string>;
    locked: string;
    unlocked: string;
    progress: (value: number, max: number) => string;
  };
  reputationMeter: {
    label: string;
    /** Изменение для скринридера: «выросла на 12», «упала на 5» */
    change: (delta: number) => string;
    history: string;
  };
  soundDesigner: {
    preset: string;
    category: string;
    categories: Record<'ui' | 'motif', string>;
    random: string;
    mood: string;
    moods: Record<'up' | 'down' | 'bell' | 'soft', string>;
    play: string;
    stop: string;
    waveform: string;
    mode: string;
    modes: Record<'voices' | 'steps', string>;
    voices: string;
    voice: (index: number) => string;
    addTone: string;
    addNoise: string;
    remove: (index: number) => string;
    kind: string;
    kinds: Record<'tone' | 'noise', string>;
    wave: string;
    waves: Record<'sine' | 'triangle' | 'square' | 'sawtooth' | 'pulse', string>;
    color: string;
    colors: Record<'white' | 'pink' | 'brown', string>;
    motion: string;
    pulseWidth: string;
    fmRatio: string;
    fmDepth: string;
    fmDepthEnd: string;
    vibrato: string;
    tremolo: string;
    wobble: string;
    depth: string;
    drive: string;
    off: string;
    cents: string;
    steps: string;
    instrument: string;
    instruments: Record<'mallet' | 'bell' | 'pluck' | 'chip' | 'pad', string>;
    root: string;
    scale: string;
    scales: Record<
      | 'major'
      | 'minor'
      | 'harmonic-minor'
      | 'major-pentatonic'
      | 'minor-pentatonic'
      | 'blues'
      | 'dorian'
      | 'phrygian'
      | 'lydian'
      | 'mixolydian'
      | 'chromatic',
      string
    >;
    octave: string;
    bpm: string;
    bpmUnit: string;
    stepCount: string;
    hitGain: string;
    ring: string;
    step: (index: number, note: string) => string;
    stepsHint: string;
    room: string;
    roomDecay: string;
    preDelay: string;
    brightness: string;
    width: string;
    mix: string;
    impulse: string;
    echo: string;
    echoTime: string;
    feedback: string;
    echoTone: string;
    seconds: string;
    frequency: string;
    note: string;
    glide: string;
    noGlide: string;
    delay: string;
    gain: string;
    attack: string;
    decay: string;
    filter: string;
    filterTypes: Record<'lowpass' | 'highpass' | 'bandpass', string>;
    hz: string;
    ms: string;
    stats: (duration: string, tail: string | null, gain: string, voices: number) => string;
    issues: {
      empty: string;
      voices: (max: number) => string;
      gain: string;
      duration: Record<'ui' | 'motif', string>;
      tail: (seconds: string) => string;
      harsh: (voice: number) => string;
    };
    normalize: string;
    spec: string;
  };
  spaceHeader: {
    members: (count: number) => string;
    online: (count: number) => string;
    tags: string;
  };
  placeHeader: {
    topic: string;
    live: (count: number) => string;
  };
  artifactHeader: {
    updated: string;
    origin: string;
    tags: string;
  };
  pageLayout: {
    aside: string;
  };
  chatLayout: {
    panel: string;
  };
  settingsLayout: {
    nav: string;
    unsaved: string;
    save: string;
    reset: string;
  };
  storeItemCard: {
    buy: string;
    owned: string;
    equipped: string;
    equip: string;
    unequip: string;
    unavailable: string;
    notEnough: string;
    price: (price: number) => string;
    /** Подпись превью: имя в цвете роли */
    preview: string;
    /** Текст сообщения в превью */
    previewText: string;
    /** Забрать заработанное: условие выполнено */
    claim: string;
    gift: string;
    tryOn: string;
    tryOff: string;
    /** Подпись прогресса для скринридера: «Прогресс: 60%» */
    progress: (percent: number) => string;
  };
  poll: {
    label: string;
    vote: string;
    retract: string;
    votes: (count: number) => string;
    voters: (count: number) => string;
    chooseOne: string;
    chooseMany: string;
    chooseUpTo: (max: number) => string;
    voted: string;
    yourVote: string;
    closed: string;
    anonymous: string;
    /** Перед относительным временем: «Завершится через 5 мин.» */
    endsIn: string;
    /** Перед относительным временем завершённого: «Завершён вчера в 12:40» */
    endedAt: string;
    /** Вариант с итогом для скринридера */
    option: (label: string, percent: number, votes: number) => string;
  };
  eventCard: {
    rsvp: string;
    going: string;
    maybe: string;
    attendees: (count: number) => string;
    live: string;
    ended: string;
    duration: (hours: number, minutes: number) => string;
    location: string;
  };
  inviteCard: {
    title: string;
    invitedBy: (name: string) => string;
    online: (count: number) => string;
    members: (count: number) => string;
    accept: string;
    joined: string;
    open: string;
    expired: string;
    invalid: string;
    /** Перед относительным временем: «Истекает через 2 ч» */
    expires: string;
  };
  voiceControls: {
    label: string;
    mute: string;
    deafen: string;
    screenShare: string;
    camera: string;
    leave: string;
    level: string;
    connection: Record<VoiceConnection, string>;
    ping: (ms: number) => string;
  };
  soundboard: {
    label: string;
    volume: string;
    playing: string;
    stopAll: string;
    empty: string;
  };
  countdown: {
    /** Число с единицей: «2 дня» — для скринридера */
    unit: Record<CountdownUnit, (count: number) => string>;
    /** Подпись под цифрами без числа: «дн.», «ч» */
    unitShort: Record<CountdownUnit, string>;
    done: string;
  };
  messageSkeleton: {
    label: string;
  };
  memberSkeleton: {
    label: string;
  };
  // Волна 3: данные
  chart: {
    empty: string;
    /** Сегмент кольца, в который свернулся хвост больше шести */
    other: string;
    total: string;
    /** Заголовок первого столбца скрытой таблицы данных */
    category: string;
    /** Подсказка у графика для скринридера: как ходить по точкам */
    keyboardHint: string;
    /** Озвучка точки: подпись категории и значения рядов, уже собранные списком Intl («Сообщения 120, Голос 30») */
    point: (title: string, values: string) => string;
  };
  heatmap: {
    label: string;
    /** Подсказка дня: «12 сообщений, 3 октября 2026 г.»; ноль — «Нет сообщений, …» */
    cell: (count: number, date: string) => string;
    less: string;
    more: string;
  };
  tree: {
    loadFailed: string;
    /** Объявление после перемещения: что, относительно чего и как */
    moved: (label: string, target: string, position: 'before' | 'after' | 'inside') => string;
    moveCancelled: string;
    /** Подсказка дерева с перетаскиванием (aria-describedby) */
    moveHint: string;
  };
  timeline: {
    label: string;
    today: string;
    yesterday: string;
    /** Кнопка свёрнутой группы: «+5 похожих» */
    similar: (count: number) => string;
    collapse: string;
  };
  calendarView: {
    today: string;
    previous: Record<'month' | 'week', string>;
    next: Record<'month' | 'week', string>;
    viewLabel: string;
    views: Record<'month' | 'week', string>;
    allDay: string;
    /** «ещё 3» в ячейке месяца */
    more: (count: number) => string;
    /** То же для скринридера, с датой */
    moreLabel: (count: number, date: string) => string;
    /** Подпись дня: «понедельник, 19 октября, 2 события» */
    dayLabel: (date: string, count: number) => string;
  };
  jsonInspector: {
    label: string;
    search: string;
    matches: (count: number) => string;
    noMatches: string;
    copyPath: string;
    copyValue: string;
    pathCopied: string;
    valueCopied: string;
    /** Свёрнутый массив и объект: «3 элемента», «5 ключей» */
    items: (count: number) => string;
    keys: (count: number) => string;
  };
  diffView: {
    oldLabel: string;
    newLabel: string;
    /** Свёртка: «Показать 12 неизменённых строк» */
    unchanged: (count: number) => string;
    noChanges: string;
    /** Начало изменённой строки для скринридера */
    added: string;
    removed: string;
    addedWords: string;
    removedWords: string;
    summary: (added: number, removed: number) => string;
  };
  descriptionList: {
    copy: (label: string) => string;
  };
  // Заморозка: недостающее
  passwordInput: {
    show: string;
    hide: string;
    /** Объявление скринридеру после переключения: фокус остаётся в поле, подпись кнопки он не услышит */
    shown: string;
    hidden: string;
    capsLock: string;
    /** Видимая метка в поле — название клавиши */
    capsLockShort: string;
  };
  imageCropper: {
    label: string;
    /** Описание области для скринридера: как двигать и масштабировать */
    hint: string;
    zoom: string;
    zoomIn: string;
    zoomOut: string;
    /** Значение ползунка масштаба: «150 %» */
    zoomValue: (percent: number) => string;
    loading: string;
    loadFailed: string;
    dialogTitle: string;
    save: string;
    cancel: string;
  };
  messageItem: {
    actions: string;
    /** Пометка «изменено» после текста */
    edited: string;
    /** Подсказка над пометкой: точное время правки */
    editedAt: (date: string) => string;
    deleted: string;
    pending: string;
    failed: string;
    retry: string;
    editing: string;
  };
  replyPreview: {
    /** Начало подписи цитаты в сообщении для скринридера */
    replyTo: string;
    /** Над композером: «Ответ пользователю Имя» */
    replyingTo: string;
    attachment: string;
    attachments: (count: number) => string;
    deleted: string;
    cancel: string;
  };
  unreadDivider: {
    short: string;
    shortCount: (count: number) => string;
    label: string;
    labelCount: (count: number) => string;
  };
  jumpToLatest: {
    label: string;
    count: (count: number) => string;
    withCount: (count: number) => string;
  };
  // Стиль «сигнал»
  barcode: {
    /** Подпись для скринридера: штрихи не читаются, читается строка */
    label: (value: string) => string;
  };
  qrCode: {
    label: (value: string) => string;
  };
  signalScope: {
    /** Названия шрифтов для переключателя; ширина начертания — словом языка */
    fonts: Record<SignalFont, string>;
  };
}

/**
 * Частичная перезапись: любой уровень можно опустить. Функции и массивы заменяются целиком —
 * склеить половину функции нельзя.
 */
export type UiStringsOverride = DeepPartial<UiStrings>;

type DeepPartial<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly unknown[]
    ? T
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T;
