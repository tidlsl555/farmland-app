# 논관리 (Farmland App)

농지와 작업 일정을 관리하는 Supabase 기반 반응형 웹앱입니다.

## 기능

- 이메일/비밀번호 회원가입 및 로그인
- 사용자별 농지·면적·품종 관리
- 작업 일정 및 완료 상태 관리
- Supabase Realtime 실시간 동기화
- RLS 기반 사용자별 데이터 격리

## Supabase 설정

1. Supabase 대시보드의 SQL Editor에서 `supabase.sql`을 실행합니다.
2. Authentication 이메일 설정을 확인합니다.
3. `app.js`의 Project URL과 Publishable key가 대상 프로젝트와 일치하는지 확인합니다.

`service_role` 키와 데이터베이스 비밀번호는 프런트엔드 코드에 넣지 마세요.
