import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, Bookmark, BookmarkCheck, Search, ExternalLink } from 'lucide-react';
import { PageHeader } from '../components/design-system/PageHeader';
import { Card } from '../components/design-system/Card';
import { Banner } from '../components/design-system/Banner';
import { Button } from '../components/design-system/Button';
import { Select } from '../components/design-system/Select';
import { MultiSelect } from '../components/design-system/MultiSelect';
import { StatusPill } from '../components/design-system/StatusPill';
import { Tag } from '../components/design-system/Tag';
import { EmptyState } from '../components/design-system/EmptyState';
import { useToast } from '../components/design-system/Toast';
import { useAppStore } from '../store/useAppStore';
import { useClinicCatalog, LANGUAGE_LABELS } from '../lib/clinicCatalog';
import { isRealMode } from '../lib/backendMode';
import { postApi, failureMessage, type ApiFailure } from '../lib/api';
import { clinicFromScouted, type ScoutResponse } from '../lib/repositories/clinics';
import type { ClinicStatusValue } from '../store/types';

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'not_called', label: 'Not called' },
  { value: 'calling', label: 'Calling' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'voicemail_left', label: 'Voicemail left' },
  { value: 'no_answer', label: 'No answer' },
];

const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'distance', label: 'Distance (closest first)' },
  { value: 'recent', label: 'Most recently contacted' },
  { value: 'priority', label: 'Status priority (accepted first)' },
];

const STATUS_PRIORITY_ORDER: ClinicStatusValue[] = [
  'accepted', 'calling', 'voicemail_left', 'no_answer', 'rejected', 'not_called',
];

/**
 * Health Care Connect guidance (move S3): the provincial registry is not a data
 * source, it is advice we surface in both modes.
 */
function HealthCareConnectCard() {
  return (
    <Card>
      <h3 className="font-sans text-base font-semibold text-text-primary mb-2">
        Also register with Health Care Connect
      </h3>
      <p className="font-sans text-sm text-text-secondary leading-relaxed mb-3">
        No matter what, also register with Ontario's Health Care Connect, the
        province searches for you too.
      </p>
      <a
        href="https://www.ontario.ca/page/find-family-doctor-or-nurse-practitioner"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 font-sans text-sm text-secondary hover:text-text-primary underline transition-colors duration-120"
      >
        <ExternalLink size={13} strokeWidth={1.5} className="shrink-0" />
        ontario.ca: Find a family doctor or nurse practitioner
      </a>
      <p className="font-sans text-xs text-text-tertiary mt-3">
        This app never registers on your behalf.
      </p>
    </Card>
  );
}

