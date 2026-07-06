import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/design-system/Toast';
import { AppShell } from './layouts/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { SmartRedirect } from './pages/SmartRedirect';
import { LoginPage } from './pages/LoginPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { AgentConfigPage } from './pages/AgentConfigPage';
import { ClinicsPage } from './pages/ClinicsPage';
import { ClinicDetailPage } from './pages/ClinicDetailPage';
import { ShortlistPage } from './pages/ShortlistPage';
import { Showcase } from './pages/Showcase';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          {/* Smart redirect */}
          <Route path="/" element={<SmartRedirect />} />

          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Onboarding: protected but not wrapped in AppShell */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />

          {/* Authenticated routes wrapped in AppShell */}
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/agent-config" element={<AgentConfigPage />} />
            <Route path="/clinics" element={<ClinicsPage />} />
            <Route path="/clinics/:id" element={<ClinicDetailPage />} />
            <Route path="/shortlist" element={<ShortlistPage />} />
          </Route>

          {/* Dev-only route: component library showcase */}
          <Route path="/showcase" element={<Showcase />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}
