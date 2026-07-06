import { Navigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

type Props = {
  children: React.ReactNode;
};

export function ProtectedRoute({ children }: Props) {
  const user = useAppStore((s) => s.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
