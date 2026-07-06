import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Bookmark, BookmarkCheck } from 'lucide-react';
import { PageHeader } from '../components/design-system/PageHeader';
import { Card } from '../components/design-system/Card';
import { Button } from '../components/design-system/Button';
import { Select } from '../components/design-system/Select';
import { MultiSelect } from '../components/design-system/MultiSelect';
import { StatusPill } from '../components/design-system/StatusPill';
import { Tag } from '../components/design-system/Tag';
import { EmptyState } from '../components/design-system/EmptyState';
import { useToast } from '../components/design-system/Toast';
import { useAppStore } from '../store/useAppStore';
import { MOCK_CLINICS, LANGUAGE_LABELS } from '../mock/clinics';
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

const ALL_LANGUAGES = Array.from(
  new Set(MOCK_CLINICS.flatMap((c) => c.languages))
).map((code) => ({ value: code, label: LANGUAGE_LABELS[code] ?? code }));

export function ClinicsPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const profile = useAppStore((s) => s.profile);
  const agentSettings = useAppStore((s) => s.agentSettings);
  const clinicStatuses = useAppStore((s) => s.clinicStatuses);
  const shortlist = useAppStore((s) => s.shortlist);
  const setClinicStatus = useAppStore((s) => s.setClinicStatus);
  const addToShortlist = useAppStore((s) => s.addToShortlist);
  const removeFromShortlist = useAppStore((s) => s.removeFromShortlist);
  const initClinicStatuses = useAppStore((s) => s.initClinicStatuses);

  // Ensure all clinic statuses are initialised (idempotent)
  useMemo(() => {
    initClinicStatuses(MOCK_CLINICS.map((c) => c.id));
  }, [initClinicStatuses]);

  const [statusFilter, setStatusFilter] = useState('all');
  const [languageFilter, setLanguageFilter] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState('distance');

  const filteredClinics = useMemo(() => {
    let list = [...MOCK_CLINICS];

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
      list.sort((a, b) => a.distanceKm - b.distanceKm);
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
  }, [statusFilter, languageFilter, sortOrder, clinicStatuses]);

  if (!profile?.postalCode) {
    return (
      <>
        <PageHeader title="Search Results" />
        <div className="px-8 py-8">
          <EmptyState
            title="We need your postal code"
            description="Your profile isn't complete yet. Add your postal code so we can find clinics near you."
            action={{ label: 'Finish your profile', onClick: () => navigate('/onboarding') }}
          />
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
        subtitle={`${MOCK_CLINICS.length} clinics within ${radiusKm} km of ${postalCode}`}
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('/agent-config')}>
            Configure agent
          </Button>
        }
      />

      <div className="px-8 py-6 flex flex-col gap-6">
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
              options={ALL_LANGUAGES}
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
              {' '}of {MOCK_CLINICS.length} clinics
            </p>
          </div>
        </div>

        {/* Clinic list or empty state */}
        {filteredClinics.length === 0 ? (
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
                        <span className="font-sans text-xs text-text-tertiary ml-1">
                          · {clinic.distanceKm} km away
                        </span>
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
      </div>
    </>
  );
}
