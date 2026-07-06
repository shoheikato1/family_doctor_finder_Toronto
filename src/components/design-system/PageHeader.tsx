import { ReactNode } from 'react';
import { Bell } from 'lucide-react';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  notificationBell?: { count: number; onClick: () => void };
};

export function PageHeader({
  title,
  subtitle,
  actions,
  notificationBell,
}: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-page-header bg-background-base border-b border-border-soft px-8 py-5 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <h1 className="font-sans text-2xl font-semibold text-text-primary leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="font-sans text-sm text-text-secondary mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {actions}

        {notificationBell && (
          <button
            type="button"
            onClick={notificationBell.onClick}
            className="relative text-text-secondary hover:text-text-primary transition-colors duration-120 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm p-1"
            aria-label={`Notifications${notificationBell.count > 0 ? `, ${notificationBell.count} unread` : ''}`}
          >
            <Bell size={20} strokeWidth={1.5} />
            {notificationBell.count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-pill bg-brand-accent text-surface text-[10px] font-medium leading-none">
                {notificationBell.count > 9 ? '9+' : notificationBell.count}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
