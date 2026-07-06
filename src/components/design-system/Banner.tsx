import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

type BannerProps = {
  variant?: 'info' | 'warning';
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  dismissible?: boolean;
};

const variantBorderClasses: Record<NonNullable<BannerProps['variant']>, string> = {
  info: 'border-l-secondary',
  warning: 'border-l-status-pending',
};

export function Banner({
  variant = 'info',
  title,
  description,
  action,
  dismissible = false,
}: BannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className={[
        'flex items-start gap-4 bg-surface border border-border-soft border-l-4 rounded-lg px-5 py-4',
        'z-banner',
        variantBorderClasses[variant],
      ].join(' ')}
      role="status"
    >
      <div className="flex-1 min-w-0">
        <p className="font-sans text-sm font-medium text-text-primary">{title}</p>
        {description && (
          <p className="font-sans text-sm text-text-secondary mt-1 leading-relaxed">
            {description}
          </p>
        )}
        {action && (
          <div className="mt-3">
            <Button variant="ghost" size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          </div>
        )}
      </div>

      {dismissible && (
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 text-text-secondary hover:text-text-primary transition-colors duration-120 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
          aria-label="Dismiss banner"
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}
