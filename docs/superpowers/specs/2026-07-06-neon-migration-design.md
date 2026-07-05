# myot: Supabase → Neon 마이그레이션 설계

날짜: 2026-07-06
상태: 사용자 승인 완료

## 배경과 목표

Supabase Pro 조직에서 프로젝트 3개를 운영하며 월 ~$50가 나가고 있다. myot(옷장 앱)는
Supabase의 DB 기능만 사용한다(Auth/Storage/Realtime 미사용, 이미지는 Cloudinary).
Neon 무료 플랜(프로젝트당 0.5GB, 월 100 CU-hours, scale-to-zero)으로 옮겨 비용을 없앤다.
myot가 3개 중 첫 번째 이전 대상이다.

성공 기준:
- 모든 기능(옷장 CRUD, 코디, OOTD, 위시, 비움, 커스텀 카테고리)이 Neon 위에서 동일하게 동작
- 데이터 손실 없음 (테이블별 row count 일치)
- DB 접속 정보가 브라우저에 노출되지 않음 (현재 anon key 공개 구조보다 개선)

## 현재 구조

- `src/lib/supabase.ts`: anon key로 만든 supabase-js 클라이언트 (브라우저에서 직접 DB 호출)
- `src/app/page.tsx`: supabase 호출 약 30곳
- 테이블 8개: `clothing_items`, `combos`, `saved_combos`, `ootd_logs`,
  `wish_items`, `wish_statuses`, `letgo_items`, `custom_categories`
- 사용하는 쿼리 문법: `from().select("*")[.order(col, {ascending})]`,
  `insert(obj|rows)`, `upsert(obj)`, `update(obj).eq(col, val)`, `delete().eq(col, val)`,
  빌더에 직접 `.then()` 체이닝 (thenable 필수)

## 선택한 접근: 서버 API 라우트 + supabase 호환 shim

검토한 대안:
- A. Neon Data API (PostgREST 호환): 코드 변경 최소지만 베타 기능, 테이블별 RLS/익명 grant
  필요, DB가 계속 공개 노출 → 탈락
- B. **단일 서버 API 라우트 + 호환 shim → 채택**
- C. 자원별 REST 전면 리팩터: 가장 깨끗하지만 비용 절감 목적 대비 과함 → 탈락

## 구성 요소

### 1. Neon 프로젝트
- `neonctl`로 생성 (사용자 계정, 브라우저 로그인 1회), 리전은 도쿄/싱가포르 중 가용한 곳
- connection string은 `.env.local`의 `DATABASE_URL` (서버 전용, `NEXT_PUBLIC_` 아님)

### 2. 스키마·데이터 이전
- Supabase public 스키마의 8개 테이블만 이전 (DDL + 데이터)
- 1차 시도: Supabase MCP(`execute_sql`)로 DDL·데이터 추출 → psql로 Neon에 적용
- 대안: 사용자에게 DB 비밀번호를 받아 `pg_dump --schema=public` → `psql` 복원
- serial/identity 시퀀스는 복원 후 `setval`로 보정
- 검증: 테이블별 `SELECT count(*)` 원본·대상 비교

### 3. `src/app/api/db/route.ts` (신규)
- POST 바디: `{ table, op, payload?, filters?, order? }`
  - `op`: `select | insert | upsert | update | delete`
  - `filters`: `[{ col, val }]` (eq만 지원 — 현재 코드가 eq만 사용)
  - `order`: `{ col, ascending }`
- 테이블 화이트리스트 맵 (8개). 맵에 upsert 충돌 키 포함:
  `clothing_items: id`, `wish_items: id` (upsert를 쓰는 테이블만 필요하지만 전 테이블 pk 명시)
- 컬럼 식별자는 `/^[a-z_][a-z0-9_]*$/` 검증 후 쿼팅, 값은 전부 파라미터 바인딩
- 드라이버: `@neondatabase/serverless` (HTTP 기반, Vercel 서버리스 적합)
- 성공: `{ data }`, 실패: `{ error: message }` + 4xx/5xx

### 4. `src/lib/db.ts` (신규)
- supabase-js와 같은 문법의 thenable 쿼리 빌더
- 지원: `from`, `select`, `order`, `insert`, `upsert`, `update`, `delete`, `eq`, `then`
- await/then 시 `/api/db`로 fetch, `{ data, error }` 형태로 resolve (throw하지 않음 —
  supabase-js와 동일)
- export 이름은 `supabase`로 유지해 `page.tsx` 변경을 import 한 줄로 한정

### 5. 기존 코드 정리
- `src/app/page.tsx`: import 경로만 `@/lib/supabase` → `@/lib/db`
- `src/lib/supabase.ts` 삭제, `@supabase/supabase-js` 의존성 제거
- `.env.local`: `DATABASE_URL` 추가. `NEXT_PUBLIC_SUPABASE_*`는 검증 완료 후 제거

## 에러 처리

- 라우트: 화이트리스트 밖 테이블/잘못된 op → 400, SQL 오류 → 500 + `{ error }`
- shim: HTTP 실패·네트워크 오류를 `{ data: null, error }`로 변환 (기존 호출부는 error를
  거의 확인하지 않으므로 동작 변화 없음)

## 검증 계획

1. 데이터: 테이블별 row count 원본 일치
2. 기능: 로컬 dev 서버에서 실제 플로우 구동 — 옷장 로드/추가/수정/삭제, 사진 URL 제거,
   OOTD 기록/삭제/메모, 위시 추가/상태 변경/삭제, 코디 저장/해제, 비움 처리
3. 배포: Vercel 사용 중이면 `DATABASE_URL` 환경변수 추가 후 프로덕션 동작 확인

## 롤백·마무리

- 이전 기간 동안 Supabase 프로젝트는 그대로 유지 (즉시 롤백 가능: import 한 줄 복원)
- 며칠 사용 후 문제없으면 Supabase 프로젝트 일시정지/삭제는 사용자가 결정
- 나머지 2개 프로젝트 이전은 별도 작업
