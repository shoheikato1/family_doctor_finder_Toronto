import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/design-system/PageHeader';
import { Card } from '../components/design-system/Card';
import { Banner } from '../components/design-system/Banner';
import { Button } from '../components/design-system/Button';
import { Slider } from '../components/design-system/Slider';
import { TimePicker } from '../components/design-system/TimePicker';
import { Toggle } from '../components/design-system/Toggle';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../components/design-system/Toast';
import { isRealMode } from '../lib/backendMode';
import { upsertAgentSettings } from '../lib/repositories/agentSettings';
import { postApi, failureMessage, type ApiFailure } from '../lib/api';
import { refreshRunNow } from '../lib/realBackend';
import type { AgentSettings } from '../store/types';

/** Response shape of POST /api/run/start (api/run/start.ts). */
interface RunStartResponse {
  run_id: string;
  mode: 'live' | 'dry_run';
  queued: number;
  calls: Array<{ id: string; clinic_id: string; position: number }>;
}

const DEFAULT_SETTINGS: Omit<AgentSettings, 'userId'> = {
  voicemailScript:
    'Hi, this is calling on behalf of a patient looking for a family doctor accepting new patients. Please call back at your earliest convenience. Thank you.',
  searchRadiusKm: 5,
  callHoursStart: '09:00',
  callHoursEnd: '17:00',
  autoShortlistOnAccept: true,
  customDiscoveryScript: null,
};

type LocalSettings = Omit<AgentSettings, 'userId'>;

