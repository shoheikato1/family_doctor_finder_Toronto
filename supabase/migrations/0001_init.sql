-- Find a Family Doctor: initial schema
-- Contract: docs/canon/engineering.md (the whole backend; changes update canon in the same edit)
-- Deviation from battle plan noted: clinics.location implemented as lat/lng doubles
-- (radius filtering happens in the Places API locationBias, not in Postgres; PostGIS unneeded in v1)

-- ── profiles ─────────────────────────────────────────────────────────────────
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  postal_code text not null default '',
  language text not null default 'English',
  family_size int not null default 1,
  criteria jsonb not null default '[]',
  additional_notes text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = user_id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = user_id);

-- ── agent_settings ───────────────────────────────────────────────────────────
create table public.agent_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  search_radius_km numeric not null default 5,
  call_hours_start time not null default '09:00',
  call_hours_end time not null default '17:00',
  auto_shortlist boolean not null default true,
  voicemail_script text not null default '',
  custom_script text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.agent_settings enable row level security;
create policy "agent_settings_select_own" on public.agent_settings for select using (auth.uid() = user_id);
create policy "agent_settings_insert_own" on public.agent_settings for insert with check (auth.uid() = user_id);
create policy "agent_settings_update_own" on public.agent_settings for update using (auth.uid() = user_id);
create policy "agent_settings_delete_own" on public.agent_settings for delete using (auth.uid() = user_id);

-- ── clinics (shared read-only cache; writes via service role only) ──────────
create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  place_id text unique not null,
  name text not null,
  address text not null default '',
  neighbourhood text not null default '',
  postal_code text not null default '',
  phone text not null default '',
  website text not null default '',
  lat double precision,
  lng double precision,
  languages jsonb not null default '[]',
  last_verified_at timestamptz not null default now()
);
alter table public.clinics enable row level security;
create policy "clinics_select_authenticated" on public.clinics for select to authenticated using (true);
-- no insert/update/delete policies: only the service role (bypasses RLS) writes

-- ── runs ─────────────────────────────────────────────────────────────────────
create table public.runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  state text not null default 'idle'
    check (state in ('idle','scouting','calling','complete','failed')),
  mode text not null default 'dry_run' check (mode in ('dry_run','live')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  counts jsonb not null default '{}'
);
alter table public.runs enable row level security;
create policy "runs_select_own" on public.runs for select using (auth.uid() = user_id);
-- inserts/updates via service role only (/api/run/start owns run creation)
create index runs_user_started_idx on public.runs (user_id, started_at desc);

-- ── calls ────────────────────────────────────────────────────────────────────
create table public.calls (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id),
  mode text not null default 'dry_run' check (mode in ('dry_run','live')),
  conversation_id text,
  status text not null default 'queued'
    check (status in ('queued','calling','accepted','rejected','voicemail_left','no_answer','failed')),
  transcript jsonb,
  extracted jsonb,
  recording_url text,
  started_at timestamptz,
  ended_at timestamptz
);
alter table public.calls enable row level security;
create policy "calls_select_own" on public.calls for select using (auth.uid() = user_id);
-- writes via service role only (webhook ingest owns status transitions)
create index calls_run_idx on public.calls (run_id);
create index calls_user_idx on public.calls (user_id);
create index calls_stale_idx on public.calls (status, started_at) where status = 'calling';

-- ── shortlist ────────────────────────────────────────────────────────────────
create table public.shortlist (
  user_id uuid not null references auth.users(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  added_at timestamptz not null default now(),
  booking_date timestamptz,
  booking_notes text not null default '',
  primary key (user_id, clinic_id)
);
alter table public.shortlist enable row level security;
create policy "shortlist_select_own" on public.shortlist for select using (auth.uid() = user_id);
create policy "shortlist_insert_own" on public.shortlist for insert with check (auth.uid() = user_id);
create policy "shortlist_update_own" on public.shortlist for update using (auth.uid() = user_id);
create policy "shortlist_delete_own" on public.shortlist for delete using (auth.uid() = user_id);

-- ── feature_flags (server-read; clients see a mirrored copy via /api) ────────
create table public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  note text not null default ''
);
alter table public.feature_flags enable row level security;
-- no policies: service role only. The client mirror endpoint filters what is safe to expose.
insert into public.feature_flags (key, enabled, note) values
  ('caller_live_mode', false, 'HARD GATE. Flips only when every go-live checklist row is green.'),
  ('user_voice_clone', false, 'Shohei''s consented instant clone; stock voice otherwise.');

-- ── cost_events ──────────────────────────────────────────────────────────────
create table public.cost_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  service text not null check (service in ('elevenlabs','twilio','google_places','vercel','supabase')),
  unit text not null,
  quantity numeric not null,
  est_cost_usd numeric not null,
  ref text not null default ''
);
alter table public.cost_events enable row level security;
-- no policies: service role only; summaries surface via /api.
create index cost_events_time_idx on public.cost_events (occurred_at desc);
