-- SAS Basketball | initial secure MVP schema
-- Run in the Supabase SQL Editor. All student data is private by default.
-- Provision auth accounts in Dashboard > Authentication > Users (invite or create).
-- Then provision the matching public.profiles rows using an admin-only SQL query.
-- NEVER permit clients to update the role column.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 100),
  role text not null check (role in ('coach','player')),
  created_at timestamptz not null default now()
);

-- SECURITY DEFINER avoids recursive profile RLS for coaching checks.
-- The function has no client-controlled role arguments.
create or replace function public.is_coach()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'coach'
  );
$$;
revoke all on function public.is_coach() from public;
grant execute on function public.is_coach() to authenticated;

create table if not exists public.practices (
  id uuid primary key default gen_random_uuid(),
  season_label text not null default '2026-27',
  practice_date date not null,
  title text not null check (length(trim(title)) between 1 and 100),
  location text not null default 'HS Gym',
  primary_priorities text[] not null default '{}',
  peripheral_priorities text[] not null default '{}',
  activities jsonb not null default '[]'::jsonb,
  live_application text not null default '',
  layups_result integer check (layups_result between 0 and 100),
  status text not null default 'planned' check (status in ('planned','completed')),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (array_length(primary_priorities,1) = 3),
  check (array_length(peripheral_priorities,1) = 2),
  check (jsonb_typeof(activities) = 'array')
);

-- Private observations intentionally live OUTSIDE published practice records.
create table if not exists public.practice_notes (
  practice_id uuid primary key references public.practices(id) on delete cascade,
  notes text not null default '',
  next_focus text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.drills (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 100),
  competency text not null,
  situation text not null default '',
  description text not null,
  coaching_cues text not null default '',
  status text not null default 'Proposed' check (status in ('Proposed','Tested','Proven')),
  published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  due_date date not null,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.assignment_responses (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  response text not null,
  created_at timestamptz not null default now(),
  unique(assignment_id,player_id)
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  target text not null,
  status text not null default 'Not started' check (status in ('Not started','In progress','Completed')),
  created_at timestamptz not null default now()
);

create table if not exists public.reflections (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  prompt text not null,
  response text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_practices_published_date on public.practices (published, practice_date);
create index if not exists idx_drills_published on public.drills (published);
create index if not exists idx_assignments_published on public.assignments (published);
create index if not exists idx_responses_player on public.assignment_responses (player_id);
create index if not exists idx_goals_player on public.goals (player_id);
create index if not exists idx_reflections_player on public.reflections (player_id);

alter table public.profiles enable row level security;
alter table public.practices enable row level security;
alter table public.practice_notes enable row level security;
alter table public.drills enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_responses enable row level security;
alter table public.goals enable row level security;
alter table public.reflections enable row level security;

-- No anonymous access. Authenticated still must satisfy every per-row policy.
revoke all on all tables in schema public from anon;
grant select on public.profiles, public.practices, public.practice_notes,
  public.drills, public.assignments, public.assignment_responses,
  public.goals, public.reflections to authenticated;
grant insert, update, delete on public.practices, public.practice_notes,
  public.drills, public.assignments, public.assignment_responses,
  public.goals, public.reflections to authenticated;

-- Profiles: a player can only read their own profile; coaches read team profiles.
-- No insert/update/delete permissions on profiles for regular users.
create policy profiles_read on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_coach()));

-- Practices: player-visible content only after coach publishes it.
create policy practices_read on public.practices for select to authenticated
  using ((select public.is_coach()) or published = true);
create policy practices_insert on public.practices for insert to authenticated
  with check ((select public.is_coach()));
create policy practices_update on public.practices for update to authenticated
  using ((select public.is_coach())) with check ((select public.is_coach()));
create policy practices_delete on public.practices for delete to authenticated
  using ((select public.is_coach()));

-- Private practice notes: only coaches, even if corresponding plan is published.
create policy practice_notes_read on public.practice_notes for select to authenticated
  using ((select public.is_coach()));
create policy practice_notes_insert on public.practice_notes for insert to authenticated
  with check ((select public.is_coach()));
create policy practice_notes_update on public.practice_notes for update to authenticated
  using ((select public.is_coach())) with check ((select public.is_coach()));
create policy practice_notes_delete on public.practice_notes for delete to authenticated
  using ((select public.is_coach()));

create policy drills_read on public.drills for select to authenticated
  using ((select public.is_coach()) or published = true);
create policy drills_insert on public.drills for insert to authenticated
  with check ((select public.is_coach()));
create policy drills_update on public.drills for update to authenticated
  using ((select public.is_coach())) with check ((select public.is_coach()));
create policy drills_delete on public.drills for delete to authenticated
  using ((select public.is_coach()));

create policy assignments_read on public.assignments for select to authenticated
  using ((select public.is_coach()) or published = true);
create policy assignments_insert on public.assignments for insert to authenticated
  with check ((select public.is_coach()));
create policy assignments_update on public.assignments for update to authenticated
  using ((select public.is_coach())) with check ((select public.is_coach()));
create policy assignments_delete on public.assignments for delete to authenticated
  using ((select public.is_coach()));

create policy responses_read on public.assignment_responses for select to authenticated
  using ((select public.is_coach()) or player_id = (select auth.uid()));
create policy responses_insert on public.assignment_responses for insert to authenticated
  with check (
    player_id = (select auth.uid())
    and exists (select 1 from public.assignments a where a.id = assignment_id and a.published)
  );
create policy responses_update on public.assignment_responses for update to authenticated
  using (player_id = (select auth.uid()))
  with check (player_id = (select auth.uid()));
create policy responses_delete on public.assignment_responses for delete to authenticated
  using (player_id = (select auth.uid()));

create policy goals_read on public.goals for select to authenticated
  using ((select public.is_coach()) or player_id = (select auth.uid()));
create policy goals_insert on public.goals for insert to authenticated
  with check ((select public.is_coach()) or player_id = (select auth.uid()));
create policy goals_update on public.goals for update to authenticated
  using ((select public.is_coach()) or player_id = (select auth.uid()))
  with check ((select public.is_coach()) or player_id = (select auth.uid()));
create policy goals_delete on public.goals for delete to authenticated
  using ((select public.is_coach()) or player_id = (select auth.uid()));

create policy reflections_read on public.reflections for select to authenticated
  using ((select public.is_coach()) or player_id = (select auth.uid()));
create policy reflections_insert on public.reflections for insert to authenticated
  with check (player_id = (select auth.uid()));
-- Reflection entries are immutable to players after submission in this MVP.
-- Only coaches may correct administrative errors.
create policy reflections_update on public.reflections for update to authenticated
  using ((select public.is_coach())) with check ((select public.is_coach()));
create policy reflections_delete on public.reflections for delete to authenticated
  using ((select public.is_coach()));

-- Important for future expansion: never put private coaching commentary on
-- tables with rows that players are allowed to select. Prefer separate tables.