export function AgentConfigPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const user = useAppStore((s) => s.user);
  const storedSettings = useAppStore((s) => s.agentSettings);
  const updateAgentSettings = useAppStore((s) => s.updateAgentSettings);
  const startAgentRun = useAppStore((s) => s.startAgentRun);

  function settingsFromStore(): LocalSettings {
    if (!storedSettings) return { ...DEFAULT_SETTINGS };
    return {
      voicemailScript: storedSettings.voicemailScript,
      searchRadiusKm: storedSettings.searchRadiusKm,
      callHoursStart: storedSettings.callHoursStart,
      callHoursEnd: storedSettings.callHoursEnd,
      autoShortlistOnAccept: storedSettings.autoShortlistOnAccept,
      customDiscoveryScript: storedSettings.customDiscoveryScript,
    };
  }

  const [local, setLocal] = useState<LocalSettings>(settingsFromStore);
  const [showCustomScript, setShowCustomScript] = useState(
    storedSettings?.customDiscoveryScript != null
  );

  // Real mode: run-start progress and honest error surfacing (moves C6, Z2).
  const [starting, setStarting] = useState(false);
  const [runFailure, setRunFailure] = useState<ApiFailure | null>(null);

  // Resync if another tab updates the store (edge case, good hygiene)
  useEffect(() => {
    setLocal(settingsFromStore());
    setShowCustomScript(storedSettings?.customDiscoveryScript != null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedSettings]);

  function set<K extends keyof LocalSettings>(key: K, value: LocalSettings[K]) {
    setLocal((prev) => ({ ...prev, [key]: value }));
  }

  function persistSettings(): AgentSettings {
    const settings: AgentSettings = {
      userId: user?.id ?? '',
      ...local,
      customDiscoveryScript: showCustomScript ? local.customDiscoveryScript : null,
    };
    updateAgentSettings(settings);
    return settings;
  }

  /** Real mode: settings must land in Postgres before the run reads them server-side. */
  async function persistSettingsReal(): Promise<AgentSettings | null> {
    const settings = persistSettings();
    try {
      await upsertAgentSettings(settings);
      return settings;
    } catch (e) {
      console.error('agent settings upsert failed', e);
      addToast('Could not save settings to the backend. Try again.', 'warning');
      return null;
    }
  }

  async function handleSaveAndRun() {
    if (isRealMode) {
      if (starting) return;
      setRunFailure(null);
      setStarting(true);
      const saved = await persistSettingsReal();
      if (!saved) {
        setStarting(false);
        return;
      }
      const result = await postApi<RunStartResponse>('/api/run/start');
      if (result.ok) {
        await refreshRunNow().catch(() => undefined);
        setStarting(false);
        navigate('/dashboard');
      } else {
        setRunFailure(result.failure);
        setStarting(false);
      }
      return;
    }

    persistSettings();
    const started = startAgentRun();
    if (!started) {
      addToast('Run already in progress', 'warning');
      return;
    }
    navigate('/dashboard');
  }

  async function handleSaveOnly() {
    if (isRealMode) {
      const saved = await persistSettingsReal();
      if (saved) addToast('Settings saved.', 'success');
      return;
    }
    persistSettings();
    addToast('Settings saved.', 'success');
  }

  function handleCancel() {
    setLocal(settingsFromStore());
    setShowCustomScript(storedSettings?.customDiscoveryScript != null);
  }

  function handleCustomScriptToggle(checked: boolean) {
    setShowCustomScript(checked);
    if (!checked) {
      set('customDiscoveryScript', null);
    } else if (!local.customDiscoveryScript) {
      set('customDiscoveryScript', DEFAULT_SETTINGS.voicemailScript);
    }
  }

  const customScriptCharCount = (local.customDiscoveryScript ?? '').length;

  return (
    <>
      <PageHeader
        title="Agent Configuration"
        subtitle="Configure how the voice agent reaches out to clinics on your behalf."
      />

      <div className="px-8 py-8 flex flex-col gap-8 max-w-2xl">

        {runFailure && (
          <Banner
            variant="warning"
            title={
              runFailure.kind === 'not_configured'
                ? failureMessage(runFailure)
                : 'Could not start the run'
            }
            description={runFailure.kind === 'not_configured' ? undefined : failureMessage(runFailure)}
            dismissible
          />
        )}

        {/* Search radius */}
        <Card>
          <h2 className="font-sans text-base font-semibold text-text-primary mb-6">
            Search radius
          </h2>
          <Slider
            label="Maximum distance from your postal code"
            min={1}
            max={25}
            step={1}
            value={local.searchRadiusKm}
            onChange={(v) => set('searchRadiusKm', v)}
            unit="km"
          />
        </Card>

        {/* Call hours */}
        <Card>
          <h2 className="font-sans text-base font-semibold text-text-primary mb-6">
            Allowed call hours
          </h2>
          <p className="font-sans text-sm text-text-secondary mb-5 -mt-3">
            The agent will only place calls during this window. Times are in your local timezone.
          </p>
          <div className="flex items-end gap-6">
            <TimePicker
              label="From"
              value={local.callHoursStart}
              onChange={(v) => set('callHoursStart', v)}
            />
            <TimePicker
              label="To"
              value={local.callHoursEnd}
              onChange={(v) => set('callHoursEnd', v)}
            />
          </div>
        </Card>

        {/* Voicemail script */}
        <Card>
          <h2 className="font-sans text-base font-semibold text-text-primary mb-2">
            Voicemail script
          </h2>
          <p className="font-sans text-sm text-text-secondary mb-5">
            What the agent leaves when it reaches voicemail.
          </p>
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-sm font-medium text-text-primary">
              Script
            </label>
            <textarea
              value={local.voicemailScript}
              onChange={(e) => set('voicemailScript', e.target.value)}
              rows={4}
              className={[
                'w-full rounded-md border border-border-soft bg-surface px-4 py-3',
                'font-sans text-base text-text-primary placeholder:text-text-tertiary',
                'transition-colors duration-120 ease-out resize-y',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                'focus-visible:ring-offset-0 focus-visible:border-primary',
              ].join(' ')}
            />
            <p className="font-sans text-xs text-text-tertiary">
              Speak naturally. Mention you are looking for a family doctor accepting new patients.
            </p>
            <p className="font-sans text-xs text-text-tertiary">
              Give the clinic a callback number. The agent will use the patient's phone.
            </p>
          </div>
        </Card>

        {/* Auto-shortlist */}
        <Card>
          <h2 className="font-sans text-base font-semibold text-text-primary mb-5">
            Shortlisting
          </h2>
          <Toggle
            label="Auto-add to shortlist when accepted"
            description="When a clinic confirms they're accepting new patients, add them to your shortlist automatically."
            checked={local.autoShortlistOnAccept}
            onChange={(v) => set('autoShortlistOnAccept', v)}
          />
        </Card>

        {/* Custom discovery script */}
        <Card>
          <h2 className="font-sans text-base font-semibold text-text-primary mb-2">
            Custom discovery script
          </h2>
          <p className="font-sans text-sm text-text-secondary mb-5">
            Replace the default opening script the agent uses to introduce itself to clinic staff.
          </p>
          <div className="flex flex-col gap-5">
            <Toggle
              label="Use a custom discovery script"
              checked={showCustomScript}
              onChange={handleCustomScriptToggle}
            />

            {!showCustomScript && (
              <div className="px-4 py-3 rounded-md bg-background-base border border-border-soft">
                <p className="font-sans text-xs text-text-tertiary mb-1 uppercase tracking-wide">
                  Default script
                </p>
                <p className="font-sans text-sm text-text-secondary italic">
                  "Hi, I'm calling to ask whether your clinic is currently accepting new patients…"
                </p>
              </div>
            )}

            {showCustomScript && (
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-sm font-medium text-text-primary">
                  Custom script
                </label>
                <textarea
                  value={local.customDiscoveryScript ?? ''}
                  onChange={(e) => set('customDiscoveryScript', e.target.value || null)}
                  rows={4}
                  className={[
                    'w-full rounded-md border border-border-soft bg-surface px-4 py-3',
                    'font-sans text-base text-text-primary placeholder:text-text-tertiary',
                    'transition-colors duration-120 ease-out resize-y',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    'focus-visible:ring-offset-0 focus-visible:border-primary',
                  ].join(' ')}
                  placeholder="Write what the agent should say when a clinic picks up..."
                />
                <p className="font-sans text-xs text-text-tertiary text-right">
                  {customScriptCharCount} characters
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Footer actions */}
        <div className="flex items-center gap-3 pb-8">
          <Button variant="primary" loading={starting} onClick={() => void handleSaveAndRun()}>
            Save and run
          </Button>
          <Button variant="ghost" onClick={() => void handleSaveOnly()}>
            Save without running
          </Button>
          <Button variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
        </div>

      </div>
    </>
  );
}
