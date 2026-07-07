# 주문내역 import를 찜 → 옷장으로 전환

- 날짜: 2026-07-07
- 상태: 승인, 구현 진행

## 배경/문제

"주문내역으로 한번에 추가"(OrderImportModal)는 쇼핑몰 주문내역 캡처를 AI로 파싱해
`wish_items`(찜, status:"watch")에 일괄 등록하고, 사용자가 찜 탭에서 아이템을 하나씩
`moveWishToCloset`으로 옷장에 옮겨야 했다. 그러나 주문내역 = **이미 구매확정한 물건**
(purchased_at까지 뽑음)이라, "살까 말까 지켜보는" 찜에 쌓는 것은 개념적으로 어긋난다.
또 버튼도 찜 탭에 있다.

## 결정

등록 대상을 `clothing_items`(옷장)로 바꾸고, 버튼도 찜 탭 → 옷장 탭으로 이동한다.
`ClothingItem` 스키마는 brand·color·size·purchased_at·price·acquired_via를 모두 가지므로,
찜(note에 뭉쳐 넣던 방식)보다 손실 없이 구조적으로 저장된다.

## 변경 (파일 3개)

### ① OrderImportModal.tsx
- `Parsed` 타입에 `_season: Season[]` 추가, 파싱 시 `[]` 초기화
- 검수(미리보기) 화면 각 아이템 카드에 봄·여름·가을·겨울 4개 토글(다중선택) 추가 →
  사용자가 아이템별 시즌 지정 (기본 미지정)
- `save()`: `wish_items.insert` → `clothing_items.insert`, 매핑:
  - `id`: `custom-${Date.now()}-${idx}` (일괄 insert id 충돌 방지)
  - `cat`: `i.category`가 CATEGORIES 키면 그대로, 아니면 `accessories`
  - `name`/`brand`/`color`/`size`: 파싱값 그대로 (null 허용)
  - `price`: `"29,890원"` → `29890` 숫자 파싱, 실패 시 null
  - `purchased_at`: 그대로 (통계·시즌 집계에 쓰임)
  - `acquired_via`: `"new"` (통계에서 "새옷 구매"로 분류)
  - `image_url`: 크롭·업로드 결과 (기존과 동일)
  - `season`: `i._season`, `tags`: `[]`
- 문구: "주문내역으로 찜 채우기" → "옷장 채우기", "N개 찜에 추가" → "N개 옷장에 추가"

### ② WishlistTab.tsx
OrderImportModal import·`showImport` state·`📥 주문내역으로 한번에 추가` 버튼·모달 마운트 제거.

### ③ ClosetTab.tsx
위 4개를 이관 — 옷장 탭 상단에 버튼 + 모달. 완료 후 옷장 탭에 머무르며 `fetchData()`.

## 검증
- `npx tsc --noEmit` 0, `npm run build` 0
- 배포 후 사용자 UI 확인(주문내역 캡처 → 파싱 → 시즌 지정 → 옷장 등록)

## 비목표
- parse-orders AI 프롬프트 변경(시즌 추론 등)은 범위 밖 — 사용자가 검수 화면에서 직접 지정
- 기존 옷장 아이템 편집 UI 변경 없음
