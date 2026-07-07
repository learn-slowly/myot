# 찜 여러 개 가성비 비교 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 찜 목록에서 2~5개를 골라 "가격 대비 활용도(가성비)" 순위를 AI가 매겨주는 기능을 추가한다.

**Architecture:** 찜 탭에 비교 모드(체크박스 + 하단 실행 바, 롱프레스 진입)를 넣고, 선택한 찜(사진 있으면 이미지 URL, 없으면 텍스트)을 신규 `/api/compare`로 보낸다. 서버가 각 이미지를 fetch·리사이즈해 Claude 멀티이미지 메시지를 조립하고 순위 JSON을 돌려준다. 결과는 `CompareModal`로 렌더한다. 결과는 탭이 아니라 모달이라 `View` 유니온은 건드리지 않는다.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, `@anthropic` REST(fetch 직접 호출), `sharp`(이미지 리사이즈), Vercel.

## Global Constraints

- 언어: 코드 주석·커밋 메시지·UI 카피 모두 한국어.
- API 키는 서버 라우트 경유만 (클라이언트 노출 금지). `ANTHROPIC_API_KEY`는 `/api/compare`에서만 읽는다.
- 데이터는 DB(Neon, `supabase` 호환 빌더 경유). localStorage 금지.
- AI 모델은 `claude-sonnet-5` (은퇴한 `claude-sonnet-4` 사용 금지).
- **테스트 하니스 없음**: 이 프로젝트엔 단위 테스트 프레임워크가 없고 도입은 이번 범위 밖. 각 태스크의 자동 게이트는 **`npx tsc --noEmit`(타입체크)**, 마지막 태스크에서 **`npm run build` + 실기 스모크**. 테스트 파일을 새로 만들지 말 것.
- 기존 단건 살/말(살/말 탭, 찜 편집의 "🤔 살/말 판단")은 회귀 없이 그대로 동작해야 한다.
- 파일 상한 5개 로직: 6번째 선택은 무시(Set 크기 5에서 add 안 함).
- 커밋은 main에 직접(레포 관행). **모든 커밋 메시지 끝에 아래 2줄 트레일러를 붙인다:**
  ```
  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01JhWeGeY8sWoniarHKhPSyw
  ```

## File Structure

- **Create** `src/lib/prompts.ts` — 살/말·비교 공통 프롬프트 조각(`STYLE_CONTEXT`, `buildWardrobeSummary`). 책임: 옷장 요약·스타일 컨텍스트 문자열 생성 한 곳.
- **Modify** `src/types.ts` — 비교 관련 타입(`CompareCandidate`, `CompareRankingRow`, `CompareResult`) 추가.
- **Create** `src/app/api/compare/route.ts` — 후보 배열 + 지시문 받아 멀티이미지 Claude 호출, 순위 JSON 릴레이.
- **Modify** `src/app/useAppState.ts` — 공통 프롬프트로 `analyzeBuyOrNot` 리팩터, 비교 state·액션 추가, 반환부 확장, 탭 이탈 시 모드 초기화.
- **Create** `src/components/CompareModal.tsx` — 로딩/순위 결과 모달.
- **Modify** `src/components/tabs/WishlistTab.tsx` — 비교 모드 UI(체크박스·상단 버튼·롱프레스·하단 바).
- **Modify** `src/app/page.tsx` — `CompareModal` 마운트.

---

### Task 1: 공통 프롬프트 추출 + analyzeBuyOrNot 리팩터

살/말과 비교가 같은 옷장 요약·스타일 기준을 쓰므로 먼저 공통 상수로 빼서 DRY하게 만든다. 동작은 그대로(순수 리팩터).

**Files:**
- Create: `src/lib/prompts.ts`
- Modify: `src/app/useAppState.ts:531-551` (analyzeBuyOrNot의 wardrobeSummary/prompt 구성부)

**Interfaces:**
- Produces:
  - `STYLE_CONTEXT: string`
  - `buildWardrobeSummary(items: ClothingItem[]): string`

- [ ] **Step 1: 공통 프롬프트 파일 생성**

Create `src/lib/prompts.ts`:

