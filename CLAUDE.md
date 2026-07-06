# [CLAUDE.md](http://CLAUDE.md)

## 언어

- 코드 주석, 커밋 메시지, 응답 모두 한국어

## 프로젝트

- myot (My Only Trend): AI 기반 스타일 규칙 옷장 관리 앱
- Next.js 15 + TypeScript + Tailwind CSS v4 + Supabase + Cloudinary
- AI: Anthropic Claude Sonnet (API Route 경유)
- 배포: Vercel ([myot-five.vercel.app](http://myot-five.vercel.app))

## 핵심 규칙

- [prd.md](http://prd.md)가 기능 명세서. 새 기능 구현 전에 반드시 참조
- page.tsx가 1700줄+ 상태. 새 기능 추가 시 탭별 컴포넌트로 분리 우선
- 시즌별 소재 완전 분리 원칙 절대 위반 금지
- API 키는 반드시 API Route 경유 (클라이언트 노출 금지)
- 데이터는 Supabase에 저장. localStorage 사용 금지

## 로드맵

- 현재: PWA (웹)
- 향후: Expo (React Native) 네이티브 앱 전환 예정
- 웹 전용 API 의존 최소화할 것

## 세션 종료 기록 (옵시디언 데일리 로그)

작업 세션을 마무리할 때, 오늘 한 일을 옵시디언 데일리 노트에 기록할 것.

- 파일: `/Users/ahbaik/coding/notebox/Calendar/YYYY-MM-DD.md` (오늘 날짜, KST 기준)
- 위치: `## ✅ 오늘 한 일 #daily_donelist` 섹션 안. `**개발**` 소제목이 있으면 그 아래에 줄 추가, 없으면 섹션 끝(다음 `##` 헤딩 직전)에 `**개발**` 소제목을 만들고 그 아래에 추가
- 형식: `- [프로젝트명] 한 일 요약 한 줄 (다음: 다음 액션 한 줄)`
- 규칙: 기존 내용은 절대 수정·삭제하지 말고 줄 추가만 할 것. 오늘 날짜 파일이 없으면 새로 만들지 말고 기록을 건너뛸 것.