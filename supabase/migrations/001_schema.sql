-- 농지관리 실시간 필지경계 웹앱
-- Supabase SQL Editor 또는 `supabase db push`로 적용합니다.
-- 필지 경계는 측량용 법적 경계가 아니라 현장관리용 참조 데이터입니다.

create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  display_name text,
  role text not null default 'member' check (role in ('admin','member','viewer')),
  created_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  color text not null default '#475569',
  is_water boolean not null default false,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create table if not exists public.farmlands (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  list_order integer not null,
  farm_no integer not null,
  parcel_order integer not null default 1,
  display_code text not null,
  owner_name text,
  place_name text,
  original_ri text,
  ri text not null,
  jibun text not null,
  full_address text not null,
  area_sqm numeric,
  variety text,
  note text,
  pnu text,
  geom extensions.geometry(MultiPolygon, 4326),
  label_point extensions.geometry(Point, 4326),
  gps_point extensions.geometry(Point, 4326),
  gps_accuracy_m numeric,
  location_status text not null default 'missing'
    check (location_status in (
      'missing','candidate','exact','gps_only','gps_verified',
      'manual_verified','lookup_failed'
    )),
  location_source text,
  location_verified_at timestamptz,
  location_verified_by uuid references auth.users(id),
  vworld_properties jsonb,
  last_lookup_at timestamptz,
  lookup_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, ri, jibun)
);

create index if not exists farmlands_org_order_idx on public.farmlands(org_id, list_order);
create index if not exists farmlands_geom_gix on public.farmlands using gist(geom);
create index if not exists farmlands_gps_gix on public.farmlands using gist(gps_point);

create table if not exists public.work_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  farmland_id uuid not null references public.farmlands(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  action text not null check (action in ('complete','cancel')),
  target_event_id uuid references public.work_events(id),
  note text,
  occurred_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check (
    (action='complete' and target_event_id is null)
    or (action='cancel' and target_event_id is not null)
  )
);

create index if not exists work_events_org_time_idx on public.work_events(org_id, occurred_at desc);
create index if not exists work_events_target_idx on public.work_events(target_event_id);
create index if not exists work_events_farm_job_idx on public.work_events(farmland_id, job_id, occurred_at desc);

create table if not exists public.water_sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  farmland_id uuid not null references public.farmlands(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  cancelled_at timestamptz,
  note text,
  created_by uuid not null references auth.users(id),
  finished_by uuid references auth.users(id),
  cancelled_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (finished_at is null or finished_at >= started_at)
);

create unique index if not exists one_open_water_session_per_farm
  on public.water_sessions(farmland_id)
  where finished_at is null and cancelled_at is null;

create index if not exists water_sessions_org_time_idx on public.water_sessions(org_id, started_at desc);

create table if not exists public.location_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  farmland_id uuid not null references public.farmlands(id) on delete cascade,
  event_type text not null,
  status text not null,
  source text,
  accuracy_m numeric,
  point extensions.geometry(Point, 4326),
  geometry_snapshot jsonb,
  properties jsonb,
  message text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists location_events_org_time_idx on public.location_events(org_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists farmlands_updated_at on public.farmlands;
create trigger farmlands_updated_at
before update on public.farmlands
for each row execute function public.set_updated_at();

create or replace function public.set_farmland_label_point()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  if new.geom is null then
    new.label_point := null;
  else
    new.geom := st_multi(st_collectionextract(st_makevalid(new.geom), 3));
    new.label_point := st_pointonsurface(new.geom);
  end if;
  return new;
end;
$$;

drop trigger if exists farmlands_label_point on public.farmlands;
create trigger farmlands_label_point
before insert or update of geom on public.farmlands
for each row execute function public.set_farmland_label_point();

create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.org_id from public.profiles p where p.id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.role='admin' from public.profiles p where p.id=auth.uid()), false)
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.farmlands enable row level security;
alter table public.work_events enable row level security;
alter table public.water_sessions enable row level security;
alter table public.location_events enable row level security;

drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
for select to authenticated
using (id = public.current_org_id());

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select to authenticated
using (org_id = public.current_org_id());

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
for update to authenticated
using (org_id = public.current_org_id() and public.is_admin())
with check (org_id = public.current_org_id() and public.is_admin());

drop policy if exists jobs_select on public.jobs;
create policy jobs_select on public.jobs
for select to authenticated
using (org_id = public.current_org_id());

drop policy if exists jobs_admin_all on public.jobs;
create policy jobs_admin_all on public.jobs
for all to authenticated
using (org_id = public.current_org_id() and public.is_admin())
with check (org_id = public.current_org_id() and public.is_admin());

drop policy if exists farmlands_select on public.farmlands;
create policy farmlands_select on public.farmlands
for select to authenticated
using (org_id = public.current_org_id());

drop policy if exists farmlands_admin_all on public.farmlands;
create policy farmlands_admin_all on public.farmlands
for all to authenticated
using (org_id = public.current_org_id() and public.is_admin())
with check (org_id = public.current_org_id() and public.is_admin());

drop policy if exists work_events_select on public.work_events;
create policy work_events_select on public.work_events
for select to authenticated
using (org_id = public.current_org_id());

drop policy if exists water_sessions_select on public.water_sessions;
create policy water_sessions_select on public.water_sessions
for select to authenticated
using (org_id = public.current_org_id());

drop policy if exists location_events_select on public.location_events;
create policy location_events_select on public.location_events
for select to authenticated
using (org_id = public.current_org_id());

grant usage on schema public to authenticated;
grant select on public.organizations, public.profiles, public.jobs, public.farmlands,
  public.work_events, public.water_sessions, public.location_events to authenticated;

