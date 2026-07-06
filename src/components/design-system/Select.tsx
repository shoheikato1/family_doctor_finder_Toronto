import { ChevronDown } from 'lucide-react';

type SelectProps<T extends string | number> = {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  error?: string;
  disabled?: boolean;
};

export function Select<T extends string | number>({
  label,
  value,
  options,
  onChange,
  error,
  disabled = false,
}: SelectProps<T>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-sans text-sm font-medium text-text-primary">
        {label}
      </label>

      <div className="relative">
        <select
          value={value}
          onChange={(e) => {
            const raw = e.target.value;
            const option = options.find((o) => String(o.value) === raw);
            if (option) onChange(option.value);
          }}
          disabled={disabled}
          className={[
            'w-full appearance-none rounded-md border px-4 py-3 pr-10',
            'font-sans text-base text-text-primary bg-surface',
            'transition-colors duration-120 ease-out',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-primary',
            error
              ? 'border-status-rejected'
              : 'border-border-soft',
            disabled ? 'opacity-50 cursor-not-allowed bg-background-base' : 'cursor-pointer',
          ].join(' ')}
        >
          {options.map((opt) => (
            <option key={String(opt.value)} value={String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>

        <ChevronDown
          size={16}
          strokeWidth={1.5}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary"
        />
      </div>

      {error && (
        <p className="font-sans text-sm text-status-rejected">{error}</p>
      )}
    </div>
  );
}