```ts
import { CATEGORIES, SEASONS, type ClothingItem } from "@/data/closet";

// 살/말 단건 판단과 여러 개 비교가 같은 스타일 기준을 공유한다.
export const STYLE_CONTEXT = `스타일 축: 워크웨어, 아이비/프레피, 힙합 캐주얼
퍼스널컬러: 웜톤 가을(Autumn) — 어스톤 컬러(브라운, 카키, 샌드베이지, 머스터드)
개인 원칙: 빼입기 선호, 안 입는 옷 사지 않기, 모자 안 씀, 노란색은 어렵다(머스터드가 한계)`;

// 옷장 아이템을 프롬프트용 한 줄 요약 목록으로 만든다 (잡화 제외).
export function buildWardrobeSummary(items: ClothingItem[]): string {
  return items
    .filter(i => i.cat !== "accessories")
    .map(i =>
      `${i.name}${i.color ? ` (${i.color})` : ""}${i.brand ? ` [${i.brand}]` : ""} — ${CATEGORIES[i.cat]}${i.season ? ` [${i.season.map(s => SEASONS[s]).join("/")}]` : ""}`
    )
    .join("\n");
}
```

- [ ] **Step 2: analyzeBuyOrNot을 공통 함수로 교체**

`src/app/useAppState.ts` 상단 import 블록에 추가(기존 `@/lib/utils` import 아래):

```ts
import { STYLE_CONTEXT, buildWardrobeSummary } from "@/lib/prompts";
```

`analyzeBuyOrNot` 안의 `wardrobeSummary` 계산부(현재 531-533행)를 아래로 교체:

```ts
      const wardrobeSummary = buildWardrobeSummary(allItems);
```

같은 함수 안 `prompt` 문자열에서 인라인 스타일 3줄(현재 540-542행)을 `${STYLE_CONTEXT}` 한 줄로 교체. 교체 후 prompt 앞부분은 정확히 이 모양이어야 한다:

```ts
      const prompt = `사진 속 옷에 대해 "살까 말까" 판단을 해줘.

현재 옷장:
${wardrobeSummary}

${STYLE_CONTEXT}

분석해줄 것:
1. 중복 체크: 옷장에 비슷한 아이템이 있는지
2. 활용도: 이 아이템이 있으면 기존 옷들과 새 조합이 몇 개나 가능한지
3. 스타일 적합성: 내 스타일 축에 맞는지
4. 색상 조화: 내 옷장 컬러 팔레트와 어울리는지

답변 형식 (JSON만):
{"verdict": "살" 또는 "고민" 또는 "말", "itemName": "사진 속 아이템 이름 (예: 네이비 치노 팬츠)", "analysis": "한국어로 4-5문장 분석. 각 항목(중복/활용도/스타일/색상)을 자연스럽게 포함해서."}`;
```

- [ ] **Step 3: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없이 통과 (exit 0).

- [ ] **Step 4: 실기 스모크 (단건 살/말 회귀 확인)**

`npm run dev` → 살/말 탭에서 사진 1장 업로드 → "AI 분석하기" → 이전과 동일하게 verdict/analysis가 나오는지 확인. (리팩터라 결과 문구가 동일 계열이어야 함)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/prompts.ts src/app/useAppState.ts
git commit -m "refactor: 살/말 옷장 요약·스타일 컨텍스트를 prompts.ts 공통 상수로 추출"
```
(+ Global Constraints의 공통 트레일러 2줄)

---

### Task 2: 비교 타입 + /api/compare 라우트

멀티이미지 비교 엔드포인트. 후보의 이미지 URL을 서버가 fetch·리사이즈하고, 실패한 후보는 텍스트만으로 진행한다.

**Files:**
- Modify: `src/types.ts` (파일 끝에 추가)
- Create: `src/app/api/compare/route.ts`

**Interfaces:**
- Produces:
  - `CompareCandidate { name: string; price?: string; note?: string; imageUrl?: string }`
  - `CompareRankingRow { rank: number; name: string; reason: string }`
  - `CompareResult { ranking: CompareRankingRow[]; topPick: string; summary: string }`
  - `POST /api/compare` 요청 `{ candidates: CompareCandidate[]; instruction: string }` → Anthropic messages 원문 응답(`{ content: [{text}] }`) 릴레이.

- [ ] **Step 1: 타입 추가**

`src/types.ts` 파일 끝에 추가:

```ts
export interface CompareCandidate {
  name: string;
  price?: string;
  note?: string;
  imageUrl?: string;
}

export interface CompareRankingRow {
  rank: number;
  name: string;
  reason: string;
}

export interface CompareResult {
  ranking: CompareRankingRow[];
  topPick: string;
  summary: string;
}
```

- [ ] **Step 2: 비교 API 라우트 생성**

Create `src/app/api/compare/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import type { CompareCandidate } from "@/types";

