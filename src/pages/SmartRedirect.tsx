import { Navigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

export function SmartRedirect() {
  const authLoaded = useAppStore((s) => s.authLoaded);
  const user = useAppStore((s) => s.user);

  // Never redirect while the session restore is still resolving (P4 countermove).
  if (!authLoaded) {
    return <div className="min-h-screen bg-background-base" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Whether the profile is complete or not, always go to dashboard.
  // The dashboard will show the "finish your profile" banner if incomplete.
  return <Navigate to="/dashboard" replace />;
}
