import { Navigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

type Props = {
  children: React.ReactNode;
};

export function ProtectedRoute({ children }: Props) {
  const authLoaded = useAppStore((s) => s.authLoaded);
  const user = useAppStore((s) => s.user);

  // Real mode: the session restore is async. NEVER redirect before it resolves
  // (the three-state undefined/null/present bug; battle-plan P4 countermove).
  // Demo mode: authLoaded is always true.
  if (!authLoaded) {
    return <div className="min-h-screen bg-background-base" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
