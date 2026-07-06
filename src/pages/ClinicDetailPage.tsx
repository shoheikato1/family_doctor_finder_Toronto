import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Phone, Globe, CheckCircle2, Clock, PlusCircle, MinusCircle } from 'lucide-react';
import { Card } from '../components/design-system/Card';
import { Button } from '../components/design-system/Button';
import { StatusPill } from '../components/design-system/StatusPill';
import { Tag } from '../components/design-system/Tag';
import { EmptyState } from '../components/design-system/EmptyState';
import { useToast } from '../components/design-system/Toast';
import { useAppStore } from '../store/useAppStore';
import { MOCK_CLINICS, LANGUAGE_LABELS } from '../mock/clinics';
import type { ClinicStatusValue } from '../store/types';

const STATUS_LABEL: Record<ClinicStatusValue, string> = {
  not_called: 'Not called',
  calling: 'Calling',
  accepted: 'Accepted',
  rejected: 'Rejected',
  voicemail_left: 'Voicemail left',
  no_answer: 'No answer',
};

const STATUS_DOT: Record<ClinicStatusValue, string> = {
  not_called: 'bg-border-soft',
  calling: 'bg-status-calling',
  accepted: 'bg-status-accepted',
  rejected: 'bg-status-rejected',
  voicemail_left: 'bg-status-pending',
  no_answer: 'bg-secondary',
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function verifiedDaysAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return 'Verified today';
  if (days === 1) return 'Verified 1 day ago';
  return `Verified ${days} days ago`;
}

