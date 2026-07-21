-- 1) Supabase Dashboard > Authentication > Users 에서 먼저 사용자를 만듭니다.
-- 2) 아래 이메일을 실제 관리자 이메일로 바꾸고 실행합니다.
insert into public.profiles(id, org_id, display_name, role)
select id, '11111111-1111-4111-8111-111111111111', coalesce(raw_user_meta_data->>'name', email), 'admin'
from auth.users
where email = 'YOUR_ADMIN_EMAIL@example.com'
on conflict (id) do update
set org_id=excluded.org_id, display_name=excluded.display_name, role='admin';
