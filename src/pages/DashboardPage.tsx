import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Phone, CheckCircle2, Building2 } from 'lucide-react';
import { PageHeader } from '../components/design-system/PageHeader';
import { Card } from '../components/design-system/Card';
import { Banner } from '../components/design-system/Banner';
import { Button } from '../components/design-system/Button';
import { EmptyState } from '../components/design-system/EmptyState';
import { StatusPill } from '../components/design-system/StatusPill';
import { useToast } from '../components/design-system/Toast';
import { useAppStore } from '../store/useAppStore';
import { MOCK_CLINICS } from '../mock/clinics';
import type { AgentRunResult } from '../store/types';

const RUN_COUNT_LABELS: Array<{ key: AgentRunResult; label: string; dotClass: string }> = [
  { key: 'accepted', label: 'accepted', dotClass: 'bg-status-accepted' },
  { key: 'rejected', label: 'rejected', dotClass: 'bg-status-rejected' },
  { key: 'voicemail_left', label: 'voicemail', dotClass: 'bg-status-pending' },
  { key: 'no_answer', label: 'no answer', dotClass: 'bg-status-no-answer' },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const profile = useAppStore((s) => s.profile);
  const agentRun = useAppStore((s) => s.agentRun);
  const clinicStatuses = useAppStore((s) => s.clinicStatuses);
  const resetAgentRun = useAppStore((s) => s.resetAgentRun);

  const { addToast } = useToast();

  const firstName = profile?.firstName ?? user?.email?.split('@')[0] ?? 'there';

  const showBanner = !profile || !profile.isComplete || profile.ohipSkipped;

  // Agent run derived state
  const isRunActive =
    agentRun?.state === 'running' || agentRun?.state === 'queued';
  const isRunComplete = agentRun?.state === 'complete';

  const runCounts: Record<AgentRunResult, number> = {
    accepted: 0,
    rejected: 0,
    voicemail_left: 0,
    no_answer: 0,
  };
  for (const result of Object.values(agentRun?.results ?? {})) {
    runCounts[result] += 1;
  }

  const currentClinicName = agentRun?.currentClinicId
    ? MOCK_CLINICS.find((c) => c.id === agentRun.currentClinicId)?.name ?? null
    : null;

  const runTotal = agentRun?.totalClinics ?? 0;
  const runProgressPct =
    runTotal > 0 ? Math.round(((agentRun?.callsCompleted ?? 0) / runTotal) * 100) : 0;

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
      {isRunActive && (
        <div className="px-8 pt-6">
          <Banner
            variant="info"
            title="Agent is calling clinics"
            description="This usually takes a few minutes."
          />
        </div>
      )}

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
            ) : isRunActive ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-sans text-base font-semibold text-text-primary">
                    Agent calling clinics now
                  </h3>
                  <StatusPill status="calling" />
                </div>

                <p className="font-sans text-sm text-text-secondary">
                  {agentRun.state === 'queued' ? (
                    'Dialling the first clinic…'
                  ) : (
                    <>
                      Calling clinic{' '}
                      <span className="font-medium text-text-primary">
                        {Math.min(agentRun.callsCompleted + 1, runTotal)}
                      </span>{' '}
                      of {runTotal}
                      {currentClinicName && (
                        <>
                          {' · '}
                          <span className="font-medium text-text-primary">
                            {currentClinicName}
                          </span>
                        </>
                      )}
                    </>
                  )}
                </p>

                {/* Progress bar: the one allowed inline-styled element */}
                <div className="h-2 w-full rounded-pill bg-background-base overflow-hidden">
                  <div
                    className="h-full rounded-pill bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${runProgressPct}%` }}
                  />
                </div>

                <p className="font-sans text-sm text-text-secondary">
                  {RUN_COUNT_LABELS.map(({ key, label }, i) => (
                    <React.Fragment key={key}>
                      {i > 0 && ', '}
                      <span className="font-medium text-text-primary">{runCounts[key]}</span>{' '}
                      {label}
                    </React.Fragment>
                  ))}
                </p>
              </div>
            ) : isRunComplete ? (
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2
                    size={20}
                    strokeWidth={1.5}
                    className="text-status-accepted shrink-0"
                  />
                  <h3 className="font-sans text-base font-semibold text-text-primary">
                    Run complete
                  </h3>
                </div>

                <p className="font-sans text-sm text-text-secondary">
                  The agent called {runTotal} clinics. Here is how it went.
                </p>

                <div className="grid grid-cols-4 gap-4">
                  {RUN_COUNT_LABELS.map(({ key, label, dotClass }) => (
                    <div
                      key={key}
                      className="flex flex-col gap-1 rounded-md bg-background-base px-4 py-3"
                    >
                      <p className="font-sans text-2xl font-semibold text-text-primary leading-none">
                        {runCounts[key]}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-pill shrink-0 ${dotClass}`} />
                        <p className="font-sans text-xs text-text-secondary capitalize">
                          {label}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate('/clinics?status=accepted')}
                  >
                    View accepted clinics
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      resetAgentRun();
                      navigate('/agent-config');
                    }}
                  >
                    Run again
                  </Button>
                </div>
              </div>
            ) : null}
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
