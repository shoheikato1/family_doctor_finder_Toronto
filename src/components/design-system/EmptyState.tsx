import { ReactNode } from 'react';
import { Button } from './Button';

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
};

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 px-8 text-center">
      {icon && (
        <div className="text-text-tertiary">{icon}</div>
      )}
      <div className="flex flex-col gap-2 max-w-xs">
        <h3 className="font-sans text-lg font-medium text-text-primary">
          {title}
        </h3>
        {description && (
          <p className="font-sans text-sm text-text-secondary leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
