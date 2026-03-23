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