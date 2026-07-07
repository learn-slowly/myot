# myot: 찜 여러 개 가성비 비교 설계

날짜: 2026-07-07
상태: 사용자 승인 완료 · 구현 완료

> **개정 2026-07-07:** 판단 축을 "가성비 순위" → **"후보별 살/말 판정 + 그중 하나 추천"**으로 변경.
> `CompareResult`가 `{ items: [{name, verdict("살"/"고민"/"말"), reason}], topPick, summary }`로 바뀜.
> 나머지(선택 UX·멀티이미지 `/api/compare`·모달 구조)는 동일. 아래 본문의 "가성비" 서술은 이 개정으로 대체됨.

## 배경과 목표

현재 살/말(BuyOrNot)은 **아이템 1개**를 옷장 기준으로 "살까/고민/말까" 단건 판단만 한다.
사용자가 사고 싶은 후보가 여럿일 때 "이 중에 뭐가 제일 나은가"를 물을 수 없다.

찜 목록에서 **여러 아이템을 골라, "이 돈이면 뭐가 제일 남는 장사인가"를 AI가 순위로
매겨주는** 기능을 추가한다. 판단 축은 **가성비** — 가격 대비 활용도(옷장 조합 기여·중복
여부·스타일/색 적합)를 종합해 1위를 추천하고, 셋 다 별로면 "스킵"도 말해준다.

성공 기준:
- 찜에서 2~5개를 골라 한 번에 가성비 순위 결과를 받는다.
- 사진 있는 찜은 이미지로, 없는 찜은 이름/가격/메모 텍스트로 — **혼합** 비교된다.
- 기존 단건 살/말 흐름은 그대로 동작한다(회귀 없음).

## 현재 구조 (관련 코드)

- `src/components/tabs/WishlistTab.tsx`: 찜 목록. 아이템 탭 → 편집 모달(`setEditingWish`).
- `src/components/WishEditModal.tsx`: 편집 + "🤔 살/말 판단"(`onJudge`, 사진 필수) / "📦 옷장으로".
- `src/app/useAppState.ts`:
  - `judgeWish(wish)` — 찜의 `image_url`을 `buyImage`로 넘기고 `setView("buyornot")`.
  - `analyzeBuyOrNot()` — 이미지 1장 + 옷장 요약 + 스타일 축/개인 원칙 프롬프트를
    `/api/analyze`로 보내 `{verdict, itemName, analysis}` 파싱.
- `src/app/api/analyze/route.ts`: **이미지 1장** + `prompt`을 받아 Claude로 릴레이.
  `imageUrl`이 오면 서버가 sharp로 fetch·리사이즈(외부 쇼핑몰 CORS 회피). `claude-sonnet-5`,
  adaptive thinking, max_tokens 4000.
- 찜 데이터(`WishItem`): `id, name, status, note, price?, link?, image_url?`.

## 선택한 접근

검토한 대안:
- 선택 UX — A(찜 탭 비교 모드) / B(살/말 탭 픽커) / C(롱프레스). → **A + C 채택**:
  비교 모드(체크박스 + 하단 바)를 기본으로 하되 아이템 롱프레스로도 진입.
- API — 기존 `/api/analyze` 확장 vs 신규 엔드포인트. → **신규 `/api/compare` 채택**:
  멀티이미지 메시지 조립이 단건과 구조가 달라 분리하는 편이 깨끗함.

## 구성 요소

### 1. 선택 UX (WishlistTab)

- 평상시엔 현재와 동일. 목록 상단에 **`⚖️ 비교`** 버튼 추가.
- **비교 모드 진입**: `⚖️ 비교` 버튼 탭, 또는 **아이템 롱프레스**(약 500ms). 롱프레스로
  진입하면 그 아이템은 선택된 상태로 시작.
- 비교 모드 상태:
  - 각 행 왼쪽에 체크박스. 행 탭 = 선택 토글(모드 중엔 편집 모달 안 열림).
  - 하단 고정 바: `취소` + **`N개 비교하기`**(선택 2개 미만이면 비활성).
  - 상한 **5개**. 5개 선택 후 추가 시도 시 비활성 표시 + "최대 5개까지" 안내.
- **비교 실행**: 선택된 `WishItem[]`로 `runCompare(items)` 호출 → 결과 모달.

롱프레스 구현 주의: PWA/모바일에서 롱프레스는 네이티브 컨텍스트 메뉴/텍스트 선택을
유발할 수 있음. pointer 이벤트 + 타이머로 직접 구현하고, 발동 시 `preventDefault` 및
이동(스크롤) 감지 시 취소. 데스크톱에선 `⚖️ 비교` 버튼이 주 진입로.

### 2. 상태 (useAppState)

- `compareMode: boolean` — 비교 모드 on/off.
- `compareSelection: Set<string>` — 선택된 찜 id.
- `compareLoading: boolean`, `compareResult: CompareResult | null`.
- 액션: `enterCompareMode(seedId?)`, `toggleCompareSelect(id)`, `cancelCompare()`,
  `runCompare(items)`.
