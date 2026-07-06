"use client";

import { useState, useRef } from "react";
import type { WishItem } from "@/data/closet";
import type { WishStatus } from "@/types";

export function WishEditModal({ wish, wishStatuses, onClose, onSave, onDelete, onAddStatus, onMoveToCloset, onJudge }: {
  wish: WishItem;
  wishStatuses: WishStatus[];
  onClose: () => void;
  onSave: (w: WishItem) => void;
  onDelete: (id: string) => void;
  onAddStatus: (label: string) => Promise<string>;
  onMoveToCloset: (w: WishItem) => void;
  onJudge: (w: WishItem) => void;
}) {
  const [form, setForm] = useState({ ...wish });
  const [newStatusName, setNewStatusName] = useState("");
  const [uploading, setUploading] = useState(false);
  const wishImageRef = useRef<HTMLInputElement>(null);
  const fieldStyle = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid rgba(0,0,0,0.1)", fontSize: 13, fontFamily: "inherit", background: "rgba(255,255,255,0.7)", outline: "none", boxSizing: "border-box" as const };
  const labelStyle = { fontSize: 12, fontWeight: 600 as const, color: "#2A2A2A", marginBottom: 4, display: "block" };

  const handleWishImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => { reader.onload = () => resolve(reader.result as string); reader.readAsDataURL(file); });
      const res = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: base64 }) });
      const data = await res.json();
      if (res.ok) setForm({ ...form, image_url: data.url });
    } catch {}
    setUploading(false);
    e.target.value = "";
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto", background: "linear-gradient(160deg, #F5F0E1, #E8E0D0)", borderRadius: "20px 20px 0 0", padding: "20px 16px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#2A2A2A" }}>찜 아이템 편집</span>
          <button onClick={onClose} style={{ border: "none", background: "transparent", fontSize: 18, cursor: "pointer", color: "#888" }}>✕</button>
        </div>

        {/* 이미지 */}
        <input ref={wishImageRef} type="file" accept="image/*" onChange={handleWishImage} style={{ display: "none" }} />
        <div onClick={() => wishImageRef.current?.click()} style={{ marginBottom: 12, borderRadius: 12, overflow: "hidden", cursor: "pointer", background: "rgba(0,0,0,0.03)", border: "1.5px dashed rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", minHeight: form.image_url ? "auto" : 80 }}>
          {uploading ? <span style={{ fontSize: 12, color: "#888", padding: 20 }}>업로드 중...</span>
            : form.image_url ? <img src={form.image_url} alt={form.name} style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }} />
            : <span style={{ fontSize: 12, color: "#888", padding: 20 }}>📷 사진 추가</span>}
        </div>
        {form.image_url && <button onClick={() => setForm({ ...form, image_url: undefined })} style={{ fontSize: 11, color: "#E85D5D", background: "transparent", border: "none", cursor: "pointer", marginBottom: 8, fontFamily: "inherit" }}>사진 삭제</button>}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={labelStyle}>이름</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={fieldStyle} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>가격</label>
              <input value={form.price || ""} onChange={e => setForm({ ...form, price: e.target.value || undefined })} style={fieldStyle} placeholder="53,000원" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>상태</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={fieldStyle}>
                {wishStatuses.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>새 상태 추가</label>
            <div style={{ display: "flex", gap: 6 }}>
              <input value={newStatusName} onChange={e => setNewStatusName(e.target.value)} style={{ ...fieldStyle, flex: 1 }} placeholder="봄/가을에 찾기, 겨울에 찾기..." />
              <button onClick={async () => { if (newStatusName.trim()) { const id = await onAddStatus(newStatusName.trim()); setForm({ ...form, status: id }); setNewStatusName(""); } }} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#2A2A2A", color: "#F5F0E1", cursor: "pointer", fontSize: 12, fontFamily: "inherit", flexShrink: 0 }}>추가</button>
            </div>
          </div>
          <div>
            <label style={labelStyle}>구매처 링크</label>
            <input value={form.link || ""} onChange={e => setForm({ ...form, link: e.target.value || undefined })} style={fieldStyle} placeholder="https://..." />
          </div>
          <div>
            <label style={labelStyle}>메모</label>
            <input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} style={fieldStyle} placeholder="빼입기용, 여름에 필요" />
          </div>
        </div>

        {/* 찜 = 인박스: 여기서 살/말 판단으로 보내거나 옷장으로 졸업 */}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={() => onJudge(form)} disabled={!form.image_url} title={form.image_url ? "" : "사진이 있어야 살/말 판단 가능"} style={{ flex: 1, padding: 11, borderRadius: 10, border: "1.5px solid rgba(107,45,62,0.25)", background: form.image_url ? "rgba(107,45,62,0.04)" : "rgba(0,0,0,0.03)", color: form.image_url ? "#6B2D3E" : "#bbb", cursor: form.image_url ? "pointer" : "default", fontSize: 12, fontWeight: 500, fontFamily: "inherit" }}>🤔 살/말 판단</button>
          <button onClick={() => onMoveToCloset(form)} style={{ flex: 1, padding: 11, borderRadius: 10, border: "1.5px solid rgba(74,124,89,0.3)", background: "rgba(74,124,89,0.06)", color: "#4A7C59", cursor: "pointer", fontSize: 12, fontWeight: 500, fontFamily: "inherit" }}>📦 옷장으로 (샀어)</button>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button onClick={() => onDelete(form.id)} style={{ padding: "12px 16px", borderRadius: 10, border: "1.5px solid rgba(232,93,93,0.3)", background: "transparent", color: "#E85D5D", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>삭제</button>
          <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)", background: "transparent", cursor: "pointer", fontSize: 13, fontFamily: "inherit", color: "#888" }}>취소</button>
          <button onClick={() => onSave(form)} style={{ flex: 2, padding: 12, borderRadius: 10, border: "none", background: "#2A2A2A", color: "#F5F0E1", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>저장</button>
        </div>
      </div>
    </div>
  );
}
