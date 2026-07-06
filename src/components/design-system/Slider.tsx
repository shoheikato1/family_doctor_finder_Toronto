type SliderProps = {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
};

export function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
  unit,
}: SliderProps) {
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-sans text-sm font-medium text-text-primary">
          {label}
        </span>
        <span className="font-mono text-sm font-medium text-text-primary">
          {value}{unit ? ` ${unit}` : ''}
        </span>
      </div>

      <div className="relative h-6 flex items-center">
        {/* Track background — outlined warm grey */}
        <div className="absolute inset-x-0 h-2 rounded-pill bg-border-soft border border-border-soft" />
        {/* Filled portion */}
        <div
          className="absolute left-0 h-2 rounded-pill bg-primary transition-all duration-120"
          style={{ width: `${percent}%` }}
        />
        {/* Native range input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="relative w-full appearance-none bg-transparent cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-pill
            [&::-webkit-slider-thumb]:bg-primary
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-border-soft
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:duration-120
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-moz-range-thumb]:w-5
            [&::-moz-range-thumb]:h-5
            [&::-moz-range-thumb]:rounded-pill
            [&::-moz-range-thumb]:bg-primary
            [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-border-soft
            focus-visible:outline-none
            focus-visible:[&::-webkit-slider-thumb]:ring-2
            focus-visible:[&::-webkit-slider-thumb]:ring-primary
            focus-visible:[&::-webkit-slider-thumb]:ring-offset-2"
        />
      </div>

      <div className="flex justify-between">
        <span className="font-sans text-xs text-text-tertiary">{min}{unit ? ` ${unit}` : ''}</span>
        <span className="font-sans text-xs text-text-tertiary">{max}{unit ? ` ${unit}` : ''}</span>
      </div>
    </div>
  );
}
