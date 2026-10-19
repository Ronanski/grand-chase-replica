-- Run this once in the Supabase SQL editor to enable sync.
create table if not exists public.user_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

create policy "Users read own state" on public.user_state
  for select using (auth.uid() = user_id);
create policy "Users insert own state" on public.user_state
  for insert with check (auth.uid() = user_id);
create policy "Users update own state" on public.user_state
  for update using (auth.uid() = user_id);

-- Lets the app hear changes from the user's other devices instantly.
alter publication supabase_realtime add table public.user_state;