create or replace function public.complete_work(
  p_farmland_id uuid,
  p_job_id uuid,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_id uuid;
begin
  select f.org_id into v_org
  from public.farmlands f
  join public.jobs j on j.id = p_job_id and j.org_id = f.org_id
  where f.id = p_farmland_id
    and f.org_id = public.current_org_id();

  if v_org is null then
    raise exception '권한이 없거나 농지/작업을 찾을 수 없습니다.';
  end if;

  if exists (
    select 1
    from public.work_events e
    where e.farmland_id = p_farmland_id
      and e.job_id = p_job_id
      and e.action = 'complete'
      and not exists (
        select 1 from public.work_events c
        where c.action='cancel' and c.target_event_id=e.id
      )
  ) then
    select e.id into v_id
    from public.work_events e
    where e.farmland_id = p_farmland_id
      and e.job_id = p_job_id
      and e.action='complete'
      and not exists (
        select 1 from public.work_events c
        where c.action='cancel' and c.target_event_id=e.id
      )
    order by e.occurred_at desc
    limit 1;
    return v_id;
  end if;

  insert into public.work_events(org_id, farmland_id, job_id, action, note, created_by)
  values (v_org, p_farmland_id, p_job_id, 'complete', p_note, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.cancel_work(p_completion_event_id uuid, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_farm uuid;
  v_job uuid;
  v_id uuid;
begin
  select e.org_id, e.farmland_id, e.job_id
  into v_org, v_farm, v_job
  from public.work_events e
  where e.id = p_completion_event_id
    and e.action='complete'
    and e.org_id = public.current_org_id();

  if v_org is null then
    raise exception '취소할 작업 기록을 찾을 수 없습니다.';
  end if;

  if exists (
    select 1 from public.work_events c
    where c.action='cancel' and c.target_event_id=p_completion_event_id
  ) then
    select c.id into v_id from public.work_events c
    where c.action='cancel' and c.target_event_id=p_completion_event_id
    order by c.occurred_at desc limit 1;
    return v_id;
  end if;

  insert into public.work_events(org_id, farmland_id, job_id, action, target_event_id, note, created_by)
  values (v_org, v_farm, v_job, 'cancel', p_completion_event_id, p_note, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.restore_work(p_completion_event_id uuid, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.work_events%rowtype;
  v_id uuid;
begin
  select * into v_event
  from public.work_events
  where id=p_completion_event_id
    and action='complete'
    and org_id=public.current_org_id();

  if v_event.id is null then
    raise exception '복원할 작업 기록을 찾을 수 없습니다.';
  end if;

  if not exists (
    select 1 from public.work_events c
    where c.action='cancel' and c.target_event_id=p_completion_event_id
  ) then
    return p_completion_event_id;
  end if;

  insert into public.work_events(org_id, farmland_id, job_id, action, note, created_by)
  values (v_event.org_id, v_event.farmland_id, v_event.job_id, 'complete', p_note, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.start_water(p_farmland_id uuid, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_id uuid;
begin
  select org_id into v_org from public.farmlands
  where id=p_farmland_id and org_id=public.current_org_id();

  if v_org is null then raise exception '농지를 찾을 수 없습니다.'; end if;

  select id into v_id from public.water_sessions
  where farmland_id=p_farmland_id and finished_at is null and cancelled_at is null
  limit 1;

  if v_id is not null then return v_id; end if;

  insert into public.water_sessions(org_id, farmland_id, note, created_by)
  values(v_org, p_farmland_id, p_note, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.finish_water(p_session_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.water_sessions
  set finished_at=now(), finished_by=auth.uid()
  where id=p_session_id
    and org_id=public.current_org_id()
    and finished_at is null
    and cancelled_at is null;

  if not found then raise exception '종료할 물관리 기록을 찾을 수 없습니다.'; end if;
  return p_session_id;
end;
$$;

create or replace function public.cancel_water(p_session_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.water_sessions
  set cancelled_at=now(), cancelled_by=auth.uid()
  where id=p_session_id
    and org_id=public.current_org_id()
    and cancelled_at is null;

  if not found then raise exception '취소할 물관리 기록을 찾을 수 없습니다.'; end if;
  return p_session_id;
end;
$$;

create or replace function public.register_gps_point(
  p_farmland_id uuid,
  p_longitude double precision,
  p_latitude double precision,
  p_accuracy_m double precision
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_org uuid;
  v_geom extensions.geometry;
  v_status text;
begin
  select org_id, geom into v_org, v_geom
  from public.farmlands
  where id=p_farmland_id and org_id=public.current_org_id();

  if v_org is null then raise exception '농지를 찾을 수 없습니다.'; end if;

  if p_longitude not between 124 and 132 or p_latitude not between 33 and 39.5 then
    raise exception '대한민국 범위를 벗어난 좌표입니다.';
  end if;

  if v_geom is null then
    v_status := 'gps_only';
  elsif p_accuracy_m <= 30
    and st_covers(v_geom, st_setsrid(st_makepoint(p_longitude,p_latitude),4326)) then
    v_status := 'gps_verified';
  else
    v_status := 'candidate';
  end if;

  update public.farmlands
  set gps_point=st_setsrid(st_makepoint(p_longitude,p_latitude),4326),
      gps_accuracy_m=p_accuracy_m,
      location_status=v_status,
      location_source='field_gps',
      location_verified_at=case when v_status='gps_verified' then now() else location_verified_at end,
      location_verified_by=case when v_status='gps_verified' then auth.uid() else location_verified_by end
  where id=p_farmland_id;

  insert into public.location_events(
    org_id, farmland_id, event_type, status, source, accuracy_m, point, created_by, message
  ) values (
    v_org, p_farmland_id, 'gps_register', v_status, 'field_gps', p_accuracy_m,
    st_setsrid(st_makepoint(p_longitude,p_latitude),4326), auth.uid(),
    case when v_status='gps_verified' then 'GPS가 필지 경계 안에서 확인됨'
         when v_status='gps_only' then '필지 경계 없이 GPS 점만 등록됨'
         else 'GPS 점이 경계 밖이거나 정확도가 부족함' end
  );

  return v_status;
end;
$$;

create or replace function public.save_manual_geometry(
  p_farmland_id uuid,
  p_geojson jsonb
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_org uuid;
  v_geom extensions.geometry;
begin
  if not public.is_admin() then raise exception '관리자만 경계를 저장할 수 있습니다.'; end if;

  select org_id into v_org
  from public.farmlands
  where id=p_farmland_id and org_id=public.current_org_id();

  if v_org is null then raise exception '농지를 찾을 수 없습니다.'; end if;

  v_geom := st_multi(st_collectionextract(st_makevalid(st_setsrid(st_geomfromgeojson(p_geojson::text),4326)),3));

  if v_geom is null or st_isempty(v_geom) then
    raise exception '유효한 폴리곤이 아닙니다.';
  end if;

  update public.farmlands
  set geom=v_geom,
      location_status='manual_verified',
      location_source='manual_draw',
      location_verified_at=now(),
      location_verified_by=auth.uid(),
      lookup_error=null
  where id=p_farmland_id;

  insert into public.location_events(
    org_id, farmland_id, event_type, status, source, geometry_snapshot, created_by, message
  ) values (
    v_org, p_farmland_id, 'manual_geometry', 'manual_verified', 'manual_draw',
    p_geojson, auth.uid(), '관리자가 필지 경계를 직접 저장함'
  );

  return 'manual_verified';
end;
$$;

create or replace function public.app_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
select jsonb_build_object(
  'profile', (
    select jsonb_build_object(
      'id', p.id, 'orgId', p.org_id, 'displayName', p.display_name, 'role', p.role
    )
    from public.profiles p
    where p.id=auth.uid()
  ),
  'farmlands', coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', f.id,
        'listOrder', f.list_order,
        'farmNo', f.farm_no,
        'parcelOrder', f.parcel_order,
        'displayCode', f.display_code,
        'ownerName', f.owner_name,
        'placeName', f.place_name,
        'ri', f.ri,
        'jibun', f.jibun,
        'fullAddress', f.full_address,
        'areaSqm', f.area_sqm,
        'variety', f.variety,
        'note', f.note,
        'pnu', f.pnu,
        'locationStatus', f.location_status,
        'locationSource', f.location_source,
        'gpsAccuracyM', f.gps_accuracy_m,
        'geometry', case when f.geom is null then null else st_asgeojson(f.geom)::jsonb end,
        'labelPoint', case when f.label_point is null then null else st_asgeojson(f.label_point)::jsonb end,
        'gpsPoint', case when f.gps_point is null then null else st_asgeojson(f.gps_point)::jsonb end,
        'lookupError', f.lookup_error,
        'lastLookupAt', f.last_lookup_at
      ) order by f.list_order
    )
    from public.farmlands f
    where f.org_id=public.current_org_id()
  ), '[]'::jsonb),
  'jobs', coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', j.id, 'name', j.name, 'color', j.color,
        'isWater', j.is_water, 'sortOrder', j.sort_order, 'isActive', j.is_active
      ) order by j.sort_order, j.name
    )
    from public.jobs j
    where j.org_id=public.current_org_id() and j.is_active
  ), '[]'::jsonb),
  'activeWork', coalesce((
    select jsonb_agg(jsonb_build_object(
      'eventId', e.id, 'farmlandId', e.farmland_id, 'jobId', e.job_id,
      'occurredAt', e.occurred_at, 'note', e.note
    ))
    from public.work_events e
    where e.org_id=public.current_org_id()
      and e.action='complete'
      and not exists (
        select 1 from public.work_events c
        where c.action='cancel' and c.target_event_id=e.id
      )
  ), '[]'::jsonb),
  'recentWork', coalesce((
    select jsonb_agg(x.item order by x.occurred_at desc)
    from (
      select e.occurred_at,
        jsonb_build_object(
          'id', e.id,
          'action', e.action,
          'targetEventId', e.target_event_id,
          'farmlandId', e.farmland_id,
          'displayCode', f.display_code,
          'placeName', f.place_name,
          'jobId', e.job_id,
          'jobName', j.name,
          'occurredAt', e.occurred_at,
          'note', e.note,
          'createdBy', e.created_by,
          'isCancelled', case when e.action='complete' then exists(
            select 1 from public.work_events c where c.action='cancel' and c.target_event_id=e.id
          ) else false end
        ) as item
      from public.work_events e
      join public.farmlands f on f.id=e.farmland_id
      join public.jobs j on j.id=e.job_id
      where e.org_id=public.current_org_id()
      order by e.occurred_at desc
      limit 200
    ) x
  ), '[]'::jsonb),
  'waterSessions', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', w.id, 'farmlandId', w.farmland_id,
      'startedAt', w.started_at, 'finishedAt', w.finished_at,
      'cancelledAt', w.cancelled_at, 'note', w.note
    ) order by w.started_at desc)
    from public.water_sessions w
    where w.org_id=public.current_org_id()
      and w.started_at > now() - interval '365 days'
  ), '[]'::jsonb)
)
$$;

