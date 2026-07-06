import { useState } from 'react';
import {
  Search,
  Inbox,
} from 'lucide-react';

import { Tag } from '../components/design-system/Tag';
import { StatusPill } from '../components/design-system/StatusPill';
import { Avatar } from '../components/design-system/Avatar';
import { Card } from '../components/design-system/Card';
import { Button } from '../components/design-system/Button';
import { Input } from '../components/design-system/Input';
import { Select } from '../components/design-system/Select';
import { MultiSelect } from '../components/design-system/MultiSelect';
import { Toggle } from '../components/design-system/Toggle';
import { Slider } from '../components/design-system/Slider';
import { TimePicker } from '../components/design-system/TimePicker';
import { Modal } from '../components/design-system/Modal';
import { Banner } from '../components/design-system/Banner';
import { EmptyState } from '../components/design-system/EmptyState';
import { UserCard } from '../components/design-system/UserCard';
import { PageHeader } from '../components/design-system/PageHeader';
import { SidebarNav } from '../components/design-system/SidebarNav';
import { Stepper } from '../components/design-system/Stepper';
import { ToastProvider, useToast } from '../components/design-system/Toast';

// ── Local helpers ──────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-16">
      <h2 className="font-sans text-2xl font-semibold text-text-primary mb-8 pb-3 border-b border-border-soft">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <p className="font-sans text-sm text-text-secondary mb-3">{label}</p>
      <div className="flex flex-wrap items-start gap-3">{children}</div>
    </div>
  );
}

// ── Toast demo (must be inside ToastProvider) ─────────────

function ToastDemo() {
  const { addToast } = useToast();
  return (
    <Row label="Trigger toasts (bottom right of viewport)">
      <Button variant="primary" onClick={() => addToast('Clinic added to shortlist.', 'success')}>
        Success toast
      </Button>
      <Button variant="secondary" onClick={() => addToast('Agent settings saved.', 'info')}>
        Info toast
      </Button>
      <Button variant="ghost" onClick={() => addToast('Your OHIP number is missing. Finish your profile to continue.', 'warning')}>
        Warning toast
      </Button>
    </Row>
  );
}

// ── Main showcase ─────────────────────────────────────────

