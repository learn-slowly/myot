"use client";

import { useState } from "react";
import { CATEGORIES, SEASONS, TAG_COLORS, type Season, type CategoryKey, type ClothingItem } from "@/data/closet";

const ALL_TAGS = Object.keys(TAG_COLORS) as import("@/data/closet").StyleTag[];
const ALL_SEASONS: Season[] = ["spring", "summer", "fall", "winter"];

export function ItemEditModal({ item, onSave, onDelete, onClose, onGenerateCombos, customCats, onAddCat }: {
  item: ClothingItem | null; onSave: (item: ClothingItem) => void; onDelete?: (id: string) => void; onClose: () => void; onGenerateCombos?: (item: ClothingItem) => void;
  customCats: Record<string, string>; onAddCat: (key: string, label: string) => void;
}) {
  const isNew = !item;
  const [form, setForm] = useState<ClothingItem>(item || {
    id: `custom-${Date.now()}`, cat: "bottoms" as CategoryKey, name: "", brand: "", color: "", season: [], tags: [], note: "",
  });

  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const allCats = { ...CATEGORIES, ...customCats };

  const fieldStyle = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid rgba(0,0,0,0.1)", fontSize: 13, fontFamily: "inherit", background: "rgba(255,255,255,0.7)", outline: "none", boxSizing: "border-box" as const };
  const labelStyle = { fontSize: 12, fontWeight: 600 as const, color: "#2A2A2A", marginBottom: 4, display: "block" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto", background: "linear-gradient(160deg, #F5F0E1, #E8E0D0)", borderRadius: "20px 20px 0 0", padding: "20px 16px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#2A2A2A" }}>{isNew ? "새 아이템 추가" : "아이템 편집"}</span>
          <button onClick={onClose} style={{ border: "none", background: "transparent", fontSize: 18, cursor: "pointer", color: "#888" }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={labelStyle}>이름 *</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={fieldStyle} placeholder="카펜터 팬츠 그레이" />
          </div>

          <div>
            <label style={labelStyle}>카테고리</label>
            {addingCat ? (
              <div style={{ display: "flex", gap: 6 }}>
                <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="새 카테고리 이름" autoFocus style={{ ...fieldStyle, flex: 1 }} />
                <button onClick={() => { if (newCatName.trim()) { const key = `custom_${Date.now()}`; onAddCat(key, newCatName.trim()); setForm({ ...form, cat: key }); setNewCatName(""); setAddingCat(false); } }} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#2A2A2A", color: "#F5F0E1", cursor: "pointer", fontSize: 12, fontFamily: "inherit", whiteSpace: "nowrap" }}>추가</button>
                <button onClick={() => { setAddingCat(false); setNewCatName(""); }} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)", background: "transparent", color: "#888", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>취소</button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 6 }}>
                <select value={form.cat} onChange={e => setForm({ ...form, cat: e.target.value as CategoryKey })} style={{ ...fieldStyle, flex: 1 }}>
                  {Object.entries(allCats).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button onClick={() => setAddingCat(true)} style={{ padding: "8px 12px", borderRadius: 8, border: "1.5px dashed rgba(0,0,0,0.15)", background: "transparent", color: "#888", cursor: "pointer", fontSize: 12, fontFamily: "inherit", whiteSpace: "nowrap" }}>+ 새 카테고리</button>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>브랜드</label>
              <input value={form.brand || ""} onChange={e => setForm({ ...form, brand: e.target.value || undefined })} style={fieldStyle} placeholder="무탠다드" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>색상</label>
              <input value={form.color || ""} onChange={e => setForm({ ...form, color: e.target.value || undefined })} style={fieldStyle} placeholder="그레이" />
            </div>
          </div>

          <div>
            <label style={labelStyle}>시즌</label>
            <div style={{ display: "flex", gap: 6 }}>
              {ALL_SEASONS.map(s => {
                const active = form.season?.includes(s);
                return <button key={s} onClick={() => setForm({ ...form, season: active ? (form.season || []).filter(x => x !== s) : [...(form.season || []), s] })} style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: active ? 600 : 400, background: active ? "#2A2A2A" : "rgba(255,255,255,0.7)", color: active ? "#F5F0E1" : "#666" }}>{SEASONS[s]}</button>;
              })}
            </div>
          </div>

          <div>
            <label style={labelStyle}>스타일 태그</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {ALL_TAGS.map(t => {
                const active = form.tags.includes(t);
                return <button key={t} onClick={() => setForm({ ...form, tags: active ? form.tags.filter(x => x !== t) : [...form.tags, t] })} style={{ padding: "4px 10px", borderRadius: 16, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 500, background: active ? (TAG_COLORS[t] || "#B0A090") : "rgba(255,255,255,0.7)", color: active ? "#fff" : "#666" }}>{t}</button>;
              })}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>사이즈</label>
              <input value={form.size || ""} onChange={e => setForm({ ...form, size: e.target.value || undefined })} style={fieldStyle} placeholder="M, 32, 270 등" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>입수 경로</label>
              <select value={form.acquired_via || ""} onChange={e => setForm({ ...form, acquired_via: e.target.value || undefined })} style={fieldStyle}>
                <option value="">선택 안 함</option>
                <option value="new">새옷 구매</option>
                <option value="gift">선물</option>
                <option value="used">중고구매</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>산/받은 날짜</label>
              <input type="date" value={form.purchased_at || ""} onChange={e => setForm({ ...form, purchased_at: e.target.value || undefined })} style={fieldStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>마지막 세탁</label>
              <input type="date" value={form.last_cleaned_at || ""} onChange={e => setForm({ ...form, last_cleaned_at: e.target.value || undefined })} style={fieldStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>구매가 (원)</label>
            <input type="number" inputMode="numeric" value={form.price ?? ""} onChange={e => setForm({ ...form, price: e.target.value ? parseInt(e.target.value) : undefined })} style={fieldStyle} placeholder="53000 — 입력하면 착용당 비용 통계에 반영" />
          </div>

          <div>
            <label style={labelStyle}>메모</label>
            <input value={form.note || ""} onChange={e => setForm({ ...form, note: e.target.value || undefined })} style={fieldStyle} placeholder="덕 캔버스, 크롭 수선" />
          </div>
        </div>

        {onGenerateCombos && !isNew && form.cat !== "accessories" && (
          <button onClick={() => { onGenerateCombos(form); onClose(); }} style={{ width: "100%", marginTop: 16, padding: 12, borderRadius: 10, border: "1.5px dashed rgba(107,45,62,0.2)", background: "rgba(107,45,62,0.03)", cursor: "pointer", fontSize: 12, fontFamily: "inherit", color: "#6B2D3E", fontWeight: 500 }}>AI로 이 아이템 코디 조합 만들기</button>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: onGenerateCombos && !isNew ? 8 : 20 }}>
          {onDelete && !isNew && (
            <button onClick={() => { if (confirm("이 아이템을 삭제할까요?")) onDelete(form.id); }} style={{ padding: "12px 16px", borderRadius: 10, border: "1.5px solid rgba(232,93,93,0.3)", background: "transparent", color: "#E85D5D", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>삭제</button>
          )}
          <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)", background: "transparent", cursor: "pointer", fontSize: 13, fontFamily: "inherit", color: "#888" }}>취소</button>
          <button onClick={() => { if (form.name.trim()) onSave(form); }} disabled={!form.name.trim()} style={{ flex: 2, padding: 12, borderRadius: 10, border: "none", background: form.name.trim() ? "#2A2A2A" : "#CCC", color: "#F5F0E1", cursor: form.name.trim() ? "pointer" : "default", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>{isNew ? "추가" : "저장"}</button>
        </div>
      </div>
    </div>
  );
}
