"use client";

import { CATEGORIES } from "@/data/closet";
import { supabase } from "@/lib/db";
import { LETGO_STATUSES } from "@/lib/utils";
import type { App } from "@/app/useAppState";
import { ColorDot } from "@/components/ColorDot";
import { ItemCard } from "@/components/ItemCard";
import { Pill } from "@/components/Pill";

export function LetgoTab({ app }: { app: App }) {
  const {
    letgoItems, letgoAdding, setLetgoAdding, letgoSearch, setLetgoSearch,
    letgoRecCat, setLetgoRecCat, allItems, customCats, wearData, fetchData,
  } = app;

  const letgoItemIds = new Set(letgoItems.map(l => l.id));
  const available = allItems.filter(i => !letgoItemIds.has(i.id));
  const filtered = available.filter(i => {
    if (!letgoSearch.trim()) return true;
    const q = letgoSearch.toLowerCase();
    return i.name.toLowerCase().includes(q) || (i.brand || "").toLowerCase().includes(q);
  });

  return (
    <div>
      {letgoItems.length === 0 && !letgoAdding && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#888" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>↗</div>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>비움 리스트가 비어있어</div>
          <div style={{ fontSize: 12 }}>안 입는 옷을 여기에 모아두자</div>
        </div>
      )}

      {letgoItems.length > 0 && Object.entries(LETGO_STATUSES).map(([statusKey, { label, color }]) => {
        const items = letgoItems.filter(l => l.status === statusKey);
        if (!items.length) return null;
        return (
          <div key={statusKey} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: color, display: "inline-block" }} />
              {label} ({items.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {items.map(l => {
                const item = allItems.find(i => i.id === l.id);
                if (!item) return null;
                return (
                  <div key={l.dbId} style={{ background: "rgba(255,255,255,0.7)", borderRadius: 12, padding: "10px 14px", border: "1px solid rgba(0,0,0,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover" }} />
                      ) : item.color ? (
                        <ColorDot color={item.color} />
                      ) : null}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "#2A2A2A" }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: "#888" }}>
                          {item.brand && `${item.brand} · `}
                          {l.reason || ""}
                          {wearData.counts[l.id] ? ` · ${wearData.counts[l.id]}회 착용` : " · 착용 기록 없음"}
                        </div>
                      </div>
                      <button onClick={async () => { await supabase.from("letgo_items").delete().eq("id", l.dbId); fetchData(); }} style={{ border: "none", background: "transparent", color: "#CCC", cursor: "pointer", fontSize: 14, padding: "0 4px" }}>✕</button>
                    </div>
                    <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {Object.entries(LETGO_STATUSES).map(([sk, sv]) => (
                        <button key={sk} onClick={async () => { if (sk !== l.status) { await supabase.from("letgo_items").update({ status: sk }).eq("id", l.dbId); fetchData(); } }}
                          style={{ padding: "3px 8px", borderRadius: 12, border: "none", fontSize: 10, fontFamily: "inherit", cursor: "pointer", fontWeight: l.status === sk ? 600 : 400, background: l.status === sk ? sv.color : "rgba(0,0,0,0.04)", color: l.status === sk ? "#fff" : "#888" }}>{sv.label}</button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {letgoAdding ? (
        <div style={{ marginBottom: 16 }}>
          <input value={letgoSearch} onChange={e => setLetgoSearch(e.target.value)} placeholder="아이템 검색..." style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid rgba(0,0,0,0.1)", fontSize: 12, fontFamily: "inherit", background: "rgba(255,255,255,0.7)", outline: "none", marginBottom: 8, boxSizing: "border-box" }} />
          <div style={{ maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
            {filtered.map(item => (
              <ItemCard key={item.id} item={item} compact onClick={async () => {
                const reason = prompt("비우는 이유 (선택)") || "";
                await supabase.from("letgo_items").insert({ item_id: item.id, reason: reason.trim() || null });
                fetchData();
              }} wearCount={wearData.counts[item.id] || 0} lastWorn={wearData.lastDates[item.id]} />
            ))}
            {filtered.length === 0 && <div style={{ textAlign: "center", padding: 20, color: "#888", fontSize: 12 }}>검색 결과 없음</div>}
          </div>
          <button onClick={() => { setLetgoAdding(false); setLetgoSearch(""); }} style={{ marginTop: 8, width: "100%", padding: 8, borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)", background: "transparent", cursor: "pointer", fontSize: 12, fontFamily: "inherit", color: "#888" }}>닫기</button>
        </div>
      ) : (
        <button onClick={() => setLetgoAdding(true)} style={{ width: "100%", padding: 14, borderRadius: 14, border: "2px dashed rgba(107,45,62,0.2)", background: "rgba(107,45,62,0.03)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 500, color: "#6B2D3E" }}>+ 비울 옷 추가</button>
      )}

      {(() => {
        const allCats = { ...CATEGORIES, ...customCats };
        const allCounts = available.map(i => wearData.counts[i.id] || 0);
        const avgCount = allCounts.length > 0 ? allCounts.reduce((a, b) => a + b, 0) / allCounts.length : 0;
        const threshold = Math.floor(avgCount / 2);
        const catsWithItems = Object.entries(allCats).filter(([k]) => available.some(i => i.cat === k && (wearData.counts[i.id] || 0) <= threshold));
        const filteredAvailable = letgoRecCat === "all" ? available : available.filter(i => i.cat === letgoRecCat);
        const candidates = filteredAvailable
          .map(i => ({ item: i, count: wearData.counts[i.id] || 0, lastWorn: wearData.lastDates[i.id] }))
          .filter(c => c.count <= threshold)
          .sort((a, b) => a.count - b.count || (a.lastWorn || "0").localeCompare(b.lastWorn || "0"))
          .slice(0, 5);
        if (available.length === 0) return null;
        return (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#C4952B", marginBottom: 8 }}>비울 옷 추천</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
              <Pill label="전체" active={letgoRecCat === "all"} onClick={() => setLetgoRecCat("all")} />
              {catsWithItems.map(([k, v]) => <Pill key={k} label={v} active={letgoRecCat === k} onClick={() => setLetgoRecCat(k)} />)}
            </div>
            {candidates.length === 0 ? (
              <div style={{ textAlign: "center", padding: 16, color: "#888", fontSize: 12 }}>이 카테고리에 추천할 아이템이 없어</div>
            ) : <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {candidates.map(({ item, count, lastWorn }) => (
                <div key={item.id} style={{ background: "rgba(196,149,43,0.05)", borderRadius: 12, padding: "10px 14px", border: "1px solid rgba(196,149,43,0.15)", display: "flex", alignItems: "center", gap: 10 }}>
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover" }} />
                  ) : item.color ? (
                    <ColorDot color={item.color} />
                  ) : null}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#2A2A2A" }}>{item.name}</div>
                    <div style={{ fontSize: 10, color: "#C4952B" }}>
                      {count > 0 ? `${count}회 착용 · 마지막 ${lastWorn}` : "착용 기록 없음"}
                    </div>
                  </div>
                  <button onClick={async () => {
                    await supabase.from("letgo_items").insert({ item_id: item.id, reason: "착용 빈도 낮음" });
                    fetchData();
                  }} style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid rgba(196,149,43,0.3)", background: "transparent", color: "#C4952B", cursor: "pointer", fontSize: 11, fontFamily: "inherit", fontWeight: 500, whiteSpace: "nowrap" }}>비움에 추가</button>
                </div>
              ))}
            </div>}
          </div>
        );
      })()}
    </div>
  );
}
