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
              onPointerCancel={clearLongPress}
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