grant execute on function public.complete_work(uuid,uuid,text) to authenticated;
grant execute on function public.cancel_work(uuid,text) to authenticated;
grant execute on function public.restore_work(uuid,text) to authenticated;
grant execute on function public.start_water(uuid,text) to authenticated;
grant execute on function public.finish_water(uuid) to authenticated;
grant execute on function public.cancel_water(uuid) to authenticated;
grant execute on function public.register_gps_point(uuid,double precision,double precision,double precision) to authenticated;
grant execute on function public.save_manual_geometry(uuid,jsonb) to authenticated;
grant execute on function public.app_snapshot() to authenticated;


create or replace function public.admin_apply_vworld_result(
  p_farmland_id uuid,
  p_pnu text,
  p_geometry jsonb,
  p_properties jsonb
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_org uuid;
  v_geom extensions.geometry;
begin
  select org_id into v_org from public.farmlands where id=p_farmland_id;
  if v_org is null then raise exception '농지를 찾을 수 없습니다.'; end if;

  v_geom := st_multi(st_collectionextract(
    st_makevalid(st_setsrid(st_geomfromgeojson(p_geometry::text),4326)), 3
  ));
  if v_geom is null or st_isempty(v_geom) then
    raise exception '브이월드에서 유효한 폴리곤을 받지 못했습니다.';
  end if;

  update public.farmlands
  set pnu=p_pnu,
      geom=v_geom,
      location_status='exact',
      location_source='vworld_wfs',
      location_verified_at=now(),
      location_verified_by=null,
      vworld_properties=p_properties,
      last_lookup_at=now(),
      lookup_error=null
  where id=p_farmland_id;

  insert into public.location_events(
    org_id, farmland_id, event_type, status, source,
    geometry_snapshot, properties, message
  ) values (
    v_org, p_farmland_id, 'vworld_sync', 'exact', 'vworld_wfs',
    p_geometry, p_properties, '리명과 지번이 일치한 필지 경계를 저장함'
  );
end;
$$;

create or replace function public.admin_record_lookup_failure(
  p_farmland_id uuid,
  p_error text,
  p_properties jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.farmlands where id=p_farmland_id;
  if v_org is null then raise exception '농지를 찾을 수 없습니다.'; end if;

  update public.farmlands
  set location_status=case when geom is null then 'lookup_failed' else location_status end,
      last_lookup_at=now(),
      lookup_error=left(p_error,1000),
      vworld_properties=coalesce(p_properties,vworld_properties)
  where id=p_farmland_id;

  insert into public.location_events(
    org_id, farmland_id, event_type, status, source, properties, message
  ) values (
    v_org, p_farmland_id, 'vworld_sync_failed', 'lookup_failed',
    'vworld_wfs', p_properties, left(p_error,1000)
  );
end;
$$;

revoke all on function public.admin_apply_vworld_result(uuid,text,jsonb,jsonb) from public, anon, authenticated;
revoke all on function public.admin_record_lookup_failure(uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.admin_apply_vworld_result(uuid,text,jsonb,jsonb) to service_role;
grant execute on function public.admin_record_lookup_failure(uuid,text,jsonb) to service_role;

-- 실시간 구독 대상
alter publication supabase_realtime add table public.farmlands;
alter publication supabase_realtime add table public.jobs;
alter publication supabase_realtime add table public.work_events;
alter publication supabase_realtime add table public.water_sessions;
alter publication supabase_realtime add table public.location_events;
