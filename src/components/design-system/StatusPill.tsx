type StatusPillStatus =
  | 'not_called'
  | 'calling'
  | 'accepted'
  | 'rejected'
  | 'voicemail_left'
  | 'no_answer';

type StatusPillProps = {
  status: StatusPillStatus;
};

const statusConfig: Record<
  StatusPillStatus,
  { label: string; className: string }
> = {
  not_called: {
    label: 'Not called',
    className: 'bg-border-soft text-text-secondary',
  },
  calling: {
    label: 'Calling',
    className: 'bg-status-calling text-surface animate-pulse-calling',
  },
  accepted: {
    label: 'Accepted',
    className: 'bg-status-accepted text-surface',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-status-rejected text-surface',
  },
  voicemail_left: {
    label: 'Voicemail left',
    className: 'bg-status-pending text-text-primary',
  },
  no_answer: {
    label: 'No answer',
    className: 'bg-status-no-answer text-surface',
  },
};

export function StatusPill({ status }: StatusPillProps) {
  const { label, className } = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center rounded-pill px-3 py-1 text-xs font-sans font-medium leading-none ${className}`}
    >
      {label}
    </span>
  );
}
