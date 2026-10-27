import { useState } from 'react';

import { Check, Pipette, Plus } from 'lucide-react';
import { RadioGroup as RadixRadioGroup } from 'radix-ui';

import { useFieldControl } from '../field/field-context';
import { Icon } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';
import { Input } from '../input/input';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';
import { accentPresets, type AccentName } from '../theme/accent';

import {
  contrastLevel,
  contrastRatio,
  formatHsl,
  formatRgb,
  parseHex,
  readableTextOn,
  type ContrastLevel,
} from './color';
import styles from './color-picker.module.css';
import { HsvPalette } from './hsv-palette';

export interface ColorPreset {
  /** `#rrggbb` */
  value: string;
  /** Подпись свотча для скринридера и подсказки */
  label: string;
}

export interface ColorPickerProps {
  /** `#rrggbb` в нижнем регистре */
  value?: string;
  defaultValue?: string;
  onValueChange?: (hex: string) => void;
  /** Свотчи; по умолчанию — пресеты акцента пространства */
  presets?: readonly ColorPreset[];
  /** Hex-поле и свой цвет из системной палитры; без них — только пресеты */
  allowCustom?: boolean;
  /** Своя палитра под свотчами: квадрат насыщенность × яркость и полоса оттенка (вместо системной) */
  palette?: boolean;
  /** Пипетка «взять цвет с экрана» — только где есть EyeDropper API (Chromium, WebView2); иначе кнопки нет */
  eyeDropper?: boolean;
  /** Подписи цвета моно рядом с hex: `['rgb', 'hsl']` */
  formats?: readonly ColorFormat[];
  /** Подсказка, читается ли текст `contrastWith` на выбранном цвете (WCAG) */
  showContrast?: boolean;
  /** С каким цветом текста считать контраст — по умолчанию белый: так подписаны роль и акцентная кнопка */
  contrastWith?: string;
  /** Подпись группы свотчей для скринридера */
  label?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  'aria-describedby'?: string;
}

export type ColorFormat = 'rgb' | 'hsl';

/** EyeDropper API пока не в lib.dom TypeScript — только то, чем пользуемся */
interface EyeDropperConstructor {
  new (): { open: () => Promise<{ sRGBHex: string }> };
}

function getEyeDropper(): EyeDropperConstructor | undefined {
  return typeof window === 'undefined'
    ? undefined
    : (window as unknown as { EyeDropper?: EyeDropperConstructor }).EyeDropper;
}

function accentColorPresets(names: Record<AccentName, string>): ColorPreset[] {
  return (Object.keys(accentPresets) as AccentName[]).map((name) => ({
    value: accentPresets[name].accent,
    label: names[name],
  }));
}

const contrastTone: Record<ContrastLevel, string | undefined> = {
  AAA: styles.good,
  AA: styles.good,
  'AA-large': styles.warning,
  fail: styles.bad,
};

const CONTRAST_LEVELS = Object.keys(contrastTone) as ContrastLevel[];

/**
 * Цвет роли, акцент пространства: свотчи пресетов (radiogroup, стрелки ходят по ним), hex-поле и
 * свой цвет из системной палитры или своей HSV-палитры (`palette`), пипетка с экрана. Подсказка под свотчами — контраст текста на выбранном цвете по
 * WCAG: роль подписывается белым, и цвет, на котором её не прочитать, видно сразу.
 */
