-- Schema for the online captains arena.
-- Run this in the Supabase SQL editor of your project.
--
-- A room holds the whole draft state as JSON; clients apply moves with the same
-- pure engine (src/engine/captainsMode.ts) and write the new state back. Realtime
-- pushes each update to the other captain.

create table if not exists public.arena_rooms (
  code        text primary key,
  state       jsonb not null,
  updated_at  timestamptz not null default now()
);

alter table public.arena_rooms enable row level security;

-- MVP policies: anonymous clients may read/create/update rooms.
-- Tighten later (e.g. per-room ownership, auth, or an Edge Function that
-- validates each move server-side) before a public launch.
drop policy if exists "arena read" on public.arena_rooms;
create policy "arena read" on public.arena_rooms for select using (true);

drop policy if exists "arena insert" on public.arena_rooms;
create policy "arena insert" on public.arena_rooms for insert with check (true);

drop policy if exists "arena update" on public.arena_rooms;
create policy "arena update" on public.arena_rooms for update using (true) with check (true);

-- Broadcast row changes over Realtime.
alter publication supabase_realtime add table public.arena_rooms;