function ShowcaseContent() {
  // Form state
  const [textVal, setTextVal] = useState('');
  const [emailVal, setEmailVal] = useState('');
  const [postalVal, setPostalVal] = useState('');
  const [ohipVal, setOhipVal] = useState('12345679XX');
  const [selectVal, setSelectVal] = useState('en');
  const [multiVal, setMultiVal] = useState<string[]>(['telehealth_ok']);
  const [toggleChecked, setToggleChecked] = useState(true);
  const [sliderVal, setSliderVal] = useState(5);
  const [timeVal, setTimeVal] = useState('09:00');
  const [modalOpen, setModalOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(3);
  const [sidebarRoute, setSidebarRoute] = useState('/dashboard');

  const wizardSteps = [
    { id: 'welcome', label: 'Welcome' },
    { id: 'who', label: 'About you' },
    { id: 'where', label: 'Location' },
    { id: 'health-card', label: 'Health card' },
    { id: 'household', label: 'Household' },
    { id: 'criteria', label: 'Preferences' },
  ];

  return (
    <div className="min-h-screen bg-background-base">
      {/* Page header */}
      <div className="bg-surface border-b border-border-soft px-16 py-8 mb-12">
        <h1 className="font-sans text-3xl font-semibold text-text-primary leading-tight">
          Design System
        </h1>
        <p className="font-sans text-base text-text-secondary mt-2 leading-relaxed">
          Let's find you a family doctor in Ontario: Component Library
        </p>
      </div>

      <div className="px-16 pb-24 max-w-screen-xl">

        {/* ── TIER 1: Primitives ───────────────────────────── */}

        <Section title="Tier 1: Primitives">

          <Row label="Tag, size sm (default)">
            <Tag>English</Tag>
            <Tag>French</Tag>
            <Tag>Mandarin</Tag>
            <Tag>Telehealth OK</Tag>
            <Tag>Walk-in OK</Tag>
          </Row>

          <Row label="Tag, size md">
            <Tag size="md">English</Tag>
            <Tag size="md">Complex care</Tag>
            <Tag size="md">Paediatric</Tag>
          </Row>

          <Row label="StatusPill: all six statuses">
            <StatusPill status="not_called" />
            <StatusPill status="calling" />
            <StatusPill status="accepted" />
            <StatusPill status="rejected" />
            <StatusPill status="voicemail_left" />
            <StatusPill status="no_answer" />
          </Row>

          <Row label="Avatar: sm (32px), md (48px), lg (64px)">
            <Avatar firstName="Shohei" lastName="Kato" size="sm" />
            <Avatar firstName="Shohei" lastName="Kato" size="md" />
            <Avatar firstName="Shohei" lastName="Kato" size="lg" />
            <Avatar firstName="Jane" size="sm" />
            <Avatar firstName="Jane" size="md" />
          </Row>

          <Row label="Card: sm, md (default), lg padding">
            <Card padding="sm" className="w-48">
              <p className="font-sans text-sm text-text-secondary">Small padding</p>
            </Card>
            <Card padding="md" className="w-72">
              <h3 className="font-sans text-base font-medium text-text-primary mb-1">Maple Family Practice</h3>
              <p className="font-sans text-sm text-text-secondary">488 Queen St E, Riverdale</p>
              <div className="flex gap-2 mt-3">
                <Tag>English</Tag>
                <Tag>French</Tag>
              </div>
            </Card>
            <Card padding="lg" className="w-72">
              <p className="font-sans text-sm text-text-secondary">Large padding for wizard steps or featured content areas.</p>
            </Card>
          </Row>

        </Section>

        {/* ── TIER 2: Form Controls ────────────────────────── */}

        <Section title="Tier 2: Form Controls">

          <Row label="Button: all four variants">
            <Button variant="primary" onClick={() => {}}>Start search</Button>
            <Button variant="secondary" onClick={() => {}}>Save settings</Button>
            <Button variant="ghost" onClick={() => {}}>Cancel</Button>
            <Button variant="dangerGhost" onClick={() => {}}>Remove from shortlist</Button>
          </Row>

          <Row label="Button: sizes sm, md (default), lg">
            <Button variant="primary" size="sm" onClick={() => {}}>Small</Button>
            <Button variant="primary" size="md" onClick={() => {}}>Medium</Button>
            <Button variant="primary" size="lg" onClick={() => {}}>Large</Button>
          </Row>

          <Row label="Button: with icons">
            <Button variant="primary" iconLeft={<Search size={16} strokeWidth={1.5} />} onClick={() => {}}>
              Search clinics
            </Button>
            <Button variant="ghost" iconRight={<Search size={16} strokeWidth={1.5} />} onClick={() => {}}>
              Advanced search
            </Button>
          </Row>

          <Row label="Button: loading and disabled states">
            <Button variant="primary" loading onClick={() => {}}>Saving</Button>
            <Button variant="primary" disabled onClick={() => {}}>Disabled</Button>
            <Button variant="ghost" disabled onClick={() => {}}>Disabled ghost</Button>
          </Row>

          <Row label="Input: text and email">
            <div className="w-72">
              <Input
                type="text"
                label="First name"
                value={textVal}
                onChange={setTextVal}
                placeholder="Shohei"
                required
              />
            </div>
            <div className="w-72">
              <Input
                type="email"
                label="Email address"
                value={emailVal}
                onChange={setEmailVal}
                placeholder="shohei@example.com"
                helper="We never share your email."
              />
            </div>
          </Row>

          <Row label="Input: postalCode (auto-formats), OHIP (masked with toggle)">
            <div className="w-64">
              <Input
                type="postalCode"
                label="Postal code"
                value={postalVal}
                onChange={setPostalVal}
                placeholder="M4K 1A1"
                helper="First three characters identify your neighborhood."
              />
            </div>
            <div className="w-64">
              <Input
                type="ohip"
                label="OHIP number"
                value={ohipVal}
                onChange={setOhipVal}
                helper="Masked. Use the eye icon to reveal."
              />
            </div>
          </Row>

          <Row label="Input: error state">
            <div className="w-72">
              <Input
                type="email"
                label="Email address"
                value="not-an-email"
                onChange={() => {}}
                error="That doesn't look like a valid email. Try the format name@example.com"
              />
            </div>
          </Row>

          <Row label="Select: single value dropdown">
            <div className="w-72">
              <Select
                label="Preferred language"
                value={selectVal}
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'fr', label: 'French' },
                  { value: 'zh', label: 'Mandarin' },
                  { value: 'yue', label: 'Cantonese' },
                  { value: 'pa', label: 'Punjabi' },
                  { value: 'tl', label: 'Tagalog' },
                  { value: 'other', label: 'Other' },
                ]}
                onChange={setSelectVal}
              />
            </div>
          </Row>

          <Row label="MultiSelect: toggleable pills">
            <div className="w-full max-w-lg">
              <MultiSelect
                label="What matters to you in a clinic?"
                value={multiVal}
                options={[
                  { value: 'walk_in_ok', label: 'Walk-in OK' },
                  { value: 'telehealth_ok', label: 'Telehealth OK' },
                  { value: 'female_doctor', label: 'Female doctor preferred' },
                  { value: 'complex_care', label: 'Accepts complex care' },
                  { value: 'mental_health', label: 'Accepts mental health' },
                  { value: 'paediatric', label: 'Paediatric care needed' },
                ]}
                onChange={setMultiVal}
              />
            </div>
          </Row>

          <Row label="Toggle: on/off with description">
            <div className="w-96">
              <Toggle
                label="Auto-add to shortlist if accepted"
                description="Clinics that accept you and match all your criteria are added automatically."
                checked={toggleChecked}
                onChange={setToggleChecked}
              />
            </div>
            <div className="w-72">
              <Toggle
                label="Disabled toggle (on)"
                checked
                onChange={() => {}}
                disabled
              />
            </div>
          </Row>

          <Row label="Slider: search radius with unit">
            <div className="w-96">
              <Slider
                label="Search radius"
                min={1}
                max={25}
                step={1}
                value={sliderVal}
                onChange={setSliderVal}
                unit="km"
              />
            </div>
          </Row>

          <Row label="TimePicker: 24h HH:MM selects">
            <TimePicker
              label="Allowed call hours start"
              value={timeVal}
              onChange={setTimeVal}
            />
            <TimePicker
              label="Allowed call hours end"
              value="17:00"
              onChange={() => {}}
            />
          </Row>

        </Section>

        {/* ── TIER 3: Feedback and Overlays ────────────────── */}

        <Section title="Tier 3: Feedback and Overlays">

          <Row label="Banner: info variant (dismissible)">
            <div className="w-full max-w-2xl">
              <Banner
                variant="info"
                title="Your profile is incomplete."
                description="Add your OHIP number so we can verify your coverage when contacting clinics."
                action={{ label: 'Finish your profile', onClick: () => {} }}
                dismissible
              />
            </div>
          </Row>

          <Row label="Banner: warning variant (dismissible)">
            <div className="w-full max-w-2xl">
              <Banner
                variant="warning"
                title="Agent run paused."
                description="Allowed call hours have passed. The agent will resume tomorrow at 9:00 AM."
                dismissible
              />
            </div>
          </Row>

          <Row label="EmptyState: no icon, no action">
            <Card className="w-96">
              <EmptyState
                title="No results yet."
                description="Start a search to find clinics near your postal code."
              />
            </Card>
          </Row>

          <Row label="EmptyState: with icon and action">
            <Card className="w-96">
              <EmptyState
                icon={<Inbox size={48} strokeWidth={1.5} />}
                title="Your shortlist is empty."
                description="Add clinics that have accepted you to keep track and book a meet and greet."
                action={{ label: 'View search results', onClick: () => {} }}
              />
            </Card>
          </Row>

          <Row label="Modal: with primary and secondary actions">
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              Open modal
            </Button>
            <Modal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              title="Book a meet and greet"
              primaryAction={{ label: 'Confirm booking', onClick: () => setModalOpen(false) }}
              secondaryAction={{ label: 'Cancel', onClick: () => setModalOpen(false) }}
            >
              <p>
                You are booking a meet and greet with Maple Family Practice.
                A confirmation will appear here after you save.
              </p>
            </Modal>
          </Row>

          <Row label="Modal: danger action variant">
            <Button variant="dangerGhost" onClick={() => setModalOpen(true)}>
              Open danger modal
            </Button>
          </Row>

          <ToastDemo />

        </Section>

        {/* ── TIER 4: Layout ───────────────────────────────── */}

        <Section title="Tier 4: Layout">

          <Row label="UserCard: name and email with Avatar">
            <div className="w-60 bg-surface border border-border-soft rounded-lg">
              <UserCard
                firstName="Shohei"
                lastName="Kato"
                email="shohei.kato@example.com"
              />
            </div>
            <div className="w-60 bg-surface border border-border-soft rounded-lg">
              <UserCard
                firstName="Jane"
                email="jane.smithwick.longname@healthcare.org"
              />
            </div>
          </Row>

          <Row label="PageHeader: title, subtitle, actions, notification bell">
            <div className="w-full max-w-3xl border border-border-soft rounded-lg overflow-hidden">
              <PageHeader
                title="Dashboard"
                subtitle="Welcome back, Shohei."
                actions={
                  <Button variant="primary" onClick={() => {}}>
                    Start new search
                  </Button>
                }
                notificationBell={{ count: notifCount, onClick: () => setNotifCount(0) }}
              />
            </div>
          </Row>

          <Row label="PageHeader: title only (no subtitle, no actions)">
            <div className="w-full max-w-3xl border border-border-soft rounded-lg overflow-hidden">
              <PageHeader title="Search results" />
            </div>
          </Row>

          <Row label="SidebarNav: 240px wide, full height (fixed positioning is scoped to this container)">
            {/*
              CSS transform on the wrapper creates a new containing block,
              which scopes the sidebar's position:fixed to this box instead of the viewport.
            */}
            <div
              className="w-60 border border-border-soft rounded-lg overflow-hidden"
              style={{ height: 600, transform: 'translateZ(0)' }}
            >
              <SidebarNav
                currentRoute={sidebarRoute}
                user={{ firstName: 'Shohei', email: 'shohei@example.com' }}
                onNavigate={setSidebarRoute}
                onSignOut={() => {}}
              />
            </div>
          </Row>

          <Row label="Stepper: 6 steps, step 3 current, steps 1 and 2 completed">
            <div className="w-full max-w-2xl bg-surface border border-border-soft rounded-lg p-8">
              <Stepper
                steps={wizardSteps}
                currentStepId="where"
                completedStepIds={['welcome', 'who']}
              />
            </div>
          </Row>

          <Row label="Stepper: all steps completed">
            <div className="w-full max-w-2xl bg-surface border border-border-soft rounded-lg p-8">
              <Stepper
                steps={wizardSteps}
                currentStepId="criteria"
                completedStepIds={['welcome', 'who', 'where', 'health-card', 'household']}
              />
            </div>
          </Row>

          <Row label="Stepper: first step only (no completed steps)">
            <div className="w-full max-w-2xl bg-surface border border-border-soft rounded-lg p-8">
              <Stepper
                steps={wizardSteps}
                currentStepId="welcome"
                completedStepIds={[]}
              />
            </div>
          </Row>

        </Section>

        {/* ── Color tokens reference ───────────────────────── */}

        <Section title="Color Tokens Reference">
          <div className="grid grid-cols-4 gap-4">
            {[
              { token: 'background-base', className: 'bg-background-base' },
              { token: 'surface', className: 'bg-surface' },
              { token: 'primary', className: 'bg-primary' },
              { token: 'primary-hover', className: 'bg-primary-hover' },
              { token: 'secondary', className: 'bg-secondary' },
              { token: 'text-primary', className: 'bg-text-primary' },
              { token: 'text-secondary', className: 'bg-text-secondary' },
              { token: 'text-tertiary', className: 'bg-text-tertiary' },
              { token: 'border-soft', className: 'bg-border-soft' },
              { token: 'brand-accent', className: 'bg-brand-accent' },
              { token: 'status-accepted', className: 'bg-status-accepted' },
              { token: 'status-rejected', className: 'bg-status-rejected' },
              { token: 'status-pending', className: 'bg-status-pending' },
              { token: 'status-calling', className: 'bg-status-calling' },
              { token: 'status-no-answer', className: 'bg-status-no-answer' },
            ].map(({ token, className }) => (
              <div key={token} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-md border border-border-soft shrink-0 ${className}`} />
                <code className="font-mono text-xs text-text-secondary">{token}</code>
              </div>
            ))}
          </div>
        </Section>

      </div>
    </div>
  );
}

// ── Root export (wraps with ToastProvider) ─────────────────

export function Showcase() {
  return (
    <ToastProvider>
      <ShowcaseContent />
    </ToastProvider>
  );
}
