"use client";

import { useState, useRef } from "react";
import { CATEGORIES } from "@/data/closet";
import { supabase } from "@/lib/db";
import { resizeImage } from "@/lib/utils";

type Box = { x: number; y: number; w: number; h: number };
type Parsed = {
  name: string; brand?: string | null; color?: string | null; size?: string | null;
  price?: string | null; purchased_at?: string | null; category?: string | null; is_clothing?: boolean;
  image_index?: number; box?: Box;
  _include: boolean; _photo: string | null; // 크롭된 dataURL
};

const CAT_LABEL = (c?: string | null) => (c && (CATEGORIES as Record<string, string>)[c]) || "기타";

// 원본 스크린샷 dataURL에서 정규화 박스로 정사각 크롭
function cropFromImage(dataUrl: string, box: Box): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const sx = Math.max(0, box.x * img.width), sy = Math.max(0, box.y * img.height);
      const sw = Math.max(1, Math.min(img.width - sx, box.w * img.width));
      const sh = Math.max(1, Math.min(img.height - sy, box.h * img.height));
      const size = 300;
      const canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, size, size);
      const scale = Math.min(size / sw, size / sh);
      const dw = sw * scale, dh = sh * scale;
      ctx.drawImage(img, sx, sy, sw, sh, (size - dw) / 2, (size - dh) / 2, dw, dh);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// 주문내역 스크린샷/텍스트 → AI 파싱 → 검수(사진 미리보기) → 찜 일괄 등록
export function OrderImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [images, setImages] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [items, setItems] = useState<Parsed[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach(f => {
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
      const payloadImages = await Promise.all(images.map(async (d) => ({ data: (await resizeImage(d, 2000)).split(",")[1], mediaType: "image/jpeg" })));
      const res = await fetch("/api/parse-orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: payloadImages, text: text.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "분석 실패");
      const rawItems: Parsed[] = data.items || [];
      if (!rawItems.length) throw new Error("주문 상품을 찾지 못했어요");
      // 박스로 사진 크롭 (원본 스크린샷 기준)
      const parsed = await Promise.all(rawItems.map(async (it) => {
        let photo: string | null = null;
        const idx = it.image_index ?? 0;
        if (it.box && it.box.w > 0.01 && it.box.h > 0.01 && images[idx]) {
          try { photo = await cropFromImage(images[idx], it.box); } catch {}
        }
        return { ...it, _include: it.is_clothing !== false, _photo: photo };
      }));
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
    const rows = await Promise.all(chosen.map(async (i) => {
      let image_url: string | null = null;
      if (i._photo) {
        try {
          const res = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: i._photo }) });
          const d = await res.json();
          if (res.ok) image_url = d.url;
        } catch {}
      }
      return {
        name: i.name, price: i.price || null, status: "watch", image_url,
        note: ["주문내역", CAT_LABEL(i.category), i.size || null, i.purchased_at ? `구매 ${i.purchased_at}` : null].filter(Boolean).join(" · "),
      };
    }));
    await supabase.from("wish_items").insert(rows);
    setSaving(false);
    onDone();
  };

  const field = { width: "100%", padding: "7px 10px", borderRadius: 8, border: "1.5px solid rgba(0,0,0,0.1)", fontSize: 12, fontFamily: "inherit", background: "rgba(255,255,255,0.7)", outline: "none", boxSizing: "border-box" as const };
  const update = (i: number, patch: Partial<Parsed>) => setItems(items!.map((x, j) => j === i ? { ...x, ...patch } : x));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, maxHeight: "88vh", overflowY: "auto", background: "linear-gradient(160deg, #F5F0E1, #E8E0D0)", borderRadius: "20px 20px 0 0", padding: "20px 16px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#2A2A2A" }}>주문내역으로 찜 채우기</span>
          <button onClick={onClose} style={{ border: "none", background: "transparent", fontSize: 18, cursor: "pointer", color: "#888" }}>✕</button>
        </div>

        {!items ? (
          <>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 12, lineHeight: 1.5 }}>무신사·네이버·29cm 등 주문내역 캡처를 올리면, AI가 상품·가격·구매일·카테고리·사진을 뽑아줘.</div>
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
            <div style={{ fontSize: 11, color: "#888", marginBottom: 10, lineHeight: 1.5 }}>{items.length}개 발견 · 넣을 것만 체크. 옷 아닌 잡화는 미리 빼놨어. 사진이 엉뚱하면 사진의 ✕로 빼줘.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              {items.map((it, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 10px", borderRadius: 10, background: it._include ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.06)", opacity: it._include ? 1 : 0.55 }}>
                  <input type="checkbox" checked={it._include} onChange={e => update(i, { _include: e.target.checked })} style={{ marginTop: 3, cursor: "pointer", flexShrink: 0 }} />
                  {it._photo ? (
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <img src={it._photo} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", border: "1px solid rgba(0,0,0,0.1)" }} />
                      <span onClick={() => update(i, { _photo: null })} title="사진 빼기" style={{ position: "absolute", top: -5, right: -5, background: "#2A2A2A", color: "#fff", borderRadius: "50%", width: 15, height: 15, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>✕</span>
                    </div>
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: 8, background: "rgba(0,0,0,0.05)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#ccc" }}>👕</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <input value={it.name} onChange={e => update(i, { name: e.target.value })} style={{ ...field, fontWeight: 500, marginBottom: 4 }} />
                    <div style={{ display: "flex", gap: 6 }}>
                      <input value={it.price || ""} onChange={e => update(i, { price: e.target.value })} placeholder="가격" style={{ ...field, flex: 1 }} />
                      <span style={{ fontSize: 10, color: "#888", alignSelf: "center", flexShrink: 0 }}>{CAT_LABEL(it.category)}{it.is_clothing === false ? "·잡화" : ""}</span>
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
