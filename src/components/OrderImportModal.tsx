"use client";

import { useState, useRef } from "react";
import { CATEGORIES } from "@/data/closet";
import { supabase } from "@/lib/db";
import { resizeImage } from "@/lib/utils";

type Parsed = {
  name: string; brand?: string | null; color?: string | null; size?: string | null;
  price?: string | null; purchased_at?: string | null; category?: string | null; is_clothing?: boolean;
  _include: boolean;
};

const CAT_LABEL = (c?: string | null) => (c && (CATEGORIES as Record<string, string>)[c]) || "기타";

// 주문내역 스크린샷/텍스트 → AI 파싱 → 검수 → 찜 일괄 등록
export function OrderImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [images, setImages] = useState<string[]>([]); // dataURL[]
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [items, setItems] = useState<Parsed[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = () => setImages(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(f);
    });
    e.target.value = "";
  };

  const parse = async () => {
    if (!images.length && !text.trim()) return;
    setParsing(true); setError(null);
    try {
      const payloadImages = await Promise.all(images.map(async (d) => {
        const resized = await resizeImage(d, 2000);
        return { data: resized.split(",")[1], mediaType: "image/jpeg" };
      }));
      const res = await fetch("/api/parse-orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: payloadImages, text: text.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "분석 실패");
      const parsed: Parsed[] = (data.items || []).map((it: Parsed) => ({ ...it, _include: it.is_clothing !== false }));
      if (!parsed.length) throw new Error("주문 상품을 찾지 못했어요");
      setItems(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "분석 중 오류");
    }
    setParsing(false);
  };

  const save = async () => {
    if (!items) return;
    const chosen = items.filter(i => i._include);
    if (!chosen.length) return;
    setSaving(true);
    const rows = chosen.map(i => ({
      name: i.name,
      price: i.price || null,
      status: "watch",
      note: ["주문내역", CAT_LABEL(i.category), i.size || null, i.purchased_at ? `구매 ${i.purchased_at}` : null].filter(Boolean).join(" · "),
    }));
    await supabase.from("wish_items").insert(rows);
    setSaving(false);
    onDone();
  };

  const field = { width: "100%", padding: "7px 10px", borderRadius: 8, border: "1.5px solid rgba(0,0,0,0.1)", fontSize: 12, fontFamily: "inherit", background: "rgba(255,255,255,0.7)", outline: "none", boxSizing: "border-box" as const };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, maxHeight: "88vh", overflowY: "auto", background: "linear-gradient(160deg, #F5F0E1, #E8E0D0)", borderRadius: "20px 20px 0 0", padding: "20px 16px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#2A2A2A" }}>주문내역으로 찜 채우기</span>
          <button onClick={onClose} style={{ border: "none", background: "transparent", fontSize: 18, cursor: "pointer", color: "#888" }}>✕</button>
        </div>

        {!items ? (
          <>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 12, lineHeight: 1.5 }}>무신사·네이버·29cm 등 주문내역 캡처를 올리거나 텍스트를 붙여넣으면, AI가 상품·가격·구매일·카테고리를 뽑아줘.</div>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={addFiles} style={{ display: "none" }} />
            {images.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                {images.map((d, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img src={d} alt="" style={{ width: 52, height: 52, borderRadius: 8, objectFit: "cover", border: "1px solid rgba(0,0,0,0.1)" }} />
                    <span onClick={() => setImages(prev => prev.filter((_, j) => j !== i))} style={{ position: "absolute", top: -6, right: -6, background: "#2A2A2A", color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>✕</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => fileRef.current?.click()} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1.5px dashed rgba(107,45,62,0.25)", background: "rgba(107,45,62,0.03)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, color: "#6B2D3E", fontWeight: 500, marginBottom: 8 }}>📷 스크린샷 추가 {images.length ? `(${images.length})` : ""}</button>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="또는 주문내역 텍스트 붙여넣기 (선택)" rows={2} style={{ ...field, resize: "vertical", marginBottom: 8 }} />
            {error && <div style={{ fontSize: 12, color: "#E85D5D", marginBottom: 8 }}>{error}</div>}
            <button onClick={parse} disabled={parsing || (!images.length && !text.trim())} style={{ width: "100%", padding: 12, borderRadius: 10, border: "none", background: parsing || (!images.length && !text.trim()) ? "#B0A090" : "#2A2A2A", color: "#F5F0E1", cursor: parsing ? "default" : "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>{parsing ? "AI 분석 중..." : "분석하기"}</button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 10 }}>{items.length}개 발견 · 넣을 것만 체크하고 확인해. 옷 아닌 잡화는 미리 빼놨어.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              {items.map((it, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 10px", borderRadius: 10, background: it._include ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.06)", opacity: it._include ? 1 : 0.55 }}>
                  <input type="checkbox" checked={it._include} onChange={e => setItems(items.map((x, j) => j === i ? { ...x, _include: e.target.checked } : x))} style={{ marginTop: 3, cursor: "pointer", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <input value={it.name} onChange={e => setItems(items.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} style={{ ...field, fontWeight: 500, marginBottom: 4 }} />
                    <div style={{ display: "flex", gap: 6 }}>
                      <input value={it.price || ""} onChange={e => setItems(items.map((x, j) => j === i ? { ...x, price: e.target.value } : x))} placeholder="가격" style={{ ...field, flex: 1 }} />
                      <span style={{ fontSize: 10, color: "#888", alignSelf: "center", flexShrink: 0, padding: "0 4px" }}>{CAT_LABEL(it.category)}{it.is_clothing === false ? " · 잡화" : ""}{it.purchased_at ? ` · ${it.purchased_at}` : ""}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setItems(null); setError(null); }} style={{ flex: 1, padding: 11, borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)", background: "transparent", cursor: "pointer", fontSize: 12, fontFamily: "inherit", color: "#888" }}>다시</button>
              <button onClick={save} disabled={saving || !items.some(i => i._include)} style={{ flex: 2, padding: 11, borderRadius: 10, border: "none", background: saving ? "#B0A090" : "#6B2D3E", color: "#fff", cursor: saving ? "default" : "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>{saving ? "추가 중..." : `${items.filter(i => i._include).length}개 찜에 추가`}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
