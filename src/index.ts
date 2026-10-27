/*
 * Публичный API @haunt/ui. Глобальные стили — отдельно, `@haunt/ui/styles` (один раз в точке входа),
 * пресеты Motion — `@haunt/ui/motion`. Пакет без побочных эффектов (кроме CSS): что не импортировано —
 * не попадает в сборку вместе со своим CSS.
 */

// Тема
export {
  AccentScope,
  accentPresets,
  accentStyle,
  applyEffects,
  applyTheme,
  getCurrentEffects,
  getCurrentTheme,
  initEffects,
  initTheme,
  PortalContainerContext,
  readToken,
  resolveAccent,
  setTokens,
  ThemeProvider,
  ThemeScope,
  TOKEN_DEFAULTS,
  TOKEN_VARS,
  tokenProperty,
  tokens,
  TokenScope,
  tokenStyle,
  tokenVar,
  usePortalContainer,
  useTheme,
  type AccentName,
  type AccentPreset,
  type AccentScopeProps,
  type EffectsLevel,
  type Theme,
  type ThemeProviderProps,
  type ThemeScopeProps,
  type TokenKey,
  type TokenProperty,
  type TokenScopeProps,
  type TokenValues,
} from './theme';

// Утилиты
export { cx } from './lib/cx';
export type { Radius, Space } from './lib/space';

// Раскладка
export { Box, type BoxProps } from './box/box';
export { Stack, type StackProps } from './stack/stack';
export { Inline, type InlineProps } from './inline/inline';
export { Grid, type GridProps } from './grid/grid';
export { Container, type ContainerProps, type ContainerSize } from './container/container';
export { Spacer, type SpacerProps } from './spacer/spacer';
export { Center, type CenterProps } from './center/center';
export { WithSidebar, type WithSidebarProps } from './with-sidebar/with-sidebar';
export { Switcher, type SwitcherProps } from './switcher/switcher';
export { Reel, type ReelProps } from './reel/reel';
export { Bleed, type BleedProps } from './bleed/bleed';
export { Layer, LayerItem, type LayerItemProps, type LayerPlace } from './layer/layer';
export { Sticky, type StickyProps } from './sticky/sticky';
export { Masonry, type MasonryProps } from './masonry/masonry';
export {
  masonryColumns,
  masonryLayout,
  type MasonryPosition,
  type MasonryResult,
} from './masonry/masonry-layout';
export { PageLayout, type PageLayoutProps } from './page-layout/page-layout';
export { ChatLayout, type ChatLayoutProps } from './chat-layout/chat-layout';
export { SettingsLayout, type SettingsLayoutProps } from './settings-layout/settings-layout';

// Текст
export { Text, type TextProps, type TextSize, type TextTone, type TextWeight } from './text/text';
export { Heading, type HeadingLevel, type HeadingProps, type HeadingSize } from './heading/heading';
export { Link, type LinkProps } from './link/link';
export { Kbd, type KbdProps } from './kbd/kbd';
export { Caret, type CaretProps } from './caret/caret';
export { TypingDots, type TypingDotsProps } from './typing-dots/typing-dots';

// Иконки и кнопки
export { Icon, type IconProps, type IconSize } from './icon/icon';
export { Button, type ButtonProps, type ButtonSize, type ButtonVariant } from './button/button';
export { ButtonGroup, type ButtonGroupProps } from './button-group/button-group';
export {
  IconButton,
  type IconButtonProps,
  type IconButtonSize,
  type IconButtonVariant,
} from './icon-button/icon-button';
export { Toggle, type ToggleProps } from './toggle/toggle';
export { ToggleGroup } from './toggle-group/toggle-group';
export { Spinner, type SpinnerProps } from './spinner/spinner';

