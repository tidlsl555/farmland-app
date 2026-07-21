create table if not exists public.app_states (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.app_states enable row level security;

drop policy if exists app_states_select on public.app_states;
create policy app_states_select on public.app_states for select to authenticated
using (org_id = public.current_org_id());

drop policy if exists app_states_insert on public.app_states;
create policy app_states_insert on public.app_states for insert to authenticated
with check (org_id = public.current_org_id());

drop policy if exists app_states_update on public.app_states;
create policy app_states_update on public.app_states for update to authenticated
using (org_id = public.current_org_id())
with check (org_id = public.current_org_id());

grant select, insert, update on public.app_states to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.app_states;
exception
  when duplicate_object then null;
end $$;
