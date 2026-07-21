# 실시간 농지 필지경계 관리 웹앱

기존 로컬 HTML 저장 방식을 폐기하고 다음 구조로 전환한 배포용 프로젝트입니다.

- 지도 엔진: OpenLayers
- 필지 경계: 브이월드 지번 좌표 + 연속지적도 WFS
- 실시간 데이터: Supabase Postgres / Realtime
- 공간 연산: PostGIS
- 외부 API 보호: Supabase Edge Function
- 작업 취소: 삭제가 아닌 취소 이벤트 영구 기록
- 물관리: 시작·종료·취소 이력 유지
- 실패 위치: 현장 GPS 등록 또는 관리자가 경계 직접 그리기
- 입력 농지: 81개

## 중요

이 폴더의 `supabase/seed.sql`과 `data/`에는 지주명과 지번이 포함되어 있습니다.
공개 GitHub 저장소에 올리지 말고 비공개 저장소 또는 직접 배포를 사용하십시오.

연속지적도 경계는 현장관리용 참조 자료이며 법적 측량 경계로 사용하면 안 됩니다.

## 빠른 설치

상세 순서는 `docs/SETUP_KO.md`를 따릅니다.

1. Supabase 프로젝트 생성
2. `supabase/migrations/001_schema.sql` 실행
3. `supabase/seed.sql` 실행
4. Authentication에서 관리자 사용자 생성
5. `supabase/bootstrap_admin.sql`의 이메일 수정 후 실행
6. Edge Function `vworld-parcel-sync` 배포
7. 브이월드 키를 Edge Function secret으로 등록
8. 호스팅 환경변수에 `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` 입력
9. `npm install && npm run build`로 `dist/` 생성
10. `dist/`를 HTTPS 호스팅에 배포하고 브이월드·Supabase에 실제 도메인 등록

## 폴더

- `index.html`, `src/app.js`, `src/styles.css`: 웹앱 소스
- `vite.config.js`: 배포 환경변수를 런타임 공개 설정으로 안전하게 주입
- `dist/`: 바로 배포할 수 있도록 빌드된 정적 웹앱
- `supabase/migrations/001_schema.sql`: DB, RLS, RPC, Realtime 설정
- `supabase/seed.sql`: 81개 농지와 작업 12개
- `supabase/functions/vworld-parcel-sync`: 브이월드 주소/WFS 검증 함수
- `data/farmlands.seed.csv`: 정규화한 81개 농지 검수용
- `docs/SETUP_KO.md`: 설치·배포
- `docs/OPERATIONS_KO.md`: 현장 사용법

## 위치 상태

- `exact`: 브이월드 WFS의 리명·지번이 일치한 필지 경계
- `gps_verified`: 저장된 필지 경계 안에서 정확도 30m 이하 GPS 확인
- `manual_verified`: 관리자가 직접 그려 확정한 경계
- `gps_only`: 자동조회 실패 후 GPS 점만 등록
- `lookup_failed`: 주소 또는 WFS 자동조회 실패
- `missing`: 위치 미등록

`gps_only`는 필지 경계가 아니므로 정확경계 수에 포함하지 않습니다.