export function ClinicsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();

  const profile = useAppStore((s) => s.profile);
  const agentSettings = useAppStore((s) => s.agentSettings);
  const clinicStatuses = useAppStore((s) => s.clinicStatuses);
  const shortlist = useAppStore((s) => s.shortlist);
  const setClinicStatus = useAppStore((s) => s.setClinicStatus);
  const addToShortlist = useAppStore((s) => s.addToShortlist);
  const removeFromShortlist = useAppStore((s) => s.removeFromShortlist);
  const initClinicStatuses = useAppStore((s) => s.initClinicStatuses);
  const mergeClinics = useAppStore((s) => s.mergeClinics);

  const catalog = useClinicCatalog();

  // Real mode: "Find clinics" calls POST /api/scout with the session token.
  const [scouting, setScouting] = useState(false);
  const [scoutFailure, setScoutFailure] = useState<ApiFailure | null>(null);

  async function handleFindClinics() {
    setScouting(true);
    setScoutFailure(null);
    const result = await postApi<ScoutResponse>('/api/scout');
    if (result.ok) {
      mergeClinics(result.data.clinics.map(clinicFromScouted));
      addToast(
        result.data.clinics.length === 0
          ? 'No clinics found in your radius. Try widening it.'
          : `Found ${result.data.clinics.length} clinics near you.`,
        result.data.clinics.length === 0 ? 'info' : 'success'
      );
    } else {
      setScoutFailure(result.failure);
    }
    setScouting(false);
  }

  const allLanguages = useMemo(
    () =>
      Array.from(new Set(catalog.flatMap((c) => c.languages))).map((code) => ({
        value: code,
        label: LANGUAGE_LABELS[code] ?? code,
      })),
    [catalog]
  );

  // Ensure all clinic statuses are initialised (idempotent)
  useMemo(() => {
    initClinicStatuses(catalog.map((c) => c.id));
  }, [initClinicStatuses, catalog]);

  // Allow pre-setting the status filter via query param, e.g. /clinics?status=accepted
  const [statusFilter, setStatusFilter] = useState(() => {
    const preset = searchParams.get('status');
    return preset && STATUS_OPTIONS.some((o) => o.value === preset) ? preset : 'all';
  });
  const [languageFilter, setLanguageFilter] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState('distance');

  const filteredClinics = useMemo(() => {
    let list = [...catalog];

    if (statusFilter !== 'all') {
      list = list.filter(
        (c) => (clinicStatuses[c.id]?.status ?? 'not_called') === statusFilter
      );
    }

    if (languageFilter.length > 0) {
      list = list.filter((c) =>
        languageFilter.every((lang) => (c.languages as string[]).includes(lang))
      );
    }

    if (sortOrder === 'distance') {
      // Unknown distances (real-mode clinics restored from Postgres) sort last.
      list.sort(
        (a, b) => (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY)
      );
    } else if (sortOrder === 'recent') {
      list.sort((a, b) => {
        const aTime = clinicStatuses[a.id]?.lastContactedAt ?? '';
        const bTime = clinicStatuses[b.id]?.lastContactedAt ?? '';
        if (!aTime && !bTime) return 0;
        if (!aTime) return 1;
        if (!bTime) return -1;
        return bTime.localeCompare(aTime);
      });
    } else if (sortOrder === 'priority') {
      list.sort((a, b) => {
        const aStatus = clinicStatuses[a.id]?.status ?? 'not_called';
        const bStatus = clinicStatuses[b.id]?.status ?? 'not_called';
        return STATUS_PRIORITY_ORDER.indexOf(aStatus) - STATUS_PRIORITY_ORDER.indexOf(bStatus);
      });
    }

    return list;
  }, [catalog, statusFilter, languageFilter, sortOrder, clinicStatuses]);

  if (!profile?.postalCode) {
    return (
      <>
        <PageHeader title="Search Results" />
        <div className="px-8 py-8 flex flex-col gap-6">
          <EmptyState
            title="We need your postal code"
            description="Your profile isn't complete yet. Add your postal code so we can find clinics near you."
            action={{ label: 'Finish your profile', onClick: () => navigate('/onboarding') }}
          />
          <HealthCareConnectCard />
        </div>
      </>
    );
  }

  const postalCode = profile.postalCode;
  const radiusKm = agentSettings?.searchRadiusKm ?? 5;

  return (
    <>
      <PageHeader
        title="Search Results"
        subtitle={`${catalog.length} clinics within ${radiusKm} km of ${postalCode}`}
        actions={
          <div className="flex items-center gap-2">
            {isRealMode && (
              <Button
                variant="primary"
                size="sm"
                iconLeft={<Search size={16} strokeWidth={1.5} />}
                loading={scouting}
                onClick={handleFindClinics}
              >
                Find clinics
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate('/agent-config')}>
              Configure agent
            </Button>
          </div>
        }
      />

      <div className="px-8 py-6 flex flex-col gap-6">
        {scoutFailure && (
          <Banner
            variant="warning"
            title={
              scoutFailure.kind === 'not_configured'
                ? failureMessage(scoutFailure)
                : 'Could not search for clinics'
            }
            description={scoutFailure.kind === 'not_configured' ? undefined : failureMessage(scoutFailure)}
            dismissible
          />
        )}

        {/* Filter / sort bar */}
        <div className="flex items-end gap-4">
          <div className="w-44">
            <Select
              label="Status"
              value={statusFilter}
              options={STATUS_OPTIONS}
              onChange={setStatusFilter}
            />
          </div>

          <div className="flex-1 max-w-sm">
            <MultiSelect
              label="Languages"
              value={languageFilter}
              options={allLanguages}
              onChange={setLanguageFilter}
            />
          </div>

          <div className="w-56">
            <Select
              label="Sort by"
              value={sortOrder}
              options={SORT_OPTIONS}
              onChange={setSortOrder}
            />
          </div>

          <div className="ml-auto pb-1">
            <p className="font-sans text-sm text-text-secondary whitespace-nowrap">
              Showing{' '}
              <span className="font-medium text-text-primary">{filteredClinics.length}</span>
              {' '}of {catalog.length} clinics
            </p>
          </div>
        </div>

        {/* Clinic list or empty state */}
        {catalog.length === 0 && isRealMode ? (
          <EmptyState
            icon={<Search size={48} strokeWidth={1.5} className="text-text-tertiary" />}
            title="No clinics yet"
            description="Run the scout to find family doctor offices near your postal code."
            action={{ label: 'Find clinics', onClick: () => void handleFindClinics() }}
          />
        ) : filteredClinics.length === 0 ? (
          <EmptyState
            title="No clinics match your filters"
            description="Try removing a filter to see more results."
            action={{
              label: 'Clear filters',
              onClick: () => {
                setStatusFilter('all');
                setLanguageFilter([]);
              },
            }}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {filteredClinics.map((clinic) => {
              const status = clinicStatuses[clinic.id]?.status ?? 'not_called';
              const isShortlisted = Boolean(shortlist[clinic.id]);

              return (
                <div
                  key={clinic.id}
                  className="cursor-pointer group"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/clinics/${clinic.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') navigate(`/clinics/${clinic.id}`);
                  }}
                >
                  <Card className="group-hover:border-primary transition-colors duration-120">
                    <div className="flex flex-col gap-3">
                      {/* Name + status pill */}
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="font-sans text-base font-semibold text-text-primary leading-snug">
                          {clinic.name}
                        </h3>
                        <div className="shrink-0">
                          <StatusPill status={status} />
                        </div>
                      </div>

                      {/* Address + distance */}
                      <div className="flex items-center gap-1.5">
                        <MapPin size={13} strokeWidth={1.5} className="text-text-tertiary shrink-0" />
                        <p className="font-sans text-sm text-text-secondary">
                          {clinic.address}
                        </p>
                        {clinic.distanceKm != null && (
                          <span className="font-sans text-xs text-text-tertiary ml-1">
                            · {clinic.distanceKm} km away
                          </span>
                        )}
                      </div>

                      {/* Tag row */}
                      {(clinic.walkInOk || clinic.telehealthOk || clinic.languages.length > 0) && (
                        <div
                          className="flex flex-wrap gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {clinic.walkInOk && <Tag>Walk-in OK</Tag>}
                          {clinic.telehealthOk && <Tag>Telehealth OK</Tag>}
                          {clinic.languages.map((lang) => (
                            <Tag key={lang}>{LANGUAGE_LABELS[lang] ?? lang}</Tag>
                          ))}
                        </div>
                      )}

                      {/* Action row */}
                      <div
                        className="flex items-center gap-3 pt-2 border-t border-border-soft"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="w-44">
                          <Select
                            label=""
                            value={status}
                            options={(STATUS_OPTIONS.filter((o) => o.value !== 'all') as Array<{ value: ClinicStatusValue; label: string }>)}
                            onChange={(val) => setClinicStatus(clinic.id, val)}
                          />
                        </div>

                        <div className="ml-auto flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/clinics/${clinic.id}`)}
                          >
                            View details
                          </Button>
                          <Button
                            variant={isShortlisted ? 'secondary' : 'ghost'}
                            size="sm"
                            iconLeft={
                              isShortlisted
                                ? <BookmarkCheck size={14} strokeWidth={1.5} />
                                : <Bookmark size={14} strokeWidth={1.5} />
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
                            {isShortlisted ? 'Shortlisted' : 'Add to shortlist'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        )}

        {/* Provincial guidance, shown in both modes (move S3) */}
        <HealthCareConnectCard />
      </div>
    </>
  );
}
