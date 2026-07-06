import { ReactNode } from 'react';

type TagProps = {
  children: ReactNode;
  size?: 'sm' | 'md';
};

export function Tag({ children, size = 'sm' }: TagProps) {
  const sizeClasses =
    size === 'sm'
      ? 'text-xs py-1 px-2'
      : 'text-sm py-1.5 px-2.5';

  return (
    <span
      className={`inline-block rounded-pill bg-surface border border-border-soft text-text-secondary font-sans ${sizeClasses}`}
    >
      {children}
    </span>
  );
}
