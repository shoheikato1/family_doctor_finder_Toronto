import { Home, List, Bookmark, Settings, Heart } from 'lucide-react';
import { UserCard } from './UserCard';
import { Button } from './Button';
import { Tag } from './Tag';

type NavItem = {
  route: string;
  label: string;
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  { route: '/dashboard', label: 'Dashboard', icon: <Home size={20} strokeWidth={1.5} /> },
  { route: '/clinics', label: 'Search results', icon: <List size={20} strokeWidth={1.5} /> },
  { route: '/shortlist', label: 'Shortlist', icon: <Bookmark size={20} strokeWidth={1.5} /> },
  { route: '/agent-config', label: 'Agent setup', icon: <Settings size={20} strokeWidth={1.5} /> },
];

type SidebarNavProps = {
  currentRoute: string;
  user: { firstName: string; email: string };
  onNavigate: (route: string) => void;
  onSignOut: () => void;
  backendBadge?: string; // small footer Tag, e.g. "Demo mode" / "Live backend"
};

export function SidebarNav({
  currentRoute,
  user,
  onNavigate,
  onSignOut,
  backendBadge,
}: SidebarNavProps) {
  return (
    <nav
      className="fixed top-0 left-0 w-60 h-screen z-sidebar bg-surface border-r border-border-soft flex flex-col"
      aria-label="Main navigation"
    >
      {/* Wordmark */}
      <div className="px-6 pt-8 pb-6">
        <p className="font-sans text-lg font-semibold text-text-primary leading-snug">
          Let's Find
        </p>
        <p className="font-sans text-lg font-semibold text-primary leading-snug">
          Family Doctor
        </p>
        <div className="flex items-center gap-1 mt-1">
          <Heart size={12} strokeWidth={1.5} fill="currentColor" className="text-brand-accent shrink-0" />
          <span className="font-sans text-xs text-text-tertiary">
            Toronto, Ontario
          </span>
        </div>
      </div>

      {/* Nav items */}
      <ul className="flex flex-col gap-0.5 px-3 flex-1" role="list">
        {navItems.map((item) => {
          const isActive =
            item.route === '/clinics'
              ? currentRoute === '/clinics' || currentRoute.startsWith('/clinics/')
              : currentRoute === item.route;
          return (
            <li key={item.route}>
              <button
                type="button"
                onClick={() => onNavigate(item.route)}
                className={[
                  'w-full flex items-center gap-3 px-4 py-3 rounded-md text-left',
                  'font-sans text-sm transition-colors duration-120 ease-out',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                  isActive
                    ? 'bg-background-base text-text-primary font-medium border-l-[3px] border-primary -ml-[3px] pl-[19px]'
                    : 'text-text-secondary hover:text-text-primary hover:bg-background-base',
                ].join(' ')}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className={isActive ? 'text-primary' : 'text-text-tertiary'}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>

      {/* User area */}
      <div className="border-t border-border-soft pb-6">
        <UserCard
          firstName={user.firstName}
          email={user.email}
        />
        <div className="px-4">
          <Button variant="ghost" size="sm" onClick={onSignOut}>
            Sign out
          </Button>
        </div>
        {backendBadge && (
          <div className="px-6 pt-3">
            <Tag size="sm">{backendBadge}</Tag>
          </div>
        )}
      </div>
    </nav>
  );
}
