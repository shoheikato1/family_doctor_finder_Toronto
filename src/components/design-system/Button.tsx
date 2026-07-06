import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type ButtonProps = {
  variant: 'primary' | 'secondary' | 'ghost' | 'dangerGhost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  onClick: () => void;
  children: ReactNode;
  type?: 'button' | 'submit' | 'reset';
};

const variantClasses: Record<ButtonProps['variant'], string> = {
  primary:
    'bg-primary hover:bg-primary-hover text-surface border-transparent',
  secondary:
    'bg-secondary hover:bg-secondary/90 text-surface border-transparent',
  ghost:
    'bg-transparent hover:bg-background-base text-text-primary border-transparent hover:border-border-soft',
  dangerGhost:
    'bg-transparent hover:bg-background-base text-status-rejected border-transparent hover:border-border-soft',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'text-sm px-3 py-2 gap-1.5',
  md: 'text-[15px] px-5 py-3 gap-2',
  lg: 'text-base px-6 py-3.5 gap-2',
};

export function Button({
  variant,
  size = 'md',
  disabled = false,
  loading = false,
  iconLeft,
  iconRight,
  onClick,
  children,
  type = 'button',
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center font-sans font-medium rounded-md border',
        'transition-colors duration-120 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        variantClasses[variant],
        sizeClasses[size],
        isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      {loading ? (
        <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
      ) : (
        <>
          {iconLeft && <span className="shrink-0">{iconLeft}</span>}
          {children}
          {iconRight && <span className="shrink-0">{iconRight}</span>}
        </>
      )}
    </button>
  );
}
