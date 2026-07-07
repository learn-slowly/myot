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
          <div style={{ fontSize: 13, color: "#E85D5D", padding: "12px 4px", lineHeight: 1.6 }}>{result.summary || "비교 결과를 불러오지 못했어요."}</div>
        )}

        {!loading && result && rows.length > 0 && (
          <div>
            {rows.map((row, i) => {
              const w = byName(row.name);
              const isTop = row.rank === 1;
              return (
                <div key={`${row.rank}-${i}`} style={{ background: isTop ? "rgba(196,149,43,0.1)" : "rgba(255,255,255,0.7)", border: `1px solid ${isTop ? "rgba(196,149,43,0.3)" : "rgba(0,0,0,0.06)"}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8 }}>
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