// Поля
export { Field, type FieldProps } from './field/field';
export { FieldFrame, type FieldFrameProps, type FieldFrameSize } from './field-frame/field-frame';
export { Label, type LabelProps } from './label/label';
export { Input, type InputProps, type InputSize } from './input/input';
export { Textarea, type TextareaProps } from './textarea/textarea';
export { Select } from './select/select';
export { Switch, type SwitchProps } from './switch/switch';
export { Checkbox, type CheckboxProps } from './checkbox/checkbox';
export { RadioGroup } from './radio-group/radio-group';
export { Slider, type SliderProps } from './slider/slider';

// Отображение
export { Avatar, type AvatarProps, type AvatarSize, type AvatarStatus } from './avatar/avatar';
export { Badge, type BadgeProps, type BadgeTone } from './badge/badge';
export { Chip, type ChipProps } from './chip/chip';
export { Divider, type DividerProps } from './divider/divider';
export { Skeleton, type SkeletonProps } from './skeleton/skeleton';
export { Progress, type ProgressProps } from './progress/progress';
export { Callout, type CalloutProps, type CalloutTone } from './callout/callout';
export { EmptyState, type EmptyStateProps } from './empty-state/empty-state';
export { StatusBar } from './status-bar/status-bar';
export { Banner, type BannerProps, type BannerVariant } from './banner/banner';

// Карточки и блоки документации (в духе Fumadocs)
export { Card, CardGrid, type CardGridProps, type CardProps } from './card/card';
export { Steps, type StepsItemProps, type StepsRootProps } from './steps/steps';
export { CodeBlock, type CodeBlockProps } from './code-block/code-block';
export {
  FileTree,
  type FileTreeFileProps,
  type FileTreeFolderProps,
  type FileTreeRootProps,
} from './file-tree/file-tree';

// Медиа
export {
  FilteredImage,
  type FilteredImageMedia,
  type FilteredImageMode,
  type FilteredImageProps,
  type FilteredImageReveal,
} from './filtered-image/filtered-image';
export type { FilteredImageOptions } from './filtered-image/modes';

// Списки и навигация
export { NavItem, type NavItemProps } from './nav-item/nav-item';
export { RailItem, type RailItemProps } from './rail-item/rail-item';
export { Collapsible } from './collapsible/collapsible';
export { Accordion } from './accordion/accordion';
export { Tabs } from './tabs/tabs';

// Всплывающее
export { Tooltip, type TooltipProps } from './tooltip/tooltip';
export { DropdownMenu } from './dropdown-menu/dropdown-menu';
export { ContextMenu } from './context-menu/context-menu';
export { Popover } from './popover/popover';
export { HoverCard } from './hover-card/hover-card';
export { Dialog } from './dialog/dialog';
export { Toaster, type ToasterProps } from './toast/toaster';
export { toast, type ToastOptions, type ToastTone } from './toast/toast-store';

// Поверхности и фон
export { Surface, type SurfaceProps } from './surface/surface';
export { ScrollArea, type ScrollAreaProps } from './scroll-area/scroll-area';
export {
  AmbientBackground,
  type AmbientBackgroundProps,
  type AmbientVariant,
} from './ambient-background/ambient-background';
export { ambient, type AmbientReaction } from './ambient-background/ambient-events';

// Ввод и выбор: композиции
export { Combobox, type ComboboxOption, type ComboboxProps } from './combobox/combobox';
export { TagInput, type TagInputProps } from './tag-input/tag-input';
export type { TagValidator } from './tag-input/tags';
export { PinInput, type PinInputProps } from './pin-input/pin-input';
export type { PinType } from './pin-input/pin';
export { NumberInput, type NumberInputProps } from './number-input/number-input';
export { ColorPicker, type ColorPickerProps, type ColorPreset } from './color-picker/color-picker';
export {
  contrastLevel,
  contrastRatio,
  readableTextOn,
  type ContrastLevel,
} from './color-picker/color';
export { CopyButton, type CopyButtonProps } from './copy-button/copy-button';
export { copyText } from './copy-button/copy-text';
export { CopyField, type CopyFieldProps } from './copy-field/copy-field';
export { FileDropzone, type FileDropzoneProps } from './file-dropzone/file-dropzone';
export { FileDropOverlay, type FileDropOverlayProps } from './file-dropzone/file-drop-overlay';
export { formatBytes, type FileRejection, type FileRules } from './file-dropzone/files';
export { AttachmentCard, type AttachmentCardProps } from './attachment-card/attachment-card';

