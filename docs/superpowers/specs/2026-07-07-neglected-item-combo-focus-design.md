# 뜸했던 옷 클릭 → 그 옷 코디 필터

- 날짜: 2026-07-07
- 상태: 승인, 구현 진행

## 배경

MoodTab("오늘 뭐 입지")의 "요즘 뜸했던 옷 — 오늘 살려볼까?" 섹션은 21일+ 안 입은
아이템 최대 3개를 표시만 하고 클릭 동작이 없었다. 사용자가 그 옷을 클릭해 "오늘 이 옷으로
어떻게 입을지" 코디를 바로 볼 수 있게 한다.

## 결정

같은 화면에서 필터. 뜸한 옷을 클릭하면 아래 코디 목록이 그 옷이 포함된 조합으로 바뀐다.
기존 조합이 있으면 즉시, 없으면 `generateCombosForItem`(기존 함수)으로 AI 생성.

## 변경 (MoodTab.tsx 한 파일)

- props에 `generateCombosForItem`, `generatingCombos` 추가 (app에 이미 존재)
- 로컬 state `focusItem: ClothingItem | null`
- 헬퍼:
  - `comboHasItem(c, id)`: `[c.bottom, ...c.tops, ...c.outers, ...c.shoes].includes(id)`
  - `focusCombos`: focusItem 포함 조합, 최대 5개
  - `selectNeglected(item)`: `setFocusItem(item)` + 포함 조합이 하나도 없으면 `generateCombosForItem(item)`
- 뜸한 옷 행: `cursor:pointer` + onClick=selectNeglected, 선택 시 하이라이트, 우측 `›` 힌트,
  섹션 헤더에 "(탭해서 코디 보기)" 안내
- 코디 목록 분기:
  - focusItem 있으면 → 헤더 "👕 {이름} 살리는 코디 · ✕ 해제", 목록을 focusCombos로 교체
    (시즌·무드 필터 무시). 생성 중 로딩, 생성 후 0개면 폴백 문구
  - focusItem 없으면 → 기존(시즌·무드 필터 + shuffled 3개 + "다른 조합 보기")

## 검증
- `npx tsc --noEmit` 0, `npm run build` 0
- 배포 후 사용자 UI 확인(뜸한 옷 탭 → 코디 필터 전환·해제·생성)

## 비목표
- `generateCombosForItem` 로직 자체 변경 없음 (기존 검증된 함수)
- combo 탭 등 다른 탭 변경 없음
- "기존 조합 있어도 더 만들기" 버튼은 범위 밖 (없을 때만 자동 생성)
