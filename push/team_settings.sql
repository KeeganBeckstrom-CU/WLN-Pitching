-- Coach's Cheats switches (one row, id = 'main')
create table if not exists public.team_settings (id text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz default now());
alter table public.team_settings enable row level security;
create policy "team settings read" on public.team_settings for select using (auth.role() = 'authenticated');
create policy "team settings coach insert" on public.team_settings for insert with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'coach'));
create policy "team settings coach update" on public.team_settings for update using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'coach')) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'coach'));
insert into public.team_settings (id, data) values ('main', '{"push_on": true, "tg": "auto"}') on conflict (id) do nothing;