- 프롬프트/옷장 요약은 `analyzeBuyOrNot`와 **동일 규칙**으로 클라이언트에서 구성
  (스타일 축·퍼스널컬러·개인 원칙 문구 재사용 — 공통 상수로 뽑아 중복 제거).

### 3. 신규 API `/api/compare`

요청:
```json
{
  "candidates": [
    { "name": "카키 바지", "price": "40,000원", "note": "빼입기용", "imageUrl": "https://..." },
    { "name": "네이비 치노", "price": "53,000원", "imageUrl": "https://..." },
    { "name": "브라운 니트", "price": "120,000원" }
  ],
  "instruction": "<옷장 요약 + 가성비 순위 지시 + 출력 형식 프롬프트>"
}
```

서버 처리:
- 각 후보의 `imageUrl`을 `/api/analyze`와 동일한 sharp fetch·리사이즈로 병렬 처리
  (1024px inside, jpeg 85). 실패한 후보는 이미지 없이 진행(전체 실패 아님).
- Claude 메시지 `content` 조립: 후보마다 `[텍스트: "후보 i: 이름 / 가격 / 메모 (사진
  없음 표시)"] + [이미지 블록(있으면)]`, 마지막에 `[텍스트: instruction]`.
- `claude-sonnet-5`, adaptive thinking, max_tokens 4000. 응답 원문 릴레이(클라이언트 파싱).

출력 JSON(프롬프트가 지시, 클라이언트가 파싱):
```json
{
  "ranking": [
    { "rank": 1, "name": "카키 바지", "price": "40,000원", "reason": "4만에 조합 폭 제일 넓음" },
    { "rank": 2, "name": "네이비 치노", "price": "53,000원", "reason": "비슷한 카키 팬츠 이미 있음" },
    { "rank": 3, "name": "브라운 니트", "price": "120,000원", "reason": "활용도 낮은데 제일 비쌈" }
  ],
  "topPick": "카키 바지",
  "summary": "이번엔 카키 바지 하나만. 니트는 세일 때."
}
```

### 4. 결과 모달 (CompareModal.tsx)

- 로딩: "가성비 저울질 중…".
- 결과: 순위 카드 리스트. 1위는 🏆 + 강조 배경. 각 행 = 순위/이름/가격/한 줄 이유.
  하단에 `summary` 종합 한마디.
- 사진 없이 판단된 후보는 행에 "사진 없음" 배지.
- 가격 미입력 후보는 "가격 미입력 — 가성비 판단 제한" 표시(순위엔 포함).
- 액션: `닫기`. 1위에 `link`가 있으면 `구매 링크 열기(1위)` 버튼.

## 데이터 흐름

```
찜 탭 (비교 모드) → 2~5개 선택 → runCompare(items)
  → 클라 프롬프트/옷장요약 구성 → POST /api/compare {candidates, instruction}
  → 서버: 이미지 병렬 fetch·리사이즈 → 멀티이미지 메시지 → Claude
  → 응답 릴레이 → 클라 JSON 파싱 → compareResult → CompareModal 렌더
```

## 에러 처리 / 엣지 케이스

- 이미지 1장 fetch 실패 → 해당 후보 텍스트만으로 비교, 결과에 "사진 없음" 표시.
- 후보 전원 사진 없음 → 텍스트만으로도 정상 동작(가격+이름 중심).
- 가격 미입력 후보 → 순위엔 넣되 플래그 표시.
- 선택 1개 이하 → `N개 비교하기` 비활성(실행 불가).
- 선택 6개째 → 비활성 + "최대 5개까지" 안내.
- API/파싱 실패 → 모달에 에러 메시지 + `다시 시도`.
- 비교 모드 중 다른 탭 이동 → 모드/선택 초기화(`cancelCompare`).

## 검증

이 프로젝트는 테스트 하니스가 없어 **`npm run build` 통과 + 실기 스모크**로 확인:
1. 찜 3개(사진O 2 + 텍스트 1) 선택 → 비교 → 순위 3개·종합 표시.
2. 사진 없는 후보에 "사진 없음" 배지, 가격 없는 후보에 플래그.
3. 롱프레스로 비교 모드 진입 + 선택 seed 동작(모바일).
4. `⚖️ 비교` 버튼 진입 → 취소 → 목록 정상 복귀.
5. 기존 단건 살/말(살/말 탭, 찜 편집 "살/말 판단")이 그대로 동작(회귀 없음).

## 범위 밖 (YAGNI)

- 1위를 옷장/찜확정 상태로 자동 이동시키는 결과 액션은 이번엔 제외 — 기존 per-item
  흐름(편집 모달의 "옷장으로", 상태 변경)으로 충분.
- 예산 상한 입력(예: "10만원 이하로") 필터는 이번 범위 밖.
