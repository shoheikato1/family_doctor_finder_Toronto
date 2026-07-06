import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Phone, CheckCircle2, Building2 } from 'lucide-react';
import { PageHeader } from '../components/design-system/PageHeader';
import { Card } from '../components/design-system/Card';
import { Banner } from '../components/design-system/Banner';
import { Button } from '../components/design-system/Button';
import { EmptyState } from '../components/design-system/EmptyState';
import { useToast } from '../components/design-system/Toast';
import { useAppStore } from '../store/useAppStore';
import { MOCK_CLINICS } from '../mock/clinics';

export function DashboardPage() {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const profile = useAppStore((s) => s.profile);
  const agentRun = useAppStore((s) => s.agentRun);
  const clinicStatuses = useAppStore((s) => s.clinicStatuses);

  const { addToast } = useToast();

  const firstName = profile?.firstName ?? user?.email?.split('@')[0] ?? 'there';

  const showBanner = !profile || !profile.isComplete || profile.ohipSkipped;

  // Quick stats
  const totalClinics = MOCK_CLINICS.length;
  const allStatuses = Object.values(clinicStatuses);
  const calledCount = allStatuses.filter((s) => s.status !== 'not_called').length;
  const acceptedCount = allStatuses.filter((s) => s.status === 'accepted').length;

  // Recent activity: last 5 timeline events across all clinics
  const recentEvents = allStatuses
    .flatMap((s) =>
      s.statusTimeline.map((e) => ({
        clinicId: s.clinicId,
        status: e.status,
        timestamp: e.timestamp,
      }))
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  return (
    <>
      {showBanner && (
        <div className="px-8 pt-6">
          <Banner
            variant="warning"
            title="Your profile is incomplete"
            description={
              profile?.ohipSkipped && profile?.isComplete
                ? "You skipped the health card step. Adding your OHIP number helps clinics pre-screen you."
                : "A few details are missing. Completing your profile helps the agent find the best matches."
            }
            action={{ label: 'Finish your profile', onClick: () => navigate('/onboarding') }}
            dismissible
          />
        </div>
      )}

      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${firstName}.`}
        actions={
          <Button
            variant="primary"
            size="sm"
            iconLeft={<Settings size={16} strokeWidth={1.5} />}
            onClick={() => navigate('/agent-config')}
          >
            Start new search
          </Button>
        }
        notificationBell={{ count: 0, onClick: () => addToast('No new notifications.', 'info') }}
      />

      <div className="px-8 py-8 flex flex-col gap-8">
        {/* Quick stats row */}
        <div className="grid grid-cols-3 gap-6">
          <StatCard
            label="Clinics in catalog"
            value={totalClinics}
            icon={<Building2 size={20} strokeWidth={1.5} className="text-secondary" />}
          />
          <StatCard
            label="Clinics called"
            value={calledCount}
            icon={<Phone size={20} strokeWidth={1.5} className="text-status-calling" />}
          />
          <StatCard
            label="Accepted"
            value={acceptedCount}
            icon={<CheckCircle2 size={20} strokeWidth={1.5} className="text-status-accepted" />}
          />
        </div>

        {/* Run state card */}
        <div>
          <h2 className="font-sans text-base font-medium text-text-primary mb-4">
            Agent run
          </h2>
          <Card>
            {!agentRun || agentRun.state === 'idle' ? (
              <EmptyState
                icon={<Settings size={48} strokeWidth={1.5} className="text-text-tertiary" />}
                title="No search run yet"
                description="Configure the agent and run your first search to see results here."
                action={{
                  label: 'Set up agent',
                  onClick: () => navigate('/agent-config'),
                }}
              />
            ) : null}
            {/* Running and complete states: Phase 4 */}
          </Card>
        </div>

        {/* Recent activity */}
        <div>
          <h2 className="font-sans text-base font-medium text-text-primary mb-4">
            Recent activity
          </h2>
          <Card>
            {recentEvents.length === 0 ? (
              <p className="font-sans text-sm text-text-secondary text-center py-4">
                Activity will appear here after your first run.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border-soft">
                {recentEvents.map((event, i) => {
                  const clinic = MOCK_CLINICS.find((c) => c.id === event.clinicId);
                  return (
                    <li key={i} className="flex items-center justify-between py-3">
                      <span className="font-sans text-sm text-text-primary">
                        {clinic?.name ?? event.clinicId}
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="font-sans text-xs text-text-tertiary capitalize">
                          {event.status.replace(/_/g, ' ')}
                        </span>
                        <span className="font-mono text-xs text-text-tertiary">
                          {new Date(event.timestamp).toLocaleTimeString('en-CA', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <p className="font-sans text-sm text-text-secondary">{label}</p>
          <p className="font-sans text-3xl font-semibold text-text-primary leading-none">
            {value}
          </p>
        </div>
        <div className="mt-0.5">{icon}</div>
      </div>
    </Card>
  );
}
