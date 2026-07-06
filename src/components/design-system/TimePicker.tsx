type TimePickerProps = {
  label: string;
  value: string; // 'HH:MM' 24h
  onChange: (value: string) => void;
};

function generateHours(): string[] {
  return Array.from({ length: 24 }, (_, i) =>
    String(i).padStart(2, '0')
  );
}

function generateMinutes(): string[] {
  return ['00', '15', '30', '45'];
}

export function TimePicker({ label, value, onChange }: TimePickerProps) {
  const [hourStr, minuteStr] = value.split(':');
  const hours = generateHours();
  const minutes = generateMinutes();

  function handleHour(h: string) {
    onChange(`${h}:${minuteStr || '00'}`);
  }

  function handleMinute(m: string) {
    onChange(`${hourStr || '09'}:${m}`);
  }

  const selectBase = [
    'rounded-md border border-border-soft bg-surface px-3 py-3',
    'font-mono text-sm text-text-primary',
    'transition-colors duration-120 ease-out',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-primary',
    'cursor-pointer',
  ].join(' ');

  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-sans text-sm font-medium text-text-primary">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <select
          value={hourStr}
          onChange={(e) => handleHour(e.target.value)}
          className={selectBase}
          aria-label={`${label} hour`}
        >
          {hours.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <span className="font-mono text-base font-medium text-text-secondary">:</span>
        <select
          value={minuteStr}
          onChange={(e) => handleMinute(e.target.value)}
          className={selectBase}
          aria-label={`${label} minute`}
        >
          {minutes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
