-- Team announcements: everyone signed in can read, only coaches can post or delete.
create table if not exists public.announcements (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 1 and 70),
  body text default '' check (char_length(body) <= 600),
  author text,
  push boolean not null default false,
  pushed_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;
drop policy if exists ann_read on public.announcements;
create policy ann_read on public.announcements for select to authenticated using (true);
drop policy if exists ann_coach_insert on public.announcements;
create policy ann_coach_insert on public.announcements for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'coach'));
drop policy if exists ann_coach_delete on public.announcements;
create policy ann_coach_delete on public.announcements for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'coach'));
select 'announcements ready' as status;