// Слои и навигация: композиции
export { useHotkey, type UseHotkeyOptions } from './lib/use-hotkey';
export { formatHotkey, hotkeyParts, isApplePlatform } from './lib/hotkey';
export {
  CommandPalette,
  type CommandItem,
  type CommandPaletteProps,
} from './command-palette/command-palette';
export { pushRecent as pushRecentCommand } from './command-palette/command-filter';
export { Sheet } from './sheet/sheet';
export type { SheetContentProps, SheetSide, SheetSize } from './sheet/sheet-parts';
export { ConfirmDialog, type ConfirmDialogProps } from './confirm-dialog/confirm-dialog';
export { Breadcrumbs, type BreadcrumbItem, type BreadcrumbsProps } from './breadcrumbs/breadcrumbs';
export { Toolbar } from './toolbar/toolbar';
export type { ToolbarRootProps } from './toolbar/toolbar-parts';
export { Resizable } from './resizable/resizable';
export type { ResizablePanelProps, ResizableRootProps } from './resizable/resizable-parts';
export {
  ShortcutList,
  type ShortcutEntry,
  type ShortcutGroup,
  type ShortcutListProps,
} from './shortcut-list/shortcut-list';
export { Calendar, type CalendarProps } from './calendar/calendar';
export { todayIsoDate, weekday, type IsoDate, type Weekday } from './calendar/calendar-date';
export { DatePicker, type DatePickerProps } from './date-picker/date-picker';

// Данные, медиа и TUI
export {
  AvatarGroup,
  type AvatarGroupItem,
  type AvatarGroupProps,
} from './avatar-group/avatar-group';
export { Timestamp, type TimestampMode, type TimestampProps } from './timestamp/timestamp';
export type { TimestampInput } from './timestamp/timestamp-format';
export {
  DataTable,
  type DataTableColumn,
  type DataTableProps,
  type DataTableSort,
  type SortDirection,
  type SortValue,
} from './data-table/data-table';
export { Stat, type StatProps } from './stat/stat';
export { Sparkline, type SparklineProps, type SparklineTone } from './sparkline/sparkline';
export { Meter, type MeterProps } from './meter/meter';
export {
  ProgressRing,
  type ProgressRingProps,
  type ProgressRingSize,
} from './progress-ring/progress-ring';
export { Mention, type MentionKind, type MentionProps } from './mention/mention';
export { LinkPreview, type LinkPreviewProps } from './link-preview/link-preview';
export { MediaTile, type MediaTileProps } from './media-tile/media-tile';
export { LogView, type LogLevel, type LogLine, type LogViewProps } from './log-view/log-view';
export { TuiSpinner, type TuiSpinnerProps } from './tui-spinner/tui-spinner';
export type { TuiSpinnerVariant } from './tui-spinner/tui-frames';
export { TuiProgress, type TuiProgressProps } from './tui-progress/tui-progress';
export type { TuiProgressVariant } from './tui-progress/tui-bar';
export { ScrambleText, type ScrambleTextProps } from './scramble-text/scramble-text';
export { NumberTicker, type NumberTickerProps } from './number-ticker/number-ticker';

// Волна 2: списки и данные
export {
  VirtualList,
  type VirtualListAlign,
  type VirtualListHandle,
  type VirtualListProps,
} from './virtual-list/virtual-list';
export {
  SortableList,
  type SortableItemState,
  type SortableListProps,
} from './sortable-list/sortable-list';
export { moveItem, type SortableMessages } from './sortable-list/sortable-math';
export {
  NotificationItem,
  type NotificationItemProps,
} from './notification-item/notification-item';
export { Inbox, type InboxFilter, type InboxNotification, type InboxProps } from './inbox/inbox';

