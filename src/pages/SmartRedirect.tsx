import { Navigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

export function SmartRedirect() {
  const user = useAppStore((s) => s.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Whether the profile is complete or not, always go to dashboard.
  // The dashboard will show the "finish your profile" banner if incomplete.
  return <Navigate to="/dashboard" replace />;
}
