-- Run once in Supabase: SQL Editor > New query > paste > Run
create table if not exists public.push_subs (
  endpoint   text primary key,
  user_id    uuid references auth.users(id) on delete cascade,
  name       text,
  sub        jsonb not null,
  tz         text,
  updated_at timestamptz default now()
);
alter table public.push_subs enable row level security;
drop policy if exists "push own select" on public.push_subs;
drop policy if exists "push own insert" on public.push_subs;
drop policy if exists "push own update" on public.push_subs;
drop policy if exists "push own delete" on public.push_subs;
create policy "push own select" on public.push_subs for select using (auth.uid() = user_id);
create policy "push own insert" on public.push_subs for insert with check (auth.uid() = user_id);
create policy "push own update" on public.push_subs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "push own delete" on public.push_subs for delete using (auth.uid() = user_id);