// Волна 2: сообщения и медиа
export { Markdown } from './markdown/markdown';
export type {
  MarkdownMentionKind,
  MarkdownMentionProps,
  MarkdownProps,
  MentionResolver,
} from './markdown/markdown-types';
export {
  EmojiPicker,
  EmojiPickerPopover,
  type EmojiPickerPopoverProps,
  type EmojiPickerProps,
} from './emoji-picker/emoji-picker';
export { loadEmojiData } from './emoji-picker/emoji-load';
export type { EmojiCategory, EmojiCategoryId, EmojiItem } from './emoji-picker/emoji-types';
export {
  ImageLightbox,
  type ImageLightboxItem,
  type ImageLightboxProps,
} from './image-lightbox/image-lightbox';
export { VoiceMessage, type VoiceMessageProps } from './voice-message/voice-message';

// Волна 2: время, окно, обучение
export type { CalendarRangeProps, CalendarSingleProps } from './calendar/calendar';
export type { DateRange } from './calendar/calendar-range';
export { DateRangePicker, type DateRangePickerProps } from './date-range-picker/date-range-picker';
export {
  defaultDateRangePresets,
  type DateRangePreset,
} from './date-range-picker/date-range-presets';
export { TimePicker, type TimePickerProps } from './time-picker/time-picker';
export type { HourCycle, IsoTime } from './time-picker/time';
export { Menubar } from './menubar/menubar';
export type { MenubarItemProps, MenubarRootProps } from './menubar/menubar-parts';
export { Tour, type TourLabels, type TourProps } from './tour/tour';
export type { TourSide, TourStep, TourTarget } from './tour/tour-steps';

// Волна 2: доделки волны 1
export type { PanelSize as ResizablePanelSize } from './resizable/resizable-math';
export type { CommandLoader } from './command-palette/command-palette';
export { switchLayout as switchKeyboardLayout } from './command-palette/command-layout';
export type { ColorFormat } from './color-picker/color-picker';
export {
  formatHsl,
  formatRgb,
  hexToHsv,
  hexToRgb,
  hslToRgb,
  hsvToHex,
  hsvToRgb,
  rgbToHex,
  rgbToHsl,
  rgbToHsv,
  type Hsl,
  type Hsv,
  type Rgb,
} from './color-picker/color';
export type { SparklineVariant } from './sparkline/sparkline';
export type { SparkValue } from './sparkline/sparkline-geometry';
export type { MeterDirection } from './meter/meter-model';
export { usePreventWindowDrop } from './file-dropzone/use-prevent-window-drop';

// Волна 3: стиль «сигнал»
export { SignalScope, type SignalScopeProps } from './signal-scope/signal-scope';
export {
  signalAccentColors,
  signalAccents,
  signalFontCyrillic,
  signalFontLabels,
  signalFonts,
  type SignalAccent,
  type SignalFont,
} from './signal-scope/signal-options';
export {
  ChamferPanel,
  type ChamferPanelProps,
  type ChamferSize,
} from './chamfer-panel/chamfer-panel';
export type { ChamferCorner } from './chamfer-panel/chamfer';
export { CornerFrame, type CornerFrameProps } from './corner-frame/corner-frame';
export { DataPlate, type DataPlateItem, type DataPlateProps } from './data-plate/data-plate';
export { serialFromSeed, type SerialOptions } from './data-plate/serial';
export { Barcode, type BarcodeProps } from './barcode/barcode';
export { QrCode, type QrCodeProps } from './qr-code/qr-code';
export { HazardStripe, type HazardStripeProps } from './hazard-stripe/hazard-stripe';
export {
  RegistrationMarks,
  type RegistrationMarksProps,
} from './registration-marks/registration-marks';
export { IndexLabel, type IndexLabelProps } from './index-label/index-label';
export { formatIndex, type FormatIndexOptions } from './index-label/format-index';
export { Ticker, type TickerProps } from './ticker/ticker';
export { CoordinateGrid, type CoordinateGridProps } from './coordinate-grid/coordinate-grid';
export { Emblem, type EmblemProps } from './emblem/emblem';
export { Stamp, type StampProps } from './stamp/stamp';