export function ClinicDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const clinicStatuses = useAppStore((s) => s.clinicStatuses);
  const shortlist = useAppStore((s) => s.shortlist);
  const setClinicStatus = useAppStore((s) => s.setClinicStatus);
  const updateClinicStatus = useAppStore((s) => s.updateClinicStatus);
  const addToShortlist = useAppStore((s) => s.addToShortlist);
  const removeFromShortlist = useAppStore((s) => s.removeFromShortlist);
  const initClinicStatuses = useAppStore((s) => s.initClinicStatuses);

  const clinic = MOCK_CLINICS.find((c) => c.id === id);

  if (!clinic) {
    return (
      <div className="px-8 py-8">
        <EmptyState
          title="Clinic not found"
          description="This clinic doesn't exist in the catalog."
          action={{ label: 'Back to search', onClick: () => navigate('/clinics') }}
        />
      </div>
    );
  }

  if (!clinicStatuses[clinic.id]) {
    initClinicStatuses([clinic.id]);
  }

  const clinicStatus = clinicStatuses[clinic.id];
  const status: ClinicStatusValue = clinicStatus?.status ?? 'not_called';
  const isShortlisted = Boolean(shortlist[clinic.id]);
  const hasCallResult =
    status === 'accepted' ||
    status === 'rejected' ||
    status === 'voicemail_left' ||
    status === 'no_answer';

  return (
    <div className="flex flex-col">
      {/* Header strip */}
      <div className="sticky top-0 z-page-header bg-background-base border-b border-border-soft px-8 py-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/clinics')}
            className="flex items-center gap-1 text-text-secondary hover:text-text-primary transition-colors duration-120 font-sans text-sm shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
          >
            <ChevronLeft size={16} strokeWidth={1.5} />
            Search results
          </button>
          <span className="text-text-tertiary">·</span>
          <h1 className="font-sans text-xl font-semibold text-text-primary leading-tight flex-1 min-w-0 truncate">
            {clinic.name}
          </h1>
          <div className="shrink-0">
            <StatusPill status={status} />
          </div>
        </div>
        <p className="font-sans text-sm text-text-secondary mt-1">
          {clinic.address}
        </p>
      </div>

      {/* Two-column body */}
      <div className="flex gap-6 px-8 py-6 items-start">
        {/* Left — main content */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">
          {/* Clinic information */}
          <Card>
            <h2 className="font-sans text-base font-semibold text-text-primary mb-4">
              Clinic information
            </h2>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <Phone size={14} strokeWidth={1.5} className="text-text-tertiary shrink-0" />
                <span className="font-mono text-sm text-text-primary">{clinic.phone}</span>
              </div>
              {clinic.website && (
                <div className="flex items-center gap-2.5">
                  <Globe size={14} strokeWidth={1.5} className="text-text-tertiary shrink-0" />
                  <a
                    href={clinic.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-sans text-sm text-secondary hover:text-text-primary underline transition-colors duration-120"
                  >
                    {clinic.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={14} strokeWidth={1.5} className="text-text-tertiary shrink-0" />
                <span className="font-sans text-sm text-text-secondary">
                  Accepting new patients:{' '}
                  <span className="font-medium text-text-primary">
                    {clinic.acceptingNewPatients === true
                      ? 'Yes'
                      : clinic.acceptingNewPatients === false
                      ? 'No'
                      : 'Unknown'}
                  </span>
                </span>
              </div>
              {clinic.lastVerifiedAt && (
                <div className="flex items-center gap-2.5">
                  <Clock size={14} strokeWidth={1.5} className="text-text-tertiary shrink-0" />
                  <span className="font-sans text-sm text-text-secondary">
                    {verifiedDaysAgo(clinic.lastVerifiedAt)}
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-border-soft">
              {clinic.languages.map((lang) => (
                <Tag key={lang}>{LANGUAGE_LABELS[lang] ?? lang}</Tag>
              ))}
              {clinic.walkInOk && <Tag>Walk-in OK</Tag>}
              {clinic.telehealthOk && <Tag>Telehealth OK</Tag>}
            </div>
          </Card>

          {/* Call result — visible when call outcome is set AND transcript exists */}
          {hasCallResult && clinicStatus?.callTranscript && (
            <Card>
              <h2 className="font-sans text-base font-semibold text-text-primary mb-4">
                Call result
              </h2>

              {clinicStatus.capturedCriteria ? (
                <div className="mb-5">
                  <h3 className="font-sans text-sm font-medium text-text-secondary mb-2">
                    Captured criteria
                  </h3>
                  <dl className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <dt className="font-sans text-xs text-text-tertiary w-44 shrink-0">Accepting in-person</dt>
                      <dd className="font-sans text-sm text-text-primary">
                        {clinicStatus.capturedCriteria.inPersonOk ? 'Yes' : 'No'}
                      </dd>
                    </div>
                    <div className="flex items-center gap-2">
                      <dt className="font-sans text-xs text-text-tertiary w-44 shrink-0">Telehealth available</dt>
                      <dd className="font-sans text-sm text-text-primary">
                        {clinicStatus.capturedCriteria.telehealthOk ? 'Yes' : 'No'}
                      </dd>
                    </div>
                    {clinicStatus.capturedCriteria.familySizeLimit !== null && (
                      <div className="flex items-center gap-2">
                        <dt className="font-sans text-xs text-text-tertiary w-44 shrink-0">Family size limit</dt>
                        <dd className="font-sans text-sm text-text-primary">
                          {clinicStatus.capturedCriteria.familySizeLimit}
                        </dd>
                      </div>
                    )}
                    {clinicStatus.capturedCriteria.postalCodesAccepted.length > 0 && (
                      <div className="flex items-center gap-2">
                        <dt className="font-sans text-xs text-text-tertiary w-44 shrink-0">Postal codes accepted</dt>
                        <dd className="font-sans text-sm text-text-primary">
                          {clinicStatus.capturedCriteria.postalCodesAccepted.join(', ')}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              ) : (
                <p className="font-sans text-sm text-text-tertiary mb-5">
                  Captured criteria from the agent run will appear here.
                </p>
              )}

              <div>
                <h3 className="font-sans text-sm font-medium text-text-secondary mb-3">
                  Call transcript
                </h3>
                <div className="flex flex-col gap-2">
                  {clinicStatus.callTranscript
                    .split('\n')
                    .filter(Boolean)
                    .map((line, i) => {
                      const isAgent = line.startsWith('Agent:');
                      const text = line.replace(/^(Agent:|Clinic:)\s*/, '');
                      return (
                        <div key={i} className={`flex ${isAgent ? 'justify-start' : 'justify-end'}`}>
                          <div
                            className={[
                              'max-w-[75%] rounded-lg px-3 py-2 font-sans text-sm leading-relaxed',
                              isAgent
                                ? 'bg-background-base text-text-primary'
                                : 'bg-primary text-surface',
                            ].join(' ')}
                          >
                            <span className="font-medium text-xs block mb-0.5 opacity-60">
                              {isAgent ? 'Agent' : 'Clinic'}
                            </span>
                            {text}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </Card>
          )}

          {/* Notes */}
          <Card>
            <h2 className="font-sans text-base font-semibold text-text-primary mb-3">
              Notes
            </h2>
            <textarea
              rows={4}
              value={clinicStatus?.notes ?? ''}
              onChange={(e) => updateClinicStatus(clinic.id, { notes: e.target.value })}
              onBlur={(e) => updateClinicStatus(clinic.id, { notes: e.target.value })}
              placeholder="Add notes about this clinic — follow-up reminders, referral details, anything useful."
              className={[
                'w-full rounded-md border border-border-soft bg-background-base px-4 py-3',
                'font-sans text-sm text-text-primary placeholder:text-text-tertiary',
                'resize-none transition-colors duration-120',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary',
              ].join(' ')}
            />
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="w-72 shrink-0 flex flex-col gap-5">
          {/* Status timeline */}
          <Card>
            <h2 className="font-sans text-sm font-semibold text-text-primary mb-3">
              Status timeline
            </h2>
            {clinicStatus && clinicStatus.statusTimeline.length > 0 ? (
              <ol className="flex flex-col gap-3">
                {[...clinicStatus.statusTimeline].reverse().map((entry, i) => {
                  const s = entry.status as ClinicStatusValue;
                  return (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className={`mt-1.5 w-2 h-2 rounded-pill shrink-0 ${STATUS_DOT[s] ?? 'bg-border-soft'}`} />
                      <div>
                        <p className="font-sans text-sm text-text-primary">{STATUS_LABEL[s] ?? s}</p>
                        <p className="font-sans text-xs text-text-tertiary">{relativeTime(entry.timestamp)}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="font-sans text-sm text-text-tertiary">No activity yet.</p>
            )}
          </Card>

          {/* Quick actions */}
          <Card>
            <h2 className="font-sans text-sm font-semibold text-text-primary mb-3">
              Quick actions
            </h2>
            <div className="flex flex-col gap-2">
              <Button
                variant={isShortlisted ? 'ghost' : 'secondary'}
                size="sm"
                iconLeft={
                  isShortlisted
                    ? <MinusCircle size={14} strokeWidth={1.5} />
                    : <PlusCircle size={14} strokeWidth={1.5} />
                }
                onClick={() => {
                  if (isShortlisted) {
                    removeFromShortlist(clinic.id);
                    addToast('Removed from shortlist', 'info');
                  } else {
                    addToShortlist(clinic.id);
                    addToast('Added to shortlist', 'success');
                  }
                }}
              >
                {isShortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setClinicStatus(clinic.id, 'accepted');
                  addToast('Marked as Accepted', 'success');
                }}
              >
                Mark as Accepted
              </Button>

              <Button
                variant="dangerGhost"
                size="sm"
                onClick={() => {
                  setClinicStatus(clinic.id, 'rejected');
                  addToast('Marked as Rejected', 'info');
                }}
              >
                Mark as Rejected
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
