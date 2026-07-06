import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, MapPin, Phone, CalendarDays } from 'lucide-react';
import { PageHeader } from '../components/design-system/PageHeader';
import { Card } from '../components/design-system/Card';
import { Button } from '../components/design-system/Button';
import { StatusPill } from '../components/design-system/StatusPill';
import { Tag } from '../components/design-system/Tag';
import { EmptyState } from '../components/design-system/EmptyState';
import { Modal } from '../components/design-system/Modal';
import { TimePicker } from '../components/design-system/TimePicker';
import { useToast } from '../components/design-system/Toast';
import { useAppStore } from '../store/useAppStore';
import { useClinicCatalog, LANGUAGE_LABELS } from '../lib/clinicCatalog';
import type { ClinicStatusValue } from '../store/types';

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

function maxDateIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 60);
  return d.toISOString().split('T')[0];
}

function formatBookingDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

type BookingModalState = {
  clinicId: string;
  clinicName: string;
  date: string;
  time: string;
  notes: string;
};

export function ShortlistPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const shortlist = useAppStore((s) => s.shortlist);
  const clinicStatuses = useAppStore((s) => s.clinicStatuses);
  const removeFromShortlist = useAppStore((s) => s.removeFromShortlist);
  const updateShortlistEntry = useAppStore((s) => s.updateShortlistEntry);

  const [bookingModal, setBookingModal] = useState<BookingModalState | null>(null);

  const catalog = useClinicCatalog();
  const shortlistedClinics = catalog.filter((c) => Boolean(shortlist[c.id]));

  function openBookingModal(clinicId: string, clinicName: string) {
    const existing = shortlist[clinicId];
    setBookingModal({
      clinicId,
      clinicName,
      date: existing?.bookingDate?.split('T')[0] ?? todayIso(),
      time: existing?.bookingDate?.split('T')[1]?.slice(0, 5) ?? '09:00',
      notes: existing?.bookingNotes ?? '',
    });
  }

  function saveBooking() {
    if (!bookingModal) return;
    const isoDateTime = `${bookingModal.date}T${bookingModal.time}:00`;
    updateShortlistEntry(bookingModal.clinicId, {
      bookingDate: isoDateTime,
      bookingNotes: bookingModal.notes,
    });
    addToast('Booking saved', 'success');
    setBookingModal(null);
  }

  return (
    <>
      <PageHeader
        title="Shortlist"
        subtitle={`${shortlistedClinics.length} clinic${shortlistedClinics.length === 1 ? '' : 's'} you've saved`}
      />

      <div className="px-8 py-6">
        {shortlistedClinics.length === 0 ? (
          <EmptyState
            icon={<Bookmark size={40} strokeWidth={1} />}
            title="Your shortlist is empty"
            description="Clinics you accept and save will appear here."
            action={{ label: 'Browse search results', onClick: () => navigate('/clinics') }}
          />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {shortlistedClinics.map((clinic) => {
              const entry = shortlist[clinic.id];
              const status: ClinicStatusValue = clinicStatuses[clinic.id]?.status ?? 'not_called';

              return (
                <Card key={clinic.id} className="flex flex-col gap-3">
                  {/* Name + status */}
                  <div className="flex items-start justify-between gap-3">
                    <h3
                      className="font-sans text-base font-semibold text-text-primary leading-snug cursor-pointer hover:text-primary transition-colors duration-120"
                      onClick={() => navigate(`/clinics/${clinic.id}`)}
                    >
                      {clinic.name}
                    </h3>
                    <div className="shrink-0">
                      <StatusPill status={status} />
                    </div>
                  </div>

                  {/* Address */}
                  <div className="flex items-start gap-1.5">
                    <MapPin size={13} strokeWidth={1.5} className="text-text-tertiary mt-0.5 shrink-0" />
                    <p className="font-sans text-sm text-text-secondary">{clinic.address}</p>
                  </div>

                  {/* Phone */}
                  <div className="flex items-center gap-1.5">
                    <Phone size={13} strokeWidth={1.5} className="text-text-tertiary shrink-0" />
                    <span className="font-mono text-sm text-text-secondary">{clinic.phone}</span>
                  </div>

                  {/* Language tags */}
                  {(clinic.languages.length > 0 || clinic.walkInOk || clinic.telehealthOk) && (
                    <div className="flex flex-wrap gap-1.5">
                      {clinic.languages.map((lang) => (
                        <Tag key={lang}>{LANGUAGE_LABELS[lang] ?? lang}</Tag>
                      ))}
                      {clinic.walkInOk && <Tag>Walk-in OK</Tag>}
                      {clinic.telehealthOk && <Tag>Telehealth OK</Tag>}
                    </div>
                  )}

                  {/* Booking info */}
                  <div className="flex items-center gap-1.5 min-h-5">
                    {entry?.bookingDate ? (
                      <>
                        <CalendarDays size={13} strokeWidth={1.5} className="text-primary shrink-0" />
                        <p className="font-sans text-sm text-text-primary">
                          Booked for {formatBookingDate(entry.bookingDate.split('T')[0])}
                        </p>
                      </>
                    ) : (
                      <p className="font-sans text-sm text-text-tertiary">No booking yet</p>
                    )}
                  </div>

                  {/* Footer actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border-soft">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => openBookingModal(clinic.id, clinic.name)}
                    >
                      {entry?.bookingDate ? 'Edit booking' : 'Book a meet and greet'}
                    </Button>
                    <Button
                      variant="dangerGhost"
                      size="sm"
                      onClick={() => {
                        removeFromShortlist(clinic.id);
                        addToast('Removed from shortlist', 'info');
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Booking modal */}
      {bookingModal && (
        <Modal
          open={Boolean(bookingModal)}
          onClose={() => setBookingModal(null)}
          title={`Book a meet and greet with ${bookingModal.clinicName}`}
          primaryAction={{ label: 'Save booking', onClick: saveBooking }}
          secondaryAction={{ label: 'Cancel', onClick: () => setBookingModal(null) }}
        >
          <div className="flex flex-col gap-5">
            {/* Date */}
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-sm font-medium text-text-primary">
                Date
              </label>
              <input
                type="date"
                value={bookingModal.date}
                min={todayIso()}
                max={maxDateIso()}
                onChange={(e) => setBookingModal((prev) => prev ? { ...prev, date: e.target.value } : null)}
                className={[
                  'w-full rounded-md border border-border-soft bg-surface px-4 py-3',
                  'font-sans text-base text-text-primary',
                  'transition-colors duration-120',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary',
                ].join(' ')}
              />
            </div>

            {/* Time */}
            <TimePicker
              label="Time"
              value={bookingModal.time}
              onChange={(t) => setBookingModal((prev) => prev ? { ...prev, time: t } : null)}
            />

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-sm font-medium text-text-primary">
                Notes for your visit{' '}
                <span className="font-normal text-text-tertiary">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={bookingModal.notes}
                onChange={(e) => setBookingModal((prev) => prev ? { ...prev, notes: e.target.value } : null)}
                placeholder="Questions to ask, things to bring, anything to prepare."
                className={[
                  'w-full rounded-md border border-border-soft bg-surface px-4 py-3',
                  'font-sans text-sm text-text-primary placeholder:text-text-tertiary',
                  'resize-none transition-colors duration-120',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary',
                ].join(' ')}
              />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