// Волна 3: строки
export { UiStringsProvider, type UiStringsProviderProps } from './strings/ui-strings-provider';
export { useUiLocale, useUiStrings } from './strings/ui-strings-context';
export { mergeUiStrings, stringsForLocale } from './strings/merge-strings';
export { plural, type PluralForms } from './strings/plural';
export { enStrings } from './strings/en';
export { ruStrings } from './strings/ru';
export { createDateRangePresets } from './date-range-picker/date-range-presets';
export type { FileStrings, FileTextOptions } from './file-dropzone/files';
export type { DateRangePresetKey, UiStrings, UiStringsOverride } from './strings/ui-strings-types';

// Волна 3: движение
export { Presence, type PresenceAnimation, type PresenceProps } from './motion-core/presence';
export { useFlipList, FLIP_KEY_ATTRIBUTE, type FlipListOptions } from './motion-core/use-flip-list';
export {
  spring,
  springEasing,
  springKeyframes,
  springPresets,
  springValue,
  supportsLinearEasing,
  type SpringCurve,
  type SpringOptions,
} from './motion-core/spring';
export {
  canViewTransition,
  startViewTransition,
  useViewTransition,
  type ViewTransitionOptions,
  type ViewTransitionResult,
} from './motion-core/view-transition';
export { stagger, staggerDelay, type StaggerOptions } from './motion-core/stagger';
export { Stagger, type StaggerProps } from './motion-core/stagger-group';
export { ScrollReveal, type ScrollRevealProps } from './motion-core/scroll-reveal';
export { supportsScrollTimeline } from './motion-core/scroll-timeline';
export { useInView, type InViewOptions } from './motion-core/use-in-view';

// Волна 3: ввод
export {
  RichComposer,
  type ComposerSource,
  type ComposerSources,
  type ComposerSubmit,
  type ComposerSuggestion,
  type ComposerSuggestionGroup,
  type RichComposerApi,
  type RichComposerProps,
  type RichComposerSlot,
} from './rich-composer/rich-composer';
export {
  composerTextLength,
  composerToMarkdown,
  markdownToComposer,
  type ComposerParseOptions,
  type ComposerParseResolved,
  type ComposerSerializeOptions,
} from './rich-composer/composer-markdown';
export {
  emptyComposerDoc,
  isDocEmpty,
  type ComposerChannelSegment,
  type ComposerDoc,
  type ComposerEmojiSegment,
  type ComposerMentionKind,
  type ComposerMentionSegment,
  type ComposerSegment,
  type ComposerTextSegment,
  type ComposerToken,
} from './rich-composer/composer-model';
export {
  PasswordStrength,
  type PasswordStrengthProps,
} from './password-strength/password-strength';
export {
  scorePassword,
  type PasswordHint,
  type PasswordScore,
  type PasswordScoreOptions,
  type PasswordStrengthResult,
} from './password-strength/password-score';
export { SearchQuery, type SearchQueryProps } from './search-query/search-query';
export {
  formatSearchQuery,
  parseSearchQuery,
  type SearchFilter,
  type SearchKey,
  type SearchQueryValue,
  type SearchValueOption,
  type SearchValueSource,
} from './search-query/search-query-parse';
export { RangeSlider, type RangeSliderProps } from './range-slider/range-slider';
export type { RangeValue } from './range-slider/range-math';
export { InlineEdit, type InlineEditProps } from './inline-edit/inline-edit';
export {
  KeybindingRecorder,
  type KeybindingRecorderProps,
} from './keybinding-recorder/keybinding-recorder';
export {
  comboFromEvent,
  findConflict,
  normalizeCombo,
  sameCombo,
  type KeybindingEntry,
} from './keybinding-recorder/keybinding';
export { Wizard, type WizardProps, type WizardStep, type WizardStepApi } from './wizard/wizard';
export type { WizardValidation } from './wizard/wizard-state';