export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } },
};

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// 후보 이미지 URL을 서버가 대신 fetch·리사이즈 (외부 쇼핑몰 CORS 회피). 실패 시 null.
async function fetchImage(url: string): Promise<{ data: string; type: string } | null> {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow", signal: AbortSignal.timeout(12000) });
    if (!r.ok) return null;
    const resized = await sharp(Buffer.from(await r.arrayBuffer()))
      .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    return { data: resized.toString("base64"), type: "image/jpeg" };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your-api-key-here") {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const { candidates, instruction } = (await req.json()) as {
    candidates: CompareCandidate[];
    instruction: string;
  };
  if (!Array.isArray(candidates) || candidates.length < 2) {
    return NextResponse.json({ error: "후보가 2개 이상 필요해요" }, { status: 400 });
  }

  // 후보별 이미지 병렬 fetch
  const images = await Promise.all(
    candidates.map(c => (c.imageUrl ? fetchImage(c.imageUrl) : Promise.resolve(null)))
  );

  // 멀티이미지 메시지 조립: 후보마다 [라벨] + [이미지(있으면)], 마지막에 지시문
  const content: Array<Record<string, unknown>> = [];
  candidates.forEach((c, i) => {
    const priceStr = c.price ? `가격 ${c.price}` : "가격 미입력";
    const noteStr = c.note ? ` / 메모: ${c.note}` : "";
    const img = images[i];
    content.push({
      type: "text",
      text: `후보 ${i + 1}: ${c.name} / ${priceStr}${noteStr}${img ? "" : " (사진 없음)"}`,
    });
    if (img) {
      content.push({ type: "image", source: { type: "base64", media_type: img.type, data: img.data } });
    }
  });
  content.push({ type: "text", text: instruction });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      messages: [{ role: "user", content }],
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: `Anthropic API error: ${response.status}` }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
```

- [ ] **Step 3: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없이 통과.

- [ ] **Step 4: 라우트 스모크 (로컬)**

`npm run dev` 상태에서 텍스트 전용 후보로 호출:

```bash
curl -s -X POST http://localhost:3000/api/compare \
  -H "Content-Type: application/json" \
  -d '{"candidates":[{"name":"카키 바지","price":"40,000원"},{"name":"브라운 니트","price":"120,000원"}],"instruction":"두 후보 중 가성비 순위를 JSON으로만: {\"ranking\":[{\"rank\":1,\"name\":\"\",\"reason\":\"\"}],\"topPick\":\"\",\"summary\":\"\"}"}' | head -c 400
