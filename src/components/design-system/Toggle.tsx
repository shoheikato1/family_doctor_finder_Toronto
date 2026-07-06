type ToggleProps = {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: ToggleProps) {
  return (
    <label
      className={[
        'flex items-start gap-3 cursor-pointer',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
      ].join(' ')}
    >
      <div className="relative shrink-0 mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        {/* Track */}
        <div
          className={[
            'w-10 h-6 rounded-pill border-2 transition-colors duration-200 ease-in-out',
            checked
              ? 'bg-primary border-primary'
              : 'bg-background-base border-border-soft',
          ].join(' ')}
        />
        {/* Thumb */}
        <div
          className={[
            'absolute top-0.5 left-0.5 w-4 h-4 rounded-pill bg-surface',
            'shadow-sm transition-transform duration-200 ease-in-out',
            checked ? 'translate-x-4' : 'translate-x-0',
          ].join(' ')}
        />
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="font-sans text-sm font-medium text-text-primary leading-snug">
          {label}
        </span>
        {description && (
          <span className="font-sans text-sm text-text-secondary">
            {description}
          </span>
        )}
      </div>
    </label>
  );
}