// Волна 3: сообщество
export {
  MessageMedia,
  type MessageMediaItem,
  type MessageMediaProps,
} from './message-media/message-media';
export {
  fitMedia,
  mediaKind,
  mosaicLayout,
  type MediaFit,
  type MediaLimits,
  type MessageMediaKind,
  type MosaicLayout,
  type MosaicTile,
} from './message-media/media-layout';
export { ReactionBar, type ReactionBarProps } from './reaction-bar/reaction-bar';
export { ReactionPicker, type ReactionPickerProps } from './reaction-bar/reaction-picker';
export {
  DEFAULT_QUICK_REACTIONS,
  toggleReaction,
  type ReactionItem,
} from './reaction-bar/reaction-model';
export {
  ProfileCard,
  type ProfileBadge,
  type ProfileCardProps,
  type ProfileRole,
} from './profile-card/profile-card';
export {
  ProfileHoverCard,
  type ProfileHoverCardProps,
  type ProfileHoverCardTrigger,
} from './profile-hover-card/profile-hover-card';
export { SpaceHeader, type SpaceHeaderProps } from './space-header/space-header';
export {
  PlaceHeader,
  type PlaceHeaderProps,
  type PlaceKind,
  type PlaceLive,
} from './place-header/place-header';
export { ArtifactHeader, type ArtifactHeaderProps } from './artifact-header/artifact-header';
export { XpBar, type XpBarProps } from './xp-bar/xp-bar';
export { LevelBadge, type LevelBadgeProps } from './xp-bar/level-badge';
export { levelFromTotal, xpRatio, type LevelOptions, type XpProgress } from './xp-bar/xp-math';
export {
  Achievement,
  type AchievementProgress,
  type AchievementProps,
  type AchievementRarity,
} from './achievement/achievement';
export {
  ReputationMeter,
  type ReputationMeterProps,
  type ReputationTier,
} from './reputation-meter/reputation-meter';
export {
  StoreItemCard,
  type StoreItemCardProps,
  type StoreItemState,
} from './store-item-card/store-item-card';
export { Poll, type PollOption, type PollProps } from './poll/poll';
export { pollResults, toggleChoice, type PollResult } from './poll/poll-math';
export {
  EventCard,
  type EventCardProps,
  type EventLocationKind,
  type EventRsvp,
} from './event-card/event-card';
export { InviteCard, type InviteCardProps, type InviteState } from './invite-card/invite-card';
export {
  VoiceControls,
  type VoiceConnection,
  type VoiceControlsProps,
  type VoiceQuality,
} from './voice-controls/voice-controls';
export { Soundboard, type SoundboardProps, type SoundboardSound } from './soundboard/soundboard';
export { Countdown, type CountdownProps, type CountdownUnit } from './countdown/countdown';
export { splitDuration, type CountdownPart } from './countdown/countdown-math';
export { MessageSkeleton, type MessageSkeletonProps } from './message-skeleton/message-skeleton';
export { MemberSkeleton, type MemberSkeletonProps } from './message-skeleton/member-skeleton';

// Волна 3: данные
export { Chart, type ChartProps } from './chart/chart';
export {
  chartPalette,
  type ChartCategory,
  type ChartColor,
  type ChartSeries,
  type ChartType,
  type ChartValue,
} from './chart/chart-model';
export { niceTicks, type NiceTicks } from './chart/chart-scale';
export { Heatmap, type HeatmapProps } from './heatmap/heatmap';
export { weekStartForLocale } from './heatmap/week-start';
export {
  Tree,
  type TreeItem,
  type TreeProps,
  type TreeRowState,
  type TreeSelectionMode,
} from './tree/tree';
export { moveNode, type DropPosition, type TreeMove } from './tree/tree-model';
export {
  Timeline,
  type TimelineEvent,
  type TimelineProps,
  type TimelineTone,
  type TimelineType,
} from './timeline/timeline';
export {
  CalendarView,
  type CalendarEventTone,
  type CalendarViewEvent,
  type CalendarViewMode,
  type CalendarViewProps,
} from './calendar-view/calendar-view';
export { JsonInspector, type JsonInspectorProps } from './json-inspector/json-inspector';
export { jsonPath } from './json-inspector/json-model';
export { DiffView, type DiffViewMode, type DiffViewProps } from './diff-view/diff-view';
export { diffLines, diffWords, type DiffSegment } from './diff-view/diff';
export {
  DescriptionList,
  type DescriptionItem,
  type DescriptionListProps,
} from './description-list/description-list';

