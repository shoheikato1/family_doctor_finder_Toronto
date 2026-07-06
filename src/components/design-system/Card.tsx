import { ReactNode } from 'react';

type CardProps = {
  children: ReactNode;
  padding?: 'sm' | 'md' | 'lg';
  className?: string;
};

const paddingClasses = {
  sm: 'p-3',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({ children, padding = 'md', className = '' }: CardProps) {
  return (
    <div
      className={`bg-surface border border-border-soft rounded-lg ${paddingClasses[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
