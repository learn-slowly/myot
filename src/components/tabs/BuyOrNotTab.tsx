"use client";

import { supabase } from "@/lib/db";
import type { App } from "@/app/useAppState";

export function BuyOrNotTab({ app }: { app: App }) {
  const {
    buyImage, setBuyImage, buyResult, setBuyResult, buyAnalyzing, buyFileRef,
    analyzeBuyOrNot, setView, fetchData,
  } = app;

  return (
    <div>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 16, lineHeight: 1.5 }}>
        사고 싶은 옷 사진을 올려봐. 옷장 데이터를 기반으로 살지 말지 판단해줄게.
      </div>
      <input ref={buyFileRef} type="file" accept="image/*" onChange={(e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => { setBuyImage(reader.result as string); setBuyResult(null); };
        reader.readAsDataURL(file);
      }} style={{ display: "none" }} />

      {!buyImage && (
        <button onClick={() => buyFileRef.current?.click()} style={{ width: "100%", padding: "40px 20px", borderRadius: 16, border: "2px dashed rgba(107,45,62,0.2)", background: "rgba(107,45,62,0.03)", cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 32 }}>🤔</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: "#6B2D3E" }}>이거 살까 말까?</span>
          <span style={{ fontSize: 11, color: "#888" }}>사진을 올리면 내 옷장 기준으로 분석해줄게</span>
        </button>
      )}

      {buyImage && !buyResult && !buyAnalyzing && (
        <div>
          <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 12, maxHeight: 400, display: "flex", justifyContent: "center", background: "#000" }}>
            <img src={buyImage} style={{ maxWidth: "100%", maxHeight: 400, objectFit: "contain" }} alt="Buy?" />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setBuyImage(null)} style={{ flex: 1, padding: 12, borderRadius: 12, border: "1.5px solid rgba(0,0,0,0.1)", background: "transparent", cursor: "pointer", fontSize: 13, fontFamily: "inherit", color: "#888" }}>다시 선택</button>
            <button onClick={analyzeBuyOrNot} style={{ flex: 2, padding: 12, borderRadius: 12, border: "none", background: "#2A2A2A", color: "#F5F0E1", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>AI 분석하기</button>
          </div>
        </div>
      )}

      {buyAnalyzing && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>🤔</div>
          <div style={{ fontSize: 13, color: "#888" }}>옷장이랑 비교하는 중...</div>
        </div>
      )}

      {buyResult && (
        <div>
          {buyImage && (
            <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 12, maxHeight: 300, display: "flex", justifyContent: "center", background: "#000" }}>
              <img src={buyImage} style={{ maxWidth: "100%", maxHeight: 300, objectFit: "contain" }} alt="Buy?" />
            </div>
          )}
          <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: 14, padding: 20, marginBottom: 12, border: "1px solid rgba(0,0,0,0.06)", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>{buyResult.emoji}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#2A2A2A", marginBottom: 16 }}>{buyResult.verdict}</div>
            <div style={{ fontSize: 13, color: "#555", lineHeight: 1.8, textAlign: "left" }}>{buyResult.analysis}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setBuyImage(null); setBuyResult(null); }} style={{ flex: 1, padding: 12, borderRadius: 12, border: "1.5px solid rgba(0,0,0,0.1)", background: "transparent", cursor: "pointer", fontSize: 13, fontFamily: "inherit", color: "#888" }}>다른 옷 분석</button>
            {(buyResult.verdict === "살" || buyResult.verdict === "고민") && (
              <button onClick={async () => {
                await supabase.from("wish_items").insert({ name: buyResult.itemName || "살/말 분석 아이템", status: buyResult.verdict === "살" ? "confirmed" : "watch", note: buyResult.analysis.slice(0, 100) });
                setBuyImage(null); setBuyResult(null); setView("wishlist"); fetchData();
              }} style={{ flex: 1, padding: 12, borderRadius: 12, border: "none", background: "#6B2D3E", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>찜 목록에 추가</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
