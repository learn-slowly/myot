"use client";

import type { WishItem } from "@/data/closet";
import type { CompareResult } from "@/types";

// 살/말 판정 표시용
const VERDICT_EMOJI: Record<string, string> = { "살": "🟢", "고민": "🟡", "말": "🔴" };
const VERDICT_ORDER: Record<string, number> = { "살": 0, "고민": 1, "말": 2 };

export function CompareModal({ result, loading, items, onClose }: {
  result: CompareResult | null;
  loading: boolean;
  items: WishItem[];
  onClose: () => void;
}) {
  // AI가 준 name을 비교한 실제 찜에 매칭 → 가격·사진유무·링크는 원본 데이터로 표시
  const byName = (name: string) => items.find(w => w.name.trim() === name.trim());
  const rows = result
    ? [...result.items].sort((a, b) => (VERDICT_ORDER[a.verdict] ?? 9) - (VERDICT_ORDER[b.verdict] ?? 9))
    : [];
  const topPick = result?.topPick?.trim() || "";
  const topLink = topPick ? byName(topPick)?.link : undefined;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto", background: "linear-gradient(160deg, #F5F0E1, #E8E0D0)", borderRadius: "20px 20px 0 0", padding: "20px 16px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#2A2A2A" }}>🤔 살/말 비교</span>
          <button onClick={onClose} style={{ border: "none", background: "transparent", fontSize: 18, cursor: "pointer", color: "#888" }}>✕</button>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🤔</div>
            <div style={{ fontSize: 13, color: "#888" }}>살까 말까 저울질 중...</div>
          </div>
        )}

        {!loading && result && rows.length === 0 && (
          <div style={{ fontSize: 13, color: "#E85D5D", padding: "12px 4px", lineHeight: 1.6 }}>{result.summary || "비교 결과를 불러오지 못했어요."}</div>
        )}

        {!loading && result && rows.length > 0 && (
          <div>
            {rows.map((row, i) => {
              const w = byName(row.name);
              const isPick = !!topPick && row.name.trim() === topPick;
              return (
                <div key={`${row.name}-${i}`} style={{ background: isPick ? "rgba(74,124,89,0.1)" : "rgba(255,255,255,0.7)", border: `1px solid ${isPick ? "rgba(74,124,89,0.35)" : "rgba(0,0,0,0.06)"}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 15, flexShrink: 0 }}>{VERDICT_EMOJI[row.verdict] || "🟡"}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#2A2A2A", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#2A2A2A", flexShrink: 0 }}>{row.verdict}</span>
                    {isPick && <span style={{ fontSize: 11, fontWeight: 600, color: "#4A7C59", flexShrink: 0 }}>⭐이걸로</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#555", marginTop: 4, lineHeight: 1.5 }}>{row.reason}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
                    {w?.price && <span style={{ fontSize: 11, color: "#6B2D3E", fontWeight: 600 }}>{w.price}</span>}
                    {w && !w.image_url && <span style={{ fontSize: 10, color: "#999", background: "rgba(0,0,0,0.05)", borderRadius: 4, padding: "2px 6px" }}>사진 없음</span>}
                    {w && !w.price && <span style={{ fontSize: 10, color: "#999", background: "rgba(0,0,0,0.05)", borderRadius: 4, padding: "2px 6px" }}>가격 미입력</span>}
                  </div>
                </div>
              );
            })}
            {result.summary && <div style={{ fontSize: 13, color: "#2A2A2A", background: "rgba(107,45,62,0.06)", borderRadius: 12, padding: "12px 14px", marginTop: 4, lineHeight: 1.6 }}>{result.summary}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              {topLink && <a href={topLink} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textAlign: "center", padding: 12, borderRadius: 10, background: "#4A7C59", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>구매 링크 열기(추천)</a>}
              <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)", background: "transparent", cursor: "pointer", fontSize: 13, fontFamily: "inherit", color: "#888" }}>닫기</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