// Волна 3: оболочка и TUI
export { AppShell, type AppShellProps } from './app-shell/app-shell';
export { useAppShell, type AppShellApi } from './app-shell/app-shell-context';
export {
  defaultShellBreakpoints,
  shellLayout,
  type ShellBreakpoints,
  type ShellLayout,
  type ShellPanelMode,
} from './app-shell/app-shell-layout';
export { BrowserTabs, type BrowserTab, type BrowserTabsProps } from './browser-tabs/browser-tabs';
export { tabAfterClose } from './browser-tabs/browser-tabs-model';
export { FloatingPanel, type FloatingPanelProps } from './floating-panel/floating-panel';
export type { ResizeCorner as FloatingPanelCorner } from './floating-panel/floating-geometry';
export { Dock, type DockItem, type DockProps } from './dock/dock';
export { TitleBar, type TitleBarProps } from './title-bar/title-bar';
export type { WindowPlatform } from './title-bar/title-bar-platform';
export { KeyHints, type KeyHintsProps } from './key-hints/key-hints';
export { BoxFrame, type BoxFrameProps, type BoxFrameVariant } from './box-frame/box-frame';
export {
  Powerline,
  type PowerlineProps,
  type PowerlineSegment,
  type PowerlineTone,
} from './powerline/powerline';
export {
  CommandLine,
  type CommandLineProps,
  type CommandSuggestionSource,
} from './command-line/command-line';
export type { CommandSuggestion } from './command-line/command-line-model';
export { TuiTable, type TuiTableColumn, type TuiTableProps } from './tui-table/tui-table';
export { textWidth, type TuiAlign } from './tui-table/tui-table-layout';
export { Pager, type PagerProps } from './pager/pager';

// Заморозка: недостающее
export { PasswordInput, type PasswordInputProps } from './password-input/password-input';
export {
  ImageCropper,
  type ImageCropperExportOptions,
  type ImageCropperHandle,
  type ImageCropperProps,
} from './image-cropper/image-cropper';
export {
  ImageCropperDialog,
  type ImageCropperDialogProps,
} from './image-cropper/image-cropper-dialog';
export { exportCrop, type CropExportOptions, type CropMask } from './image-cropper/crop-export';
export { clampCrop, cropRegion, type Crop } from './image-cropper/crop-math';
export { MessageItem, type MessageItemProps } from './message-item/message-item';
export {
  GROUP_WINDOW,
  groupMessages,
  sameDay,
  type GroupMessagesOptions,
} from './message-item/message-groups';
export {
  ReplyPreview,
  type ReplyPreviewProps,
  type ReplyPreviewVariant,
} from './reply-preview/reply-preview';
export { replyExcerpt } from './reply-preview/reply-excerpt';
export { UnreadDivider, type UnreadDividerProps } from './unread-divider/unread-divider';
export { DateDivider, type DateDividerProps } from './date-divider/date-divider';
export { dayLabel, type DayLabelOptions } from './date-divider/day-label';
export { JumpToLatest, type JumpToLatestProps } from './jump-to-latest/jump-to-latest';
export {
  AspectRatio,
  type AspectRatioProps,
  type AspectRatioRadius,
} from './aspect-ratio/aspect-ratio';
export { VisuallyHidden, type VisuallyHiddenProps } from './visually-hidden/visually-hidden';
