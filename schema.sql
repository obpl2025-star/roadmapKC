-- Supabase -> SQL Editor -> вставить и выполнить
create table if not exists public.progress (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  roadmap    text not null check (roadmap in ('kc','vz')),
  block_id   text not null,
  done       boolean not null default false,
  full_name  text,
  updated_at timestamptz not null default now(),
  primary key (user_id, roadmap, block_id)
);

alter table public.progress enable row level security;

create policy "own select" on public.progress for select to authenticated using (auth.uid() = user_id);
create policy "own insert" on public.progress for insert to authenticated with check (auth.uid() = user_id);
create policy "own update" on public.progress for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Отчёт для наставника (запускать в SQL Editor, там RLS не мешает):
-- select full_name, roadmap, count(*) filter (where done) as изучено, max(updated_at) as последняя_активность
-- from public.progress group by full_name, roadmap order by full_name;
