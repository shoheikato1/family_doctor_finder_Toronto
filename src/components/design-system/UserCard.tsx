import { Avatar } from './Avatar';

type UserCardProps = {
  firstName: string;
  lastName?: string;
  email: string;
};

export function UserCard({ firstName, lastName, email }: UserCardProps) {
  const displayName = lastName ? `${firstName} ${lastName}` : firstName;

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Avatar firstName={firstName} lastName={lastName} size="md" />
      <div className="flex flex-col min-w-0">
        <span className="font-sans text-sm font-medium text-text-primary truncate">
          {displayName}
        </span>
        <span className="font-sans text-xs text-text-secondary truncate">
          {email}
        </span>
      </div>
    </div>
  );
}
