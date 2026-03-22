# 내옷 myot — My Only Trend

> AI 기반 스타일 규칙 옷장 관리 앱
> "유행은 따르지 않는다. 나만의 트렌드를 입는다."

## 뭐하는 앱?

옷은 많은데 입을 게 없다면, 옷이 문제가 아니라 **조합**이 문제다.

myot은 자기 스타일 규칙이 있는 사람을 위한 AI 옷장 관리 앱이다. 워크웨어, 아이비, 아메카지 같은 서브컬처 패션 스타일을 이해하고, 시즌별 소재 분리를 지키며, "안 입는 옷 사지 않기" 같은 개인 원칙을 데이터로 지켜준다.

## 주요 기능

### 📸 OOTD — 오늘 뭐 입었어?
사진 올리면 AI가 착장 분석. 옷장 아이템 자동 매칭 후 수정 가능. 저장하면 AI가 코디 코멘트까지 달아줌.

### 👔 옷장 — 내 옷 전부
카테고리별 보기, 시즌 필터, 아이템 추가/편집/삭제. 사진 등록하면 썸네일로 표시. 새 아이템 추가하면 AI가 자동으로 코디 조합 생성.

### 🎨 코디 — 이 옷에 뭘 입지?
하의, 상의, 아우터 중 아무거나 먼저 선택하면 나머지를 추천. 선택할수록 좁혀짐. 시즌별 완전 분리.

### ☀ 오늘 뭐 입지 — 지금 나가는데?
현재 날씨 자동 연동. 기온으로 시즌 자동 판단, 비 오면 비 올 때 신발 우선, 최근에 안 입은 옷 우선 추천.

### 🤔 살/말 — 이거 살까?
사고 싶은 옷 사진 올리면 내 옷장 데이터 기반으로 AI가 판단. 중복 체크, 활용도, 스타일 적합성, 색상 조화 분석 후 🟢살 / 🟡고민 / 🔴말 판정.

### ⭐ 찜 — 사고 싶은 것들
가격, 구매처 링크, 사진, 메모 관리. 상태 카테고리 자유 추가 가능 (다음달 구매, 여름에 찾기, 봄/가을에 찾기 등).

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프레임워크 | Next.js 15 + TypeScript + Tailwind CSS v4 |
| DB | Supabase PostgreSQL |
| 이미지 | Cloudinary CDN |
| AI | Anthropic Claude Sonnet (서버사이드 API Route) |
| 날씨 | Open-Meteo (무료, 키 불필요) |
| 배포 | Vercel (GitHub 자동 배포) |
| PWA | 홈 화면 추가 가능 |

## 개발

```bash
# 의존성 설치
npm install

# 환경변수 설정 (.env.local)
ANTHROPIC_API_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# 로컬 개발
npm run dev
```

## 배포

GitHub `main` 브랜치에 push하면 Vercel에서 자동 배포.
다른 브랜치에 push하거나 PR 만들면 Preview 배포.
