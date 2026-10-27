import { Field } from '../field/field';
import { Slider } from '../slider/slider';

export interface SliderFieldProps {
  label: string;
  /** Значение рядом с подписью — уже с единицами */
  display: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

/** Ползунок генератора: подпись со значением сверху, как у всех полей генератора */
export function SliderField({ label, display, value, min, max, step, onChange }: SliderFieldProps) {
  return (
    <Field label={`${label} · ${display}`}>
      <Slider
        label={label}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([next]) => onChange(next!)}
      />
    </Field>
  );
}
