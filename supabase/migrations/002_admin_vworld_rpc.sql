create or replace function public.apply_vworld_result_for_admin(
  p_farmland_id uuid,
  p_pnu text,
  p_geometry jsonb,
  p_properties jsonb
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
  if not public.is_admin() then raise exception '관리자만 실행할 수 있습니다.'; end if;
  select org_id into v_org from public.farmlands
    where id=p_farmland_id and org_id=public.current_org_id();
  if v_org is null then raise exception '필지를 찾을 수 없습니다.'; end if;
  v_geom := st_multi(st_collectionextract(st_makevalid(st_setsrid(st_geomfromgeojson(p_geometry::text),4326)),3));
  if v_geom is null or st_isempty(v_geom) then raise exception '유효한 폴리곤이 아닙니다.'; end if;
  update public.farmlands set pnu=nullif(p_pnu,''),geom=v_geom,location_status='exact',
    location_source='vworld_wfs',location_verified_at=now(),location_verified_by=auth.uid(),
    vworld_properties=p_properties,last_lookup_at=now(),lookup_error=null
    where id=p_farmland_id and org_id=v_org;
  insert into public.location_events(org_id,farmland_id,event_type,status,source,geometry_snapshot,properties,created_by,message)
    values(v_org,p_farmland_id,'vworld_sync','exact','vworld_wfs',p_geometry,p_properties,auth.uid(),'VWorld 필지 경계 동기화');
  return 'exact';
end;
$$;

revoke all on function public.apply_vworld_result_for_admin(uuid,text,jsonb,jsonb) from public, anon;
grant execute on function public.apply_vworld_result_for_admin(uuid,text,jsonb,jsonb) to authenticated;
