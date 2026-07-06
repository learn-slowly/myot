"use client";

import type { WishItem } from "@/data/closet";
import { supabase } from "@/lib/db";
import type { App } from "@/app/useAppState";

export function WishlistTab({ app }: { app: App }) {
  const {
    wishlist, wishStatuses, setEditingWish,
    newWish, setNewWish, addWish,
    savedCombos, getItem, fetchData,
  } = app;

  const grouped: Record<string, WishItem[]> = {};
  wishlist.forEach(w => { if (!grouped[w.status]) grouped[w.status] = []; grouped[w.status].push(w); });
  const statusMap = Object.fromEntries(wishStatuses.map(s => [s.id, s]));
  // 상태 순서: DB 순서 우선, 없는 상태는 뒤에
  const statusOrder = [...wishStatuses.map(s => s.id), ...Object.keys(grouped).filter(k => !wishStatuses.some(s => s.id === k))];
  return (
    <div>
      {statusOrder.map(st => { const its = grouped[st] || []; if (!its.length) return null; const s = statusMap[st]; return (
        <div key={st} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: s?.color || "#8E8E8E", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: s?.color || "#8E8E8E" }} />{s?.label || st} ({its.length})</div>
          {its.map(w => (
            <div key={w.id} onClick={() => setEditingWish(w)} style={{ background: "rgba(255,255,255,0.7)", borderRadius: 12, padding: "12px 16px", marginBottom: 6, border: "1px solid rgba(0,0,0,0.06)", cursor: "pointer" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {w.image_url && <img src={w.image_url} alt={w.name} style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#2A2A2A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</div>
                    <span style={{ fontSize: 11, color: "#B0A090", flexShrink: 0, marginLeft: 8 }}>편집</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                    {w.price && <span style={{ marginRight: 8 }}>{w.price}</span>}
                    {w.note}
                  </div>
                  {w.link && <div style={{ fontSize: 11, marginTop: 2 }}><a href={w.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: "#5A7BA0", textDecoration: "underline" }}>구매 링크</a></div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      ); })}
      <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
        <input value={newWish} onChange={e => setNewWish(e.target.value)} placeholder="찜할 아이템 추가..." style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1.5px solid rgba(0,0,0,0.1)", fontSize: 13, fontFamily: "inherit", background: "rgba(255,255,255,0.7)", outline: "none" }} onKeyDown={e => { if (e.key === "Enter" && newWish.trim()) addWish(newWish.trim()); }} />
        <button onClick={() => { if (newWish.trim()) addWish(newWish.trim()); }} style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: "#2A2A2A", color: "#F5F0E1", cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "inherit" }}>추가</button>
      </div>
      {savedCombos.length > 0 && <div style={{ marginTop: 28 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#C4952B", marginBottom: 10 }}>★ 저장한 코디 ({savedCombos.length})</div>
        {savedCombos.map((sc, idx) => (
          <div key={idx} style={{ background: "rgba(196,149,43,0.06)", borderRadius: 12, padding: "12px 16px", marginBottom: 6, border: "1px solid rgba(196,149,43,0.15)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><div style={{ fontSize: 13, fontWeight: 500, color: "#2A2A2A" }}>{sc.combo.desc}</div><div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{getItem(sc.combo.bottom)?.name} + {sc.combo.tops.length}개 상의</div></div>
            <button onClick={async () => { await supabase.from("saved_combos").delete().eq("combo_key", sc.key); fetchData(); }} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#C4952B", fontSize: 16, padding: 4 }}>★</button>
          </div>
        ))}
      </div>}
    </div>
  );
}
