import { cn } from "../../lib/utils";

interface SegmentedOption<TValue extends string | number> {
  label: string;
  value: TValue;
}

interface SegmentedControlProps<TValue extends string | number> {
  label: string;
  options: SegmentedOption<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
}

export function SegmentedControl<TValue extends string | number>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<TValue>) {
  return (
    <div className="segmented-field">
      <span>{label}</span>
      <div className="segmented-control" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            aria-pressed={option.value === value}
            className={cn("segmented-option", option.value === value && "is-active")}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