export function ColorPicker({
  value,
  defaultValue,
  onValueChange,
  presets: presetsProp,
  allowCustom = true,
  palette = false,
  eyeDropper = true,
  formats = [],
  showContrast = true,
  contrastWith = '#ffffff',
  label: labelProp,
  disabled,
  invalid,
  className,
  'aria-describedby': ariaDescribedBy,
}: ColorPickerProps) {
  const text = useUiStrings().colorPicker;
  const presets = presetsProp ?? accentColorPresets(text.accents);
  const label = labelProp ?? text.label;
  const control = useFieldControl({ invalid, 'aria-describedby': ariaDescribedBy });
  const [innerValue, setInnerValue] = useState(
    () => parseHex(defaultValue ?? '') ?? parseHex(presets[0]?.value ?? '') ?? '#000000',
  );
  const current = parseHex(value ?? '') ?? innerValue;
  const [hexText, setHexText] = useState(current.slice(1));
  const [shownValue, setShownValue] = useState(current);

  // Цвет сменился не из hex-поля (свотч, палитра, снаружи) — поле показывает его
  if (current !== shownValue) {
    setShownValue(current);
    setHexText(current.slice(1));
  }

  const matchedPreset = presets.find((preset) => parseHex(preset.value) === current);
  const isCustom = !matchedPreset;
  const ratio = contrastRatio(current, contrastWith);
  const level = ratio === null ? null : contrastLevel(ratio);
  const textTone = readableTextOn(current);
  const EyeDropperApi = getEyeDropper();

  const pickFromScreen = async (Api: EyeDropperConstructor) => {
    try {
      const { sRGBHex } = await new Api().open();

      choose(sRGBHex);
    } catch {
      // Esc во время выбора — отмена, а не ошибка; показывать нечего
    }
  };

  const choose = (next: string) => {
    const hex = parseHex(next);

    if (!hex || hex === current) return;

    setInnerValue(hex);
    setShownValue(hex);
    setHexText(hex.slice(1));
    onValueChange?.(hex);
  };

  const onHexChange = (text: string) => {
    const cleaned = text
      .replace(/[^0-9a-f]/gi, '')
      .slice(0, 6)
      .toLowerCase();

    setHexText(cleaned);

    // Три знака — ещё не цвет: человек, скорее всего, печатает шесть; короткая запись — на blur
    if (cleaned.length === 6) choose(cleaned);
  };

  const onHexBlur = () => {
    const hex = parseHex(hexText);

    if (hex) {
      choose(hex);
      setHexText(hex.slice(1));
    } else {
      setHexText(current.slice(1));
    }
  };

  return (
    <div className={cx(styles.root, className)} data-disabled={disabled || undefined}>
      <div className={styles.swatches}>
        <RadixRadioGroup.Root
          className={styles.group}
          value={matchedPreset ? matchedPreset.value : ''}
          onValueChange={choose}
          disabled={disabled}
          orientation="horizontal"
          loop
          aria-label={label}
          aria-describedby={control.props['aria-describedby']}
        >
          {presets.map((preset) => (
            <RadixRadioGroup.Item
              key={preset.value}
              value={preset.value}
              className={styles.swatch}
              style={{ background: preset.value }}
              aria-label={preset.label}
              title={preset.label}
            >
              <RadixRadioGroup.Indicator
                className={styles.indicator}
                data-tone={readableTextOn(preset.value)}
              >
                <Icon icon={Check} size="sm" />
              </RadixRadioGroup.Indicator>
            </RadixRadioGroup.Item>
          ))}
        </RadixRadioGroup.Root>

        {allowCustom && (
          <span
            className={cx(styles.swatch, styles.custom)}
            style={isCustom ? { background: current } : undefined}
            data-state={isCustom ? 'checked' : 'unchecked'}
            data-tone={isCustom ? textTone : undefined}
            title={text.custom}
          >
            <Icon icon={isCustom ? Check : Plus} size="sm" className={styles.indicator} />

            {/* Со своей палитрой системная не нужна: клетка только показывает, что цвет свой */}
            {!palette && (
              <input
                type="color"
                className={styles.native}
                value={current}
                disabled={disabled}
                aria-label={text.custom}
                onChange={(event) => choose(event.target.value)}
              />
            )}
          </span>
        )}
      </div>

      {allowCustom && palette && (
        <HsvPalette value={current} onChange={choose} disabled={disabled} />
      )}

      {(allowCustom || showContrast || formats.length > 0) && (
        <div className={styles.details}>
          {allowCustom && EyeDropperApi && eyeDropper && (
            <IconButton
              label={text.eyeDropper}
              size="sm"
              variant="secondary"
              disabled={disabled}
              onClick={() => void pickFromScreen(EyeDropperApi)}
            >
              <Icon icon={Pipette} size="sm" />
            </IconButton>
          )}

          {allowCustom && (
            <Input
              size="sm"
              prompt="#"
              mono
              value={hexText}
              disabled={disabled}
              invalid={control.invalid}
              aria-label={text.hex}
              spellCheck={false}
              autoComplete="off"
              maxLength={7}
              wrapperClassName={styles.hex}
              onChange={(event) => onHexChange(event.target.value)}
              onBlur={onHexBlur}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onHexBlur();
              }}
            />
          )}

          {formats.map((format) => (
            <output
              key={format}
              className={styles.format}
              data-format={format}
              aria-label={format.toUpperCase()}
            >
              {format === 'rgb' ? formatRgb(current) : formatHsl(current)}
            </output>
          ))}

          {showContrast && ratio !== null && level !== null && (
            <span className={styles.contrast}>
              <span
                className={styles.preview}
                style={{ background: current, color: contrastWith }}
                aria-hidden
              >
                Aa
              </span>

              {/* Два знака: при одном 4.48 показалось бы как 4.5 рядом с вердиктом «не AA» */}
              <span className={styles.ratio}>{ratio.toFixed(2)}:1</span>

              {/*
               * Все вердикты в одной ячейке, виден текущий: ширина — по самому длинному. Иначе при
               * перетаскивании по палитре подпись меняла длину, пикер — ширину, палитра под курсором
               * растягивалась, и курсор оказывался на другом цвете
               */}
              <span className={styles.verdicts}>
                {CONTRAST_LEVELS.map((option) => (
                  <span
                    key={option}
                    className={cx(styles.verdict, contrastTone[option])}
                    data-current={option === level || undefined}
                    aria-hidden={option === level ? undefined : true}
                  >
                    {option === 'fail' ? '' : `${option === 'AA-large' ? text.aaLarge : option} · `}
                    {text.contrast[option]}
                  </span>
                ))}
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
