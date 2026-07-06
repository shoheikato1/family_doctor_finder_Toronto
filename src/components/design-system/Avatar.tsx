type AvatarProps = {
  firstName: string;
  lastName?: string;
  size?: 'sm' | 'md' | 'lg';
};

const sizeConfig = {
  sm: { container: 'w-8 h-8', text: 'text-xs' },
  md: { container: 'w-12 h-12', text: 'text-sm' },
  lg: { container: 'w-16 h-16', text: 'text-lg' },
};

export function Avatar({ firstName, lastName, size = 'md' }: AvatarProps) {
  const initials =
    firstName.charAt(0).toUpperCase() +
    (lastName ? lastName.charAt(0).toUpperCase() : '');

  const { container, text } = sizeConfig[size];

  return (
    <div
      className={`${container} rounded-pill bg-primary text-surface flex items-center justify-center font-sans font-medium shrink-0 ${text}`}
      aria-label={`${firstName}${lastName ? ` ${lastName}` : ''} avatar`}
    >
      {initials}
    </div>
  );
}
