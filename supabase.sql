create extension if not exists pgcrypto;

create table if not exists public.fields (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  area numeric(12, 1) not null check (area >= 0),
  crop text,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  due_date date not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.fields enable row level security;
alter table public.tasks enable row level security;

create policy "users manage own fields" on public.fields
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own tasks" on public.tasks
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter publication supabase_realtime add table public.fields;
alter publication supabase_realtime add table public.tasks;
