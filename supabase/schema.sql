-- Run this in the Supabase SQL editor to create all tables.
-- RLS is enabled with a permissive policy (anon key can read/write everything)
-- since this is a single-user personal app.

-- ── Weight logs ──────────────────────────────────────────────────────────────
create table if not exists weight_logs (
  id         uuid    primary key default gen_random_uuid(),
  date       date    not null unique,
  weight     numeric(4,1) not null,
  created_at timestamptz default now()
);

alter table weight_logs enable row level security;
create policy "anon full access" on weight_logs for all to anon using (true) with check (true);

-- ── Whoop logs ───────────────────────────────────────────────────────────────
create table if not exists whoop_logs (
  id          uuid    primary key default gen_random_uuid(),
  date        date    not null unique,
  recovery    integer,           -- 0–100
  hrv         integer,           -- ms
  rhr         integer,           -- bpm
  sleep_score integer,           -- 0–100
  sleep_hours numeric(3,1),
  strain      numeric(3,1),      -- 0–21
  created_at  timestamptz default now()
);

alter table whoop_logs enable row level security;
create policy "anon full access" on whoop_logs for all to anon using (true) with check (true);

-- ── Budget transactions ───────────────────────────────────────────────────────
create table if not exists budget_transactions (
  id          uuid    primary key default gen_random_uuid(),
  date        date    not null,
  amount      numeric(8,2) not null,
  description text,
  category    text    not null,
  created_at  timestamptz default now()
);

alter table budget_transactions enable row level security;
create policy "anon full access" on budget_transactions for all to anon using (true) with check (true);

-- ── Investments (VOO / savings) ───────────────────────────────────────────────
create table if not exists investments (
  id         uuid    primary key default gen_random_uuid(),
  date       date    not null,
  amount     numeric(8,2) not null,
  note       text,
  type       text    not null,   -- 'VOO' | 'Savings'
  created_at timestamptz default now()
);

alter table investments enable row level security;
create policy "anon full access" on investments for all to anon using (true) with check (true);

-- ── Daily tasks (top 3) ───────────────────────────────────────────────────────
create table if not exists daily_tasks (
  id         uuid    primary key default gen_random_uuid(),
  date       date    not null,
  text       text    not null,
  done       boolean not null default false,
  position   integer not null default 0,
  created_at timestamptz default now()
);

alter table daily_tasks enable row level security;
create policy "anon full access" on daily_tasks for all to anon using (true) with check (true);

-- ── Routine completions (morning / evening checkbox state) ────────────────────
create table if not exists routine_completions (
  id         uuid    primary key default gen_random_uuid(),
  date       date    not null,
  type       text    not null,   -- 'morning' | 'evening'
  item_id    text    not null,
  done       boolean not null default true,
  created_at timestamptz default now(),
  unique (date, type, item_id)
);

alter table routine_completions enable row level security;
create policy "anon full access" on routine_completions for all to anon using (true) with check (true);

-- ── Training session completions ──────────────────────────────────────────────
create table if not exists session_completions (
  id           uuid         primary key default gen_random_uuid(),
  date         date         not null,
  session_id   text         not null,
  done         boolean      not null default true,
  run_distance numeric(5,2),   -- km
  run_pace     text,            -- e.g. "5:30"
  run_hr       integer,         -- bpm avg
  created_at   timestamptz  default now(),
  unique (date, session_id)
);

alter table session_completions enable row level security;
create policy "anon full access" on session_completions for all to anon using (true) with check (true);

-- To add run columns to an existing session_completions table, run:
-- alter table session_completions add column if not exists run_distance numeric(5,2);
-- alter table session_completions add column if not exists run_pace text;
-- alter table session_completions add column if not exists run_hr integer;

-- ── Books ─────────────────────────────────────────────────────────────────────
create table if not exists books (
  id          uuid         primary key default gen_random_uuid(),
  title       text         not null,
  author      text,
  status      text         not null default 'want_to_read', -- 'reading' | 'finished' | 'want_to_read'
  started_at  date,
  finished_at date,
  rating      integer,     -- 1–5
  notes       text,
  created_at  timestamptz  default now()
);

alter table books enable row level security;
create policy "anon full access" on books for all to anon using (true) with check (true);
