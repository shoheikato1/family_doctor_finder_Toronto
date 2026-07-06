import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type InputProps = {
  type: 'text' | 'email' | 'password' | 'postalCode' | 'ohip';
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  helper?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
};

function formatPostalCode(raw: string): string {
  const cleaned = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6);
  if (cleaned.length > 3) {
    return cleaned.slice(0, 3) + ' ' + cleaned.slice(3);
  }
  return cleaned;
}

function maskOhip(raw: string, revealed: boolean): string {
  if (revealed) return raw;
  return '•'.repeat(raw.length);
}

export function Input({
  type,
  label,
  value,
  onChange,
  onBlur,
  error,
  helper,
  placeholder,
  required = false,
  disabled = false,
}: InputProps) {
  const [ohipRevealed, setOhipRevealed] = useState(false);

  const isPostal = type === 'postalCode';
  const isOhip = type === 'ohip';
  const isMono = isPostal || isOhip;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (isPostal) {
      onChange(formatPostalCode(e.target.value));
    } else if (isOhip) {
      onChange(e.target.value.replace(/\D/g, '').slice(0, 10));
    } else {
      onChange(e.target.value);
    }
  }

  const displayValue = isOhip ? maskOhip(value, ohipRevealed) : value;
  const htmlType = type === 'password' || (isOhip && !ohipRevealed) ? 'password' : 'text';
  const inputType = isPostal || isOhip ? 'text' : htmlType;
  const ohipDigitCount = isOhip ? value.length : 0;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-sans text-sm font-medium text-text-primary">
        {label}
        {required && <span className="text-brand-accent ml-1">*</span>}
      </label>

      <div className="relative">
        <input
          type={inputType}
          value={isOhip ? (ohipRevealed ? value : displayValue) : value}
          onChange={handleChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={isOhip ? 'off' : undefined}
          maxLength={isOhip ? 10 : undefined}
          className={[
            'w-full rounded-md border px-4 py-3 font-sans text-base text-text-primary',
            'placeholder:text-text-tertiary',
            'transition-colors duration-120 ease-out',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-primary',
            isMono ? 'font-mono' : '',
            isOhip ? 'pr-12' : '',
            error
              ? 'border-status-rejected focus-visible:ring-status-rejected'
              : 'border-border-soft',
            disabled ? 'opacity-50 cursor-not-allowed bg-background-base' : 'bg-surface',
          ].join(' ')}
        />

        {isOhip && (
          <button
            type="button"
            onClick={() => setOhipRevealed((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors duration-120"
            aria-label={ohipRevealed ? 'Hide OHIP number' : 'Show OHIP number'}
          >
            {ohipRevealed ? (
              <EyeOff size={16} strokeWidth={1.5} />
            ) : (
              <Eye size={16} strokeWidth={1.5} />
            )}
          </button>
        )}
      </div>

      {error && (
        <p className="font-sans text-sm text-status-rejected">{error}</p>
      )}
      {!error && isOhip && (
        <p className="font-sans text-xs text-text-tertiary">{ohipDigitCount} of 10 digits</p>
      )}
      {!error && !isOhip && helper && (
        <p className="font-sans text-sm text-text-secondary">{helper}</p>
      )}
    </div>
  );
}
