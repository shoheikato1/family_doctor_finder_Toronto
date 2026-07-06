import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { SidebarNav } from '../components/design-system/SidebarNav';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../components/design-system/Toast';

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const user = useAppStore((s) => s.user);
  const profile = useAppStore((s) => s.profile);
  const signOut = useAppStore((s) => s.signOut);

  function handleSignOut() {
    signOut();
    navigate('/login');
    addToast('Signed out.', 'info');
  }

  const firstName = profile?.firstName ?? user?.email?.split('@')[0] ?? 'You';
  const email = user?.email ?? '';

  return (
    <div className="min-h-screen bg-background-base" style={{ minWidth: '1024px' }}>
      <SidebarNav
        currentRoute={location.pathname}
        user={{ firstName, email }}
        onNavigate={(route) => navigate(route)}
        onSignOut={handleSignOut}
      />
      <main className="ml-60 min-h-screen flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
