type MultiSelectProps<T extends string> = {
  label: string;
  value: T[];
  options: Array<{ value: T; label: string }>;
  onChange: (value: T[]) => void;
  error?: string;
};

export function MultiSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  error,
}: MultiSelectProps<T>) {
  function toggle(optValue: T) {
    if (value.includes(optValue)) {
      onChange(value.filter((v) => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-sans text-sm font-medium text-text-primary">
        {label}
      </span>

      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = value.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className={[
                'inline-flex items-center rounded-pill px-3 py-1.5 text-sm font-sans font-medium',
                'border transition-colors duration-120 ease-out',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                selected
                  ? 'bg-primary text-surface border-primary'
                  : 'bg-surface text-text-secondary border-border-soft hover:border-primary hover:text-text-primary',
              ].join(' ')}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {error && (
        <p className="font-sans text-sm text-status-rejected">{error}</p>
      )}
    </div>
  );
}
