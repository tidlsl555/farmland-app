# 설치·배포 절차

## 1. 계정과 키 준비

필요한 계정은 두 개입니다.

- Supabase 프로젝트
- 브이월드 OpenAPI 인증키

브이월드 키에는 최종 웹앱의 HTTPS 도메인을 등록합니다.

## 2. Supabase 데이터베이스 만들기

Supabase Dashboard의 SQL Editor에서 순서대로 실행합니다.

1. `supabase/migrations/001_schema.sql`
2. `supabase/seed.sql`

첫 파일은 PostGIS, 테이블, RLS, 실시간 구독, 작업·취소·물관리·GPS RPC를 만듭니다.
두 번째 파일은 농지 81개와 작업 12개를 등록합니다.

## 3. 관리자 사용자 만들기

Supabase Dashboard > Authentication > Users에서 이메일 사용자를 생성합니다.

`supabase/bootstrap_admin.sql`에서 다음 부분을 실제 이메일로 바꾼 뒤 SQL Editor에서 실행합니다.

```sql
where email = 'YOUR_ADMIN_EMAIL@example.com'
```

조직 ID는 이미 `11111111-1111-4111-8111-111111111111`로 맞춰져 있습니다.

## 4. Edge Function 배포

Supabase CLI를 설치하고 프로젝트에 로그인한 뒤 프로젝트 루트에서 실행합니다.

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy vworld-parcel-sync
```

브이월드 키와 허용 도메인을 secret으로 등록합니다.

```bash
supabase secrets set VWORLD_API_KEY=YOUR_VWORLD_KEY
supabase secrets set VWORLD_DOMAIN=https://YOUR-APP-DOMAIN.example
supabase secrets set ALLOWED_ORIGINS=https://YOUR-APP-DOMAIN.example
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`는 Supabase 함수 환경에서 기본 제공됩니다.

## 5. 웹앱 서버 설정

Netlify 또는 Vercel의 프로젝트 환경변수에 아래 공개 가능한 두 값만 등록합니다.

```text
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

`vite.config.js`가 빌드할 때 값을 HTML 런타임 설정으로 주입합니다. 값이 없으면 프로덕션 빌드는 실패하므로 빈 설정으로 잘못 배포되지 않습니다.

`SUPABASE_SERVICE_ROLE_KEY`, `VWORLD_API_KEY`는 웹 호스팅 환경변수나 프런트엔드 코드에 넣지 마세요. 이 값들은 Supabase Edge Function secret으로만 관리합니다.

로컬 빌드에서는 `.env.local`에 같은 값을 넣고 빌드합니다.

```bash
npm install
npm run build
```

완성된 정적 웹앱은 `dist/`에 생성됩니다.

## 6. HTTPS 배포

### Netlify

소스 저장소를 Netlify에 연결하면 `netlify.toml`에 따라 `npm run build`가 실행되고 `dist/`가 배포됩니다.
또는 이미 생성된 `dist/` 폴더를 Netlify Drop에 직접 올릴 수 있습니다.
`netlify.toml`에는 보안 헤더와 GPS 권한 정책이 포함되어 있습니다.

### Cloudflare Pages

- Framework preset: Vite 또는 None
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: 프로젝트 폴더

## 7. 도메인 등록

배포 URL이 만들어진 뒤 다음 설정을 완료합니다.

- Supabase Authentication > URL Configuration
  - Site URL: 실제 HTTPS 주소
  - Redirect URLs: 실제 주소와 필요한 경로
- 브이월드 API 설정
  - 실제 HTTPS 도메인 등록
- Edge Function secret의 `VWORLD_DOMAIN`, `ALLOWED_ORIGINS`
  - 실제 주소로 다시 설정

## 8. 최초 위치 등록

관리자 로그인 후:

1. 메뉴
2. 위치 관리
3. `미등록 필지 일괄조회`
4. 실패 농지만 `현장 GPS` 또는 `경계그리기`

자동조회는 주소 좌표 주변의 WFS 피처 중 리명과 지번이 모두 일치한 경우만 저장합니다.
일치하지 않는 후보는 정확경계로 처리하지 않습니다.

## 9. 추가 사용자

Authentication에서 사용자를 만든 후 SQL Editor에서 프로필을 추가합니다.

```sql
insert into public.profiles(id, org_id, display_name, role)
select id, '11111111-1111-4111-8111-111111111111', email, 'member'
from auth.users
where email='MEMBER_EMAIL@example.com';
```

읽기 전용 사용자는 role을 `viewer`로 설정하십시오.
현재 RPC는 member도 작업 기록을 작성할 수 있습니다.

## 10. 운영 전 검사

- 다른 휴대전화 두 대에서 같은 계정 또는 같은 조직 계정으로 로그인
- 한 기기에서 작업 완료 후 다른 기기에 즉시 반영되는지 확인
- 하단 최근 작업 취소 버튼이 시간이 지나도 유지되는지 확인
- 작업 기록에서 과거 완료를 취소하고 복원할 수 있는지 확인
- 물관리 외 작업에서 물관리 상자가 숨겨지는지 확인
- 정확경계 수가 실제 WFS/직접경계 수와 같은지 확인
