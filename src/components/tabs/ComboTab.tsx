"use client";

import { SEASONS, MOODS, type Season, type Mood, type ClothingItem } from "@/data/closet";
import { supabase } from "@/lib/db";
import type { App } from "@/app/useAppState";
import { ColorDot } from "@/components/ColorDot";
import { ItemCard } from "@/components/ItemCard";
import { Pill } from "@/components/Pill";

export function ComboTab({ app }: { app: App }) {
  const {
    comboSelections, setComboSelections, combos, activeSeason, setSelectedSeason,
    getItem, savedCombos, fetchData,
  } = app;

  const sel = comboSelections;
  const hasAny = sel.bottom || sel.top || sel.outer;
  const seasonCombos = combos.filter(c => c.season.includes(activeSeason));
  let matches = seasonCombos;
  if (sel.bottom) matches = matches.filter(c => c.bottom === sel.bottom);
  if (sel.top) matches = matches.filter(c => c.tops.includes(sel.top!));
  if (sel.outer) matches = matches.filter(c => c.outers.includes(sel.outer!));

  const availableBottoms = [...new Set(matches.map(c => c.bottom))].map(id => getItem(id)).filter((i): i is ClothingItem => !!i);
  const availableTops = [...new Set(matches.flatMap(c => c.tops))].map(id => getItem(id)).filter((i): i is ClothingItem => !!i);
  const availableOuters = [...new Set(matches.flatMap(c => c.outers))].map(id => getItem(id)).filter((i): i is ClothingItem => !!i);

  const allBottoms = !hasAny ? [...new Set(seasonCombos.map(c => c.bottom))].map(id => getItem(id)).filter((i): i is ClothingItem => !!i) : availableBottoms;
  const allTops = !hasAny ? [...new Set(seasonCombos.flatMap(c => c.tops))].map(id => getItem(id)).filter((i): i is ClothingItem => !!i) : availableTops;
  const allOuters = !hasAny ? [...new Set(seasonCombos.flatMap(c => c.outers))].map(id => getItem(id)).filter((i): i is ClothingItem => !!i) : availableOuters;

  const resetCombo = () => setComboSelections({});
  const toggle = (slot: "bottom" | "top" | "outer", id: string) => {
    if (sel[slot] === id) { const next = { ...sel }; delete next[slot]; setComboSelections(next); }
    else setComboSelections({ ...sel, [slot]: id });
  };

  const renderSlot = (label: string, slot: "bottom" | "top" | "outer", items: ClothingItem[]) => {
    const selected = sel[slot];
    if (items.length === 0 && !selected) return null;
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#2A2A2A", marginBottom: 8 }}>{label}</div>
        {selected ? (
          <ItemCard item={getItem(selected)!} compact selected onClick={() => toggle(slot, selected)} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {items.map(i => <ItemCard key={i.id} item={i} compact onClick={() => toggle(slot, i.id)} />)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 8, fontWeight: 500 }}>시즌</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {Object.entries(SEASONS).map(([k, v]) => <Pill key={k} label={v} active={activeSeason === k} onClick={() => { setSelectedSeason(k as Season); resetCombo(); }} />)}
      </div>
      {!hasAny && <div style={{ fontSize: 12, color: "#888", marginBottom: 16, lineHeight: 1.5 }}>아무 아이템이나 골라봐. 거기에 맞는 조합을 찾아줄게.</div>}
      {hasAny && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {[sel.bottom, sel.top, sel.outer].filter(Boolean).map(id => {
            const item = getItem(id!);
            if (!item) return null;
            return (
              <span key={id} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, padding: "4px 10px", borderRadius: 20, background: "rgba(107,45,62,0.08)", color: "#6B2D3E", fontWeight: 500 }}>
                {item.color && <ColorDot color={item.color} size={10} />} {item.name}
                <span onClick={() => { if (id === sel.bottom) toggle("bottom", id!); else if (id === sel.top) toggle("top", id!); else toggle("outer", id!); }} style={{ cursor: "pointer", marginLeft: 2, opacity: 0.5 }}>✕</span>
              </span>
            );
          })}
          <button onClick={resetCombo} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, border: "1px dashed rgba(0,0,0,0.15)", background: "transparent", color: "#888", cursor: "pointer", fontFamily: "inherit" }}>초기화</button>
        </div>
      )}
      {renderSlot("하의", "bottom", allBottoms)}
      {renderSlot("상의", "top", allTops)}
      {renderSlot("아우터", "outer", allOuters)}
      {hasAny && matches.length > 0 && <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#2A2A2A", marginBottom: 10 }}>추천 조합 ({matches.length}개)</div>
        {matches.map((combo) => {
          const ck = `${combo.id}`;
          const saved = savedCombos.some(s => s.key === ck);
          const comboForSave = { bottom: combo.bottom, tops: combo.tops, outers: combo.outers, shoes: combo.shoes, mood: combo.mood, season: combo.season, desc: combo.description || "" };
          return (
            <div key={combo.id} style={{ background: "rgba(255,255,255,0.7)", borderRadius: 14, padding: 16, marginBottom: 10, border: "1px solid rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#6B2D3E" }}>{combo.description}</span>
                <button onClick={async () => {
                  if (saved) {
                    await supabase.from("saved_combos").delete().eq("combo_key", ck);
                  } else {
                    await supabase.from("saved_combos").insert({ combo_key: ck, combo: comboForSave });
                  }
                  fetchData();
                }} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 18, color: saved ? "#C4952B" : "#CCC" }}>{saved ? "★" : "☆"}</button>
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>{combo.mood.map(m => <span key={m} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(0,0,0,0.06)", color: "#555" }}>{MOODS[m as Mood] || m}</span>)}</div>
              <div style={{ fontSize: 12, color: "#555", lineHeight: 1.8 }}>
                <div><strong>하의:</strong> {getItem(combo.bottom)?.name}</div>
                <div><strong>상의:</strong> {(sel.top ? [sel.top] : combo.tops).map(t => getItem(t)?.name).filter(Boolean).join(" / ")}</div>
                <div><strong>아우터:</strong> {(sel.outer ? [sel.outer] : combo.outers).map(t => getItem(t)?.name).filter(Boolean).join(" / ")}</div>
                <div><strong>신발:</strong> {combo.shoes.map(t => getItem(t)?.name).filter(Boolean).join(" / ")}</div>
              </div>
            </div>
          );
        })}
      </div>}
      {hasAny && !matches.length && <div style={{ textAlign: "center", padding: 30, color: "#888", fontSize: 13 }}>조건에 맞는 조합이 없어</div>}
    </div>
  );
}