```
Expected: `{"content":[{"type":"text","text":"..."}], ...}` 형태로 JSON 텍스트가 돌아옴(200). 401/500이면 `.env.local`의 `ANTHROPIC_API_KEY` 확인.

- [ ] **Step 5: 커밋**

```bash
git add src/types.ts src/app/api/compare/route.ts
git commit -m "feat: /api/compare — 여러 찜 멀티이미지 가성비 비교 엔드포인트"
```
(+ 공통 트레일러)

---

### Task 3: 비교 state·액션 (useAppState)

선택 상태와 실행 로직. 프롬프트는 Task 1의 공통 함수를 쓴다. 결과 파싱은 `analyzeBuyOrNot`과 같은 패턴(코드펜스 제거 후 JSON.parse).

**Files:**
- Modify: `src/app/useAppState.ts` (state 추가: 살/말 state 아래 / 액션 추가: `analyzeBuyOrNot` 아래 / 반환부 확장 / import 확장 / view 이탈 effect)

**Interfaces:**
- Consumes: `STYLE_CONTEXT`, `buildWardrobeSummary` (Task 1); `CompareCandidate`, `CompareResult` (Task 2); 기존 `wishlist: WishItem[]`, `allItems: ClothingItem[]`, `view`.
- Produces (반환 객체에 추가):
  - `compareMode: boolean`
  - `compareSelection: Set<string>`
  - `compareLoading: boolean`
  - `compareResult: CompareResult | null`
  - `compareItems: WishItem[]`
  - `enterCompareMode(seedId?: string): void`
  - `cancelCompare(): void`
  - `toggleCompareSelect(id: string): void`
  - `runCompare(): void`
  - `closeCompareResult(): void`

- [ ] **Step 1: import에 CompareResult/CompareCandidate 추가**

`src/app/useAppState.ts`의 types import(현재 8행)를 확장:

```ts
import type { DbCombo, OotdLog, SavedCombo, LetgoItem, WishStatus, Weather, CompareResult, CompareCandidate } from "@/types";
```

- [ ] **Step 2: 비교 state 추가**

`buyFileRef` 선언(현재 67행) 바로 아래에 추가:

```ts
  // 여러 개 비교 (가성비) state
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<Set<string>>(new Set());
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [compareItems, setCompareItems] = useState<WishItem[]>([]);
```

- [ ] **Step 3: 비교 액션 추가**

`analyzeBuyOrNot` 함수 끝(현재 570행 `};` 다음) 바로 아래에 추가:

```ts
  // ─── 여러 개 비교 (가성비) ─────────────────────────────────────
  const enterCompareMode = (seedId?: string) => {
    setCompareMode(true);
    setCompareSelection(seedId ? new Set([seedId]) : new Set());
  };
  const cancelCompare = () => {
    setCompareMode(false);
    setCompareSelection(new Set());
  };
  const toggleCompareSelect = (id: string) => {
    setCompareSelection(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else { if (next.size >= 5) return prev; next.add(id); }
      return next;
    });
  };
  const closeCompareResult = () => {
    setCompareResult(null);
    setCompareItems([]);
  };
  const runCompare = async () => {
    const items = wishlist.filter(w => compareSelection.has(w.id));
    if (items.length < 2) return;
    setCompareItems(items);
    setCompareMode(false);
    setCompareSelection(new Set());
    setCompareResult(null);
    setCompareLoading(true);
    try {
      const candidates: CompareCandidate[] = items.map(w => ({
        name: w.name,
        price: w.price,
        note: w.note || undefined,
        imageUrl: w.image_url,
      }));
      const instruction = `아래 후보들은 내가 살까 고민 중인 옷이야. 내 옷장과 스타일을 기준으로 "가성비(가격 대비 활용도)" 순위를 매겨줘.

현재 옷장:
${buildWardrobeSummary(allItems)}

${STYLE_CONTEXT}

판단 기준: 가격 대비 활용도. 옷장에 새 조합을 얼마나 만들어주는지, 비슷한 게 이미 있는지(중복), 스타일·색이 맞는지를 가격과 함께 저울질해. 비싼데 활용도 낮으면 순위가 낮고, 싼데 활용도 높으면 위. 셋 다 별로면 summary에 사지 말라고 적어. name은 내가 준 후보 이름을 그대로 써.

답변 형식 (JSON만, 다른 말 없이):
{"ranking": [{"rank": 1, "name": "후보 이름", "reason": "가성비 관점 한 줄 이유"}], "topPick": "1위 이름", "summary": "종합 한마디 (한국어 1-2문장)"}`;

      const res = await fetch("/api/compare", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidates, instruction }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const text = data.content?.map((c: { text?: string }) => c.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean) as CompareResult;
      setCompareResult(parsed);
    } catch (err) {
      console.error("Compare error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setCompareResult({ ranking: [], topPick: "", summary: `비교에 실패했어: ${msg}` });
    }
    setCompareLoading(false);
  };
```

- [ ] **Step 4: 탭 이탈 시 비교 모드 초기화 (effect)**

`useAppState` 안, 기존 어느 `useEffect` 옆(예: state 선언들 아래, 함수 정의 위 아무 곳)에 추가:

```ts
  // 찜 탭을 벗어나면 비교 모드/선택 초기화
  useEffect(() => {
    if (view !== "wishlist" && compareMode) {
      setCompareMode(false);
      setCompareSelection(new Set());
    }
  }, [view, compareMode]);
```

- [ ] **Step 5: 반환 객체에 추가**

`return { ... }`의 `analyzeBuyOrNot,`(현재 602행) 바로 아래에 추가:

```ts
    compareMode, compareSelection, compareLoading, compareResult, compareItems,
    enterCompareMode, cancelCompare, toggleCompareSelect, runCompare, closeCompareResult,
```

- [ ] **Step 6: 타입체크**

Run: `npx tsc --noEmit`
Expected: 통과. (`CompareModal`·`WishlistTab`는 아직 이 값을 안 써도 무방 — 반환 타입만 확장됨)

- [ ] **Step 7: 커밋**

```bash
git add src/app/useAppState.ts
git commit -m "feat: 찜 가성비 비교 state·runCompare 액션 추가"
```
(+ 공통 트레일러)

---

### Task 4: CompareModal 컴포넌트

로딩/순위/에러를 그리는 모달. 가격·"사진 없음"·"가격 미입력" 배지는 AI 응답을 믿지 않고 넘겨받은 `items`(비교한 WishItem[])에서 이름 매칭으로 파생한다.

**Files:**
- Create: `src/components/CompareModal.tsx`

**Interfaces:**
- Consumes: `CompareResult` (Task 2), `WishItem` (`@/data/closet`).
- Produces: `CompareModal({ result, loading, items, onClose })` 컴포넌트.
  - props: `result: CompareResult | null; loading: boolean; items: WishItem[]; onClose: () => void`

- [ ] **Step 1: 모달 컴포넌트 생성**

Create `src/components/CompareModal.tsx`:

```tsx
"use client";

import type { WishItem } from "@/data/closet";
import type { CompareResult } from "@/types";

export function CompareModal({ result, loading, items, onClose }: {
  result: CompareResult | null;
  loading: boolean;
  items: WishItem[];
  onClose: () => void;
}) {
  // AI가 준 name을 비교한 실제 찜에 매칭 → 가격·사진유무는 원본 데이터로 표시
  const byName = (name: string) => items.find(w => w.name.trim() === name.trim());
  const rows = result ? [...result.ranking].sort((a, b) => a.rank - b.rank) : [];
  const top = rows.find(r => r.rank === 1);
  const topLink = top ? byName(top.name)?.link : undefined;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto", background: "linear-gradient(160deg, #F5F0E1, #E8E0D0)", borderRadius: "20px 20px 0 0", padding: "20px 16px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#2A2A2A" }}>💰 가성비 순위</span>
          <button onClick={onClose} style={{ border: "none", background: "transparent", fontSize: 18, cursor: "pointer", color: "#888" }}>✕</button>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>💰</div>
            <div style={{ fontSize: 13, color: "#888" }}>가성비 저울질 중...</div>
          </div>
        )}

        {!loading && result && rows.length === 0 && (
          <div style={{ fontSize: 13, color: "#E85D5D", padding: "12px 4px", lineHeight: 1.6 }}>{result.summary}</div>
        )}

        {!loading && result && rows.length > 0 && (
          <div>
            {rows.map(row => {
              const w = byName(row.name);
              const isTop = row.rank === 1;
              return (
                <div key={row.rank} style={{ background: isTop ? "rgba(196,149,43,0.1)" : "rgba(255,255,255,0.7)", border: `1px solid ${isTop ? "rgba(196,149,43,0.3)" : "rgba(0,0,0,0.06)"}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: isTop ? "#C4952B" : "#888", flexShrink: 0 }}>{isTop ? "🏆 1위" : `${row.rank}위`}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#2A2A2A", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</span>
                    {w?.price && <span style={{ fontSize: 12, color: "#6B2D3E", fontWeight: 600, flexShrink: 0 }}>{w.price}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#555", marginTop: 4, lineHeight: 1.5 }}>{row.reason}</div>
                  {w && (!w.image_url || !w.price) && (
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      {!w.image_url && <span style={{ fontSize: 10, color: "#999", background: "rgba(0,0,0,0.05)", borderRadius: 4, padding: "2px 6px" }}>사진 없음</span>}
                      {!w.price && <span style={{ fontSize: 10, color: "#999", background: "rgba(0,0,0,0.05)", borderRadius: 4, padding: "2px 6px" }}>가격 미입력</span>}
                    </div>
                  )}
                </div>
              );
            })}
            {result.summary && <div style={{ fontSize: 13, color: "#2A2A2A", background: "rgba(107,45,62,0.06)", borderRadius: 12, padding: "12px 14px", marginTop: 4, lineHeight: 1.6 }}>{result.summary}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              {topLink && <a href={topLink} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textAlign: "center", padding: 12, borderRadius: 10, background: "#6B2D3E", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>구매 링크 열기(1위)</a>}
              <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)", background: "transparent", cursor: "pointer", fontSize: 13, fontFamily: "inherit", color: "#888" }}>닫기</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 통과. (아직 마운트 안 됐어도 컴포넌트 자체가 타입 안전해야 함)

- [ ] **Step 3: 커밋**

```bash
git add src/components/CompareModal.tsx
git commit -m "feat: CompareModal — 가성비 순위 결과 모달"
```
(+ 공통 트레일러)

---

### Task 5: WishlistTab 비교 모드 UI

찜 탭에 비교 모드를 넣는다. 상단 "⚖️ 비교" 버튼, 롱프레스(500ms) 진입, 행 체크박스, 하단 고정 실행 바. 비교 모드가 아니면 기존과 동일.

**Files:**
- Modify: `src/components/tabs/WishlistTab.tsx` (전체 교체)

**Interfaces:**
- Consumes (Task 3): `compareMode`, `compareSelection`, `enterCompareMode`, `cancelCompare`, `toggleCompareSelect`, `runCompare`.

- [ ] **Step 1: WishlistTab 전체 교체**

`src/components/tabs/WishlistTab.tsx`를 아래 내용으로 완전히 교체:

```tsx
"use client";

import { useState, useRef } from "react";
import type { WishItem } from "@/data/closet";
import { supabase } from "@/lib/db";
import type { App } from "@/app/useAppState";
import { OrderImportModal } from "@/components/OrderImportModal";

export function WishlistTab({ app }: { app: App }) {
  const {
    wishlist, wishStatuses, setEditingWish,
    newWish, setNewWish, addWish, linkLoading, addWishFromLink,
    savedCombos, getItem, fetchData,
    compareMode, compareSelection, enterCompareMode, cancelCompare, toggleCompareSelect, runCompare,
  } = app;
  const [showImport, setShowImport] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  const isUrl = /^https?:\/\//i.test(newWish.trim());
  const submitWish = () => {
    const v = newWish.trim();
    if (!v || linkLoading) return;
    isUrl ? addWishFromLink(v) : addWish(v);
  };

  const startLongPress = (id: string) => {
    if (compareMode) return; // 이미 모드면 롱프레스 불필요
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => { longPressFired.current = true; enterCompareMode(id); }, 500);
  };
  const clearLongPress = () => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } };
  const onRowClick = (w: WishItem) => {
    if (longPressFired.current) { longPressFired.current = false; return; } // 롱프레스로 진입한 클릭은 무시
    if (compareMode) toggleCompareSelect(w.id);
    else setEditingWish(w);
  };

  const grouped: Record<string, WishItem[]> = {};
  wishlist.forEach(w => { if (!grouped[w.status]) grouped[w.status] = []; grouped[w.status].push(w); });
  const statusMap = Object.fromEntries(wishStatuses.map(s => [s.id, s]));
  const statusOrder = [...wishStatuses.map(s => s.id), ...Object.keys(grouped).filter(k => !wishStatuses.some(s => s.id === k))];
  const selectedCount = compareSelection.size;

  return (
    <div style={{ paddingBottom: compareMode ? 72 : 0 }}>
      {/* 비교 진입/안내 바 */}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 12, minHeight: 30 }}>
        {!compareMode ? (
          <button onClick={() => enterCompareMode()} disabled={wishlist.length < 2} style={{ padding: "7px 14px", borderRadius: 20, border: "1.5px solid rgba(107,45,62,0.25)", background: "rgba(107,45,62,0.04)", color: wishlist.length < 2 ? "#bbb" : "#6B2D3E", cursor: wishlist.length < 2 ? "default" : "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>⚖️ 비교</button>
        ) : (
          <div style={{ fontSize: 12, color: "#6B2D3E", fontWeight: 600 }}>비교할 찜 선택 (최대 5개)</div>
        )}
      </div>

      {statusOrder.map(st => { const its = grouped[st] || []; if (!its.length) return null; const s = statusMap[st]; return (
        <div key={st} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: s?.color || "#8E8E8E", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: s?.color || "#8E8E8E" }} />{s?.label || st} ({its.length})</div>
          {its.map(w => { const selected = compareSelection.has(w.id); return (
            <div key={w.id}
              onClick={() => onRowClick(w)}
              onPointerDown={() => startLongPress(w.id)}
              onPointerUp={clearLongPress}
              onPointerLeave={clearLongPress}
              onPointerMove={clearLongPress}
              style={{ background: selected ? "rgba(107,45,62,0.08)" : "rgba(255,255,255,0.7)", borderRadius: 12, padding: "12px 16px", marginBottom: 6, border: `1px solid ${selected ? "rgba(107,45,62,0.35)" : "rgba(0,0,0,0.06)"}`, cursor: "pointer", userSelect: "none", touchAction: "manipulation" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {compareMode && <span style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${selected ? "#6B2D3E" : "rgba(0,0,0,0.2)"}`, background: selected ? "#6B2D3E" : "transparent", color: "#fff", fontSize: 12, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{selected ? "✓" : ""}</span>}
                {w.image_url && <img src={w.image_url} alt={w.name} style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#2A2A2A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</div>
                    {!compareMode && <span style={{ fontSize: 11, color: "#B0A090", flexShrink: 0, marginLeft: 8 }}>편집</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                    {w.price && <span style={{ marginRight: 8 }}>{w.price}</span>}
                    {w.note}
                  </div>
                  {w.link && !compareMode && <div style={{ fontSize: 11, marginTop: 2 }}><a href={w.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: "#5A7BA0", textDecoration: "underline" }}>구매 링크</a></div>}
                </div>
              </div>
            </div>
          ); })}
        </div>
      ); })}

      {/* 하단 고정 실행 바 */}
      {compareMode && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 480, margin: "0 auto", padding: "10px 16px", background: "rgba(245,240,225,0.96)", borderTop: "1px solid rgba(0,0,0,0.08)", display: "flex", gap: 8, zIndex: 50 }}>
          <button onClick={cancelCompare} style={{ padding: "12px 18px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)", background: "transparent", cursor: "pointer", fontSize: 13, fontFamily: "inherit", color: "#888" }}>취소</button>
          <button onClick={runCompare} disabled={selectedCount < 2} style={{ flex: 1, padding: 12, borderRadius: 10, border: "none", background: selectedCount < 2 ? "rgba(0,0,0,0.15)" : "#6B2D3E", color: "#fff", cursor: selectedCount < 2 ? "default" : "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>{selectedCount < 2 ? "2개 이상 선택" : `${selectedCount}개 비교하기`}</button>
        </div>
      )}

      {/* 입력·주문내역·저장코디: 비교 모드일 땐 숨김 */}
      {!compareMode && <>
        <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
          <input value={newWish} onChange={e => setNewWish(e.target.value)} placeholder="찜할 아이템 추가... (상품 링크도 OK)" style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${isUrl ? "rgba(107,45,62,0.4)" : "rgba(0,0,0,0.1)"}`, fontSize: 13, fontFamily: "inherit", background: "rgba(255,255,255,0.7)", outline: "none" }} onKeyDown={e => { if (e.key === "Enter") submitWish(); }} />
          <button onClick={submitWish} disabled={linkLoading} style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: isUrl ? "#6B2D3E" : "#2A2A2A", color: "#F5F0E1", cursor: linkLoading ? "default" : "pointer", fontSize: 13, fontWeight: 500, fontFamily: "inherit", whiteSpace: "nowrap" }}>{linkLoading ? "분석 중..." : isUrl ? "링크 담기" : "추가"}</button>
        </div>
        <button onClick={() => setShowImport(true)} style={{ width: "100%", marginTop: 8, padding: 11, borderRadius: 10, border: "1.5px dashed rgba(107,45,62,0.25)", background: "rgba(107,45,62,0.03)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 500, color: "#6B2D3E" }}>📥 주문내역으로 한번에 추가</button>
        {showImport && <OrderImportModal onClose={() => setShowImport(false)} onDone={() => { setShowImport(false); fetchData(); }} />}
        {savedCombos.length > 0 && <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#C4952B", marginBottom: 10 }}>★ 저장한 코디 ({savedCombos.length})</div>
          {savedCombos.map((sc, idx) => (
            <div key={idx} style={{ background: "rgba(196,149,43,0.06)", borderRadius: 12, padding: "12px 16px", marginBottom: 6, border: "1px solid rgba(196,149,43,0.15)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><div style={{ fontSize: 13, fontWeight: 500, color: "#2A2A2A" }}>{sc.combo.desc}</div><div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{getItem(sc.combo.bottom)?.name} + {sc.combo.tops.length}개 상의</div></div>
              <button onClick={async () => { await supabase.from("saved_combos").delete().eq("combo_key", sc.key); fetchData(); }} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#C4952B", fontSize: 16, padding: 4 }}>★</button>
            </div>
          ))}
        </div>}
      </>}
    </div>
  );
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 통과.

- [ ] **Step 3: 커밋**

```bash
git add src/components/tabs/WishlistTab.tsx
git commit -m "feat: 찜 탭 비교 모드 — 체크박스·롱프레스·하단 실행 바"
```
(+ 공통 트레일러)

---

### Task 6: CompareModal 마운트 + 전체 스모크

`page.tsx`에 모달을 붙이고 끝단 검증.

**Files:**
- Modify: `src/app/page.tsx` (import 추가 / destructure 확장 / 모달 렌더)

**Interfaces:**
- Consumes: Task 3의 `compareResult`, `compareLoading`, `compareItems`, `closeCompareResult`; Task 4의 `CompareModal`.

- [ ] **Step 1: import 추가**

`src/app/page.tsx`의 `import { UpdateBanner }`(현재 14행) 아래에 추가:

```tsx
import { CompareModal } from "@/components/CompareModal";
```

- [ ] **Step 2: destructure 확장**

`const { ... } = app;` 블록(현재 18-24행)의 `editingWish, ...` 줄 뒤에 추가:

```tsx
    compareResult, compareLoading, compareItems, closeCompareResult,
```

- [ ] **Step 3: 모달 렌더**

Wish Edit Modal 블록(현재 82-93행) 닫는 `)}` 다음, 최상위 `</div>` 앞에 추가:

```tsx
      {/* 가성비 비교 결과 모달 */}
      {(compareLoading || compareResult) && (
        <CompareModal
          result={compareResult}
          loading={compareLoading}
          items={compareItems}
          onClose={closeCompareResult}
        />
      )}
```

- [ ] **Step 4: 타입체크 + 빌드**

Run: `npx tsc --noEmit && npm run build`
Expected: 타입 에러 0, 빌드 성공(`/api/compare` 라우트가 빌드 산출물에 포함).

- [ ] **Step 5: 실기 스모크 (전체 플로우)**

`npm run dev` → 찜 탭에서:
1. "⚖️ 비교" 탭 → 체크박스 노출. 사진 있는 찜 2 + 텍스트 찜 1 선택 → "3개 비교하기" → 로딩 → 순위 3개 + 종합 표시. 1위 🏆 강조.
2. 텍스트/사진 없는 후보 행에 "사진 없음", 가격 없는 후보에 "가격 미입력" 배지 확인.
3. 5개까지만 선택되고 6번째는 안 되는지 확인.
4. 롱프레스(모바일 또는 마우스 길게)로 아이템 꾹 → 비교 모드 진입 + 그 아이템 선택됨 확인.
5. "취소" → 목록 정상 복귀. 다른 탭 갔다 오면 모드 해제.
6. 살/말 탭 단건 판단이 그대로 동작(회귀 없음) 확인.
7. 1위에 구매 링크 있으면 "구매 링크 열기(1위)" 버튼 동작.

- [ ] **Step 6: 커밋**

```bash
git add src/app/page.tsx
git commit -m "feat: 찜 가성비 비교 결과 모달 마운트 — 기능 연결 완료"
```
(+ 공통 트레일러)

---

## Self-Review 결과

**Spec coverage:**
- 판단 축=가성비 → Task 3 instruction. ✅
- 혼합 입력(사진/텍스트) → Task 2 라우트가 이미지 없으면 텍스트 라벨만. ✅
- 선택 UX A+C(비교 모드 + 롱프레스) → Task 5. ✅
- 상한 5개 → Task 3 `toggleCompareSelect`. ✅
- 결과 모달(1위 강조·종합·배지·링크) → Task 4. ✅
- 신규 `/api/compare` 멀티이미지·서버 fetch → Task 2. ✅
- 공통 프롬프트 DRY → Task 1. ✅
- 에러/엣지(이미지 실패·가격 없음·2개 미만·탭 이탈) → Task 2 fetch null 폴백, Task 3 effect·가드, Task 4 배지·에러 summary. ✅
- 검증=빌드+스모크(테스트 하니스 없음) → Task 6. ✅
- 회귀 없음(단건 살/말) → Task 1 Step 4, Task 6 Step 5-6. ✅

**Placeholder scan:** 코드 스텝은 전부 실제 코드. "적절한 에러 처리" 류 표현 없음. ✅

**Type consistency:** `CompareResult{ranking,topPick,summary}`·`CompareRankingRow{rank,name,reason}`·`CompareCandidate{name,price?,note?,imageUrl?}`가 Task 2 정의 → Task 3 생성 → Task 4 소비까지 동일. 액션명(`enterCompareMode/cancelCompare/toggleCompareSelect/runCompare/closeCompareResult`)이 Task 3 정의 = Task 5·6 소비 일치. ✅
