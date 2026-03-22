"use client";

import { useState, useEffect, useRef } from "react";
import {
  ITEMS, COMBOS, CATEGORIES, SEASONS, MOODS,
  STATUS_LABELS, STATUS_COLORS, TAG_COLORS,
  WISHLIST_DEFAULT, getColor,
  type Season, type Mood, type CategoryKey, type ClothingItem, type WishItem,
} from "@/data/closet";
import { useLocalStorage } from "@/data/useLocalStorage";

// ─── Helpers ────────────────────────────────────────────────────────
const getItem = (id: string) => ITEMS.find((i) => i.id === id);

function getCurrentSeason(): Season {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  if (m >= 9 && m <= 11) return "fall";
  return "winter";
}

// Clothing items only (exclude accessories for OOTD matching)
const CLOTHING_ITEMS = ITEMS.filter(i => i.cat !== "accessories");

function buildAnalysisPrompt() {
  const itemList = CLOTHING_ITEMS.map(i =>
    `${i.id}: ${i.name}${i.color ? ` (${i.color})` : ''}${i.brand ? ` [${i.brand}]` : ''} — ${CATEGORIES[i.cat]}`
  ).join('\n');
  return `You are analyzing an OOTD (outfit of the day) photo. The person's wardrobe contains these items:\n\n${itemList}\n\nAnalyze the photo and identify which items from the wardrobe the person is wearing. Return ONLY a JSON object with no other text, in this exact format:\n{"items": ["id1", "id2", ...], "description": "Brief Korean description of the outfit"}\n\nRules:\n- Only use item IDs from the list above\n- Pick the closest matching items\n- Include: bottom, top, outer (if visible), shoes (if visible)\n- description should be 1-2 sentences in Korean describing the overall look`;
}

// ─── Types ──────────────────────────────────────────────────────────
interface OotdLog {
  id: string;
  date: string;
  items: string[];
  description: string;
  imageUrl?: string;
}

interface SavedCombo {
  key: string;
  combo: typeof COMBOS[0];
  savedAt: string;
}

// ─── Sub Components ─────────────────────────────────────────────────
function ColorDot({ color, size = 18 }: { color?: string; size?: number }) {
  const c = color ? getColor(color) : "#B0A090";
  return (
    <span
      style={{
        display: "inline-block", width: size, height: size, borderRadius: "50%", flexShrink: 0,
        backgroundColor: c, border: "1.5px solid rgba(0,0,0,0.12)",
        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.08)",
      }}
    />
  );
}

function ItemCard({
  item, compact, onClick, selected, onRemove, imageUrl, onAddPhoto, onRemovePhoto,
}: {
  item: ClothingItem; compact?: boolean; onClick?: () => void; selected?: boolean; onRemove?: () => void;
  imageUrl?: string; onAddPhoto?: () => void; onRemovePhoto?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
        padding: compact ? "8px 12px" : "12px 16px", borderRadius: 12,
        cursor: onClick ? "pointer" : "default",
        background: selected ? "rgba(107,45,62,0.08)" : "rgba(255,255,255,0.7)",
        border: selected ? "2px solid #6B2D3E" : "1.5px solid rgba(0,0,0,0.08)",
        boxShadow: selected ? "0 2px 8px rgba(107,45,62,0.12)" : "0 1px 3px rgba(0,0,0,0.04)",
        transition: "all 0.2s", fontFamily: "inherit",
      }}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={item.name} style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
      ) : item.color ? (
        <ColorDot color={item.color} />
      ) : null}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: compact ? 13 : 14, fontWeight: 500, color: "#2A2A2A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.name}
        </div>
        {!compact && item.brand && (
          <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{item.brand}</div>
        )}
      </div>
      {onRemove && (
        <span onClick={(e) => { e.stopPropagation(); onRemove(); }} style={{ color: "#CCC", fontSize: 14, cursor: "pointer", padding: "0 4px" }}>✕</span>
      )}
      {onAddPhoto && !compact && (
        <span onClick={(e) => { e.stopPropagation(); onAddPhoto(); }} style={{ color: imageUrl ? "#C4952B" : "#CCC", fontSize: 14, cursor: "pointer", padding: "0 4px", flexShrink: 0 }} title={imageUrl ? "사진 변경" : "사진 추가"}>
          {imageUrl ? "📷" : "📷"}
        </span>
      )}
      {onRemovePhoto && imageUrl && !compact && (
        <span onClick={(e) => { e.stopPropagation(); onRemovePhoto(); }} style={{ color: "#CCC", fontSize: 12, cursor: "pointer", padding: "0 2px", flexShrink: 0 }} title="사진 삭제">✕</span>
      )}
      {item.tags.length > 0 && !compact && !onRemove && !onAddPhoto && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {item.tags.slice(0, 2).map((t) => (
            <span key={t} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: TAG_COLORS[t] || "#B0A090", color: "#fff", fontWeight: 500 }}>{t}</span>
          ))}
        </div>
      )}
    </button>
  );
}

function Pill({ label, active, onClick, count }: { label: string; active: boolean; onClick: () => void; count?: number }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontFamily: "inherit",
      background: active ? "#2A2A2A" : "transparent", color: active ? "#F5F0E1" : "#666",
      fontWeight: active ? 600 : 400, fontSize: 13, transition: "all 0.2s",
    }}>
      {label}
      {count != null && <span style={{ marginLeft: 6, fontSize: 10, padding: "1px 6px", borderRadius: 10, background: active ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.08)" }}>{count}</span>}
    </button>
  );
}

// ─── Main App ───────────────────────────────────────────────────────
export default function Home() {
  const [view, setView] = useState<"ootd" | "closet" | "combo" | "mood" | "wishlist">("closet");
  const [selectedBottom, setSelectedBottom] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [closetFilter, setClosetFilter] = useState<"all" | Season>("all");
  const [expandedCat, setExpandedCat] = useState<CategoryKey | null>(null);
  const [newWish, setNewWish] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // OOTD state
  const [ootdImage, setOotdImage] = useState<string | null>(null);
  const [ootdAnalyzing, setOotdAnalyzing] = useState(false);
  const [ootdResult, setOotdResult] = useState<{ items: string[]; description: string } | null>(null);
  const [ootdStatsView, setOotdStatsView] = useState(false);
  const [ootdAddPicker, setOotdAddPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [savedCombos, setSavedCombos] = useLocalStorage<SavedCombo[]>("lego-saved-combos", []);
  const [wishlist, setWishlist] = useLocalStorage<WishItem[]>("lego-wishlist", WISHLIST_DEFAULT);
  const [ootdLogs, setOotdLogs] = useLocalStorage<OotdLog[]>("lego-ootd-logs", []);
  const [itemImages, setItemImages] = useLocalStorage<Record<string, string>>("myot-item-images", {});
  const itemImageInputRef = useRef<HTMLInputElement>(null);
  const [imageTargetId, setImageTargetId] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);

  const activeSeason = selectedSeason || getCurrentSeason();

  // ─── Item Image Upload (Cloudinary) ─────────────────────────────
  const handleItemImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !imageTargetId) return;
    setImageUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItemImages({ ...itemImages, [imageTargetId]: data.url });
    } catch (err) {
      console.error("Upload error:", err);
      alert("사진 업로드에 실패했어요. 다시 시도해주세요.");
    }
    setImageTargetId(null);
    setImageUploading(false);
    e.target.value = "";
  };

  // ─── OOTD: Upload & Analyze ───────────────────────────────────
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setOotdImage(reader.result as string);
      setOotdResult(null);
      setOotdAddPicker(false);
    };
    reader.readAsDataURL(file);
  };

  const resizeImage = (dataUrl: string, maxSize: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = (h / w) * maxSize; w = maxSize; } else { w = (w / h) * maxSize; h = maxSize; }
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = dataUrl;
    });
  };

  const analyzeOotd = async () => {
    if (!ootdImage) return;
    setOotdAnalyzing(true);
    try {
      const resized = await resizeImage(ootdImage, 1024);
      const base64 = resized.split(",")[1];
      const mediaType = "image/jpeg";
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64,
          mediaType,
          prompt: buildAnalysisPrompt(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "API error");
      const text = data.content?.map((c: { text?: string }) => c.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      const validItems = (parsed.items || []).filter((id: string) => CLOTHING_ITEMS.some(i => i.id === id));
      setOotdResult({ items: validItems, description: parsed.description || "" });
    } catch (err) {
      console.error("Analysis error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setOotdResult({ items: [], description: `분석에 실패했어: ${msg}` });
    }
    setOotdAnalyzing(false);
  };

  const [ootdSaving, setOotdSaving] = useState(false);

  const uploadOotdImage = async (): Promise<string | undefined> => {
    if (!ootdImage) return undefined;
    try {
      const resized = await resizeImage(ootdImage, 800);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: resized }),
      });
      const data = await res.json();
      if (res.ok) return data.url;
    } catch {}
    return undefined;
  };

  const saveOotdRecord = async () => {
    if (!ootdResult || ootdResult.items.length === 0) return;
    setOotdSaving(true);
    try {
      const [imageUrl, commentRes] = await Promise.all([
        uploadOotdImage(),
        (async () => {
          const itemNames = ootdResult.items.map(id => {
            const item = getItem(id);
            return item ? `${item.name}${item.color ? ` (${item.color})` : ""} — ${CATEGORIES[item.cat]}` : id;
          });
          const res = await fetch("/api/analyze-text", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: `오늘 착장 아이템 목록:\n${itemNames.join("\n")}\n\n이 조합에 대해 한국어로 2문장 이내로 코디 코멘트를 해줘. 스타일 느낌, 잘 어울리는 포인트, 또는 개선 팁을 짧게. 답변만 써줘.`,
            }),
          });
          if (!res.ok) throw new Error();
          return res.json();
        })(),
      ]);
      const text = commentRes.content?.map((c: { text?: string }) => c.text || "").join("") || ootdResult.description;
      const record: OotdLog = {
        id: `ootd-${Date.now()}`,
        date: new Date().toISOString().split("T")[0],
        items: ootdResult.items,
        description: text,
        imageUrl,
      };
      setOotdLogs([record, ...ootdLogs]);
      setOotdImage(null);
      setOotdResult(null);
      setOotdStatsView(true);
    } catch {
      const record: OotdLog = {
        id: `ootd-${Date.now()}`,
        date: new Date().toISOString().split("T")[0],
        items: ootdResult.items,
        description: ootdResult.description,
      };
      setOotdLogs([record, ...ootdLogs]);
      setOotdImage(null);
      setOotdResult(null);
      setOotdStatsView(true);
    }
    setOotdSaving(false);
  };

  const getWearStats = () => {
    const counts: Record<string, number> = {};
    ootdLogs.forEach(log => {
      log.items.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
    });
    return counts;
  };

  const getUnwornItems = () => {
    const worn = new Set(ootdLogs.flatMap(l => l.items));
    return CLOTHING_ITEMS.filter(i => !worn.has(i.id));
  };

  // ─── RENDER: OOTD ─────────────────────────────────────────────
  const renderOotd = () => {
    const stats = getWearStats();
    const unworn = getUnwornItems();
    const topWorn = Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 5);

    if (ootdStatsView && ootdLogs.length > 0) {
      return (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#2A2A2A" }}>착용 기록 ({ootdLogs.length}회)</div>
            <button onClick={() => setOotdStatsView(false)} style={{ fontSize: 12, color: "#6B2D3E", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>+ 새 OOTD</button>
          </div>

          {topWorn.length > 0 && <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#C4952B", marginBottom: 8 }}>자주 입는 옷 TOP 5</div>
            {topWorn.map(([id, count]) => {
              const item = getItem(id);
              if (!item) return null;
              return (
                <div key={id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 4, background: "rgba(255,255,255,0.7)", borderRadius: 10, border: "1px solid rgba(0,0,0,0.06)" }}>
                  {item.color && <ColorDot color={item.color} size={14} />}
                  <span style={{ flex: 1, fontSize: 13, color: "#2A2A2A" }}>{item.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#C4952B" }}>{count}회</span>
                </div>
              );
            })}
          </div>}

          {unworn.length > 0 && <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#E85D5D", marginBottom: 8 }}>아직 안 입은 옷 ({unworn.length})</div>
            {unworn.slice(0, 8).map(item => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 4, background: "rgba(232,93,93,0.04)", borderRadius: 10, border: "1px solid rgba(232,93,93,0.1)" }}>
                {item.color && <ColorDot color={item.color} size={14} />}
                <span style={{ flex: 1, fontSize: 13, color: "#2A2A2A" }}>{item.name}</span>
                <span style={{ fontSize: 10, color: "#E85D5D" }}>미착용</span>
              </div>
            ))}
            {unworn.length > 8 && <div style={{ fontSize: 11, color: "#888", textAlign: "center", marginTop: 4 }}>+{unworn.length - 8}개 더</div>}
          </div>}

          <div style={{ fontSize: 12, fontWeight: 600, color: "#2A2A2A", marginBottom: 8 }}>최근 기록</div>
          {ootdLogs.slice(0, 10).map((log, idx) => (
            <div key={idx} style={{ background: "rgba(255,255,255,0.7)", borderRadius: 12, padding: "12px 16px", marginBottom: 8, border: "1px solid rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#6B2D3E" }}>{log.date}</span>
                <button onClick={() => setOotdLogs(ootdLogs.filter((_, i) => i !== idx))} style={{ border: "none", background: "transparent", color: "#CCC", cursor: "pointer", fontSize: 14 }}>✕</button>
              </div>
              {log.imageUrl && (
                <div style={{ borderRadius: 10, overflow: "hidden", marginBottom: 8 }}>
                  <img src={log.imageUrl} alt={`OOTD ${log.date}`} style={{ width: "100%", maxHeight: 280, objectFit: "cover", display: "block" }} />
                </div>
              )}
              <div style={{ fontSize: 12, color: "#555", marginBottom: 6, lineHeight: 1.5 }}>{log.description}</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {log.items.map(id => { const item = getItem(id); if (!item) return null; return <span key={id} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 16, background: "rgba(0,0,0,0.06)", color: "#555" }}>{item.name}</span>; })}
              </div>
            </div>
          ))}

          {ootdLogs.length > 0 && <button onClick={() => { if (confirm("모든 OOTD 기록을 삭제할까요?")) setOotdLogs([]); }} style={{ width: "100%", marginTop: 16, padding: 10, borderRadius: 10, border: "1.5px dashed rgba(232,93,93,0.3)", background: "transparent", color: "#E85D5D", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>전체 기록 초기화</button>}
        </div>
      );
    }

    return (
      <div>
        {ootdLogs.length > 0 && <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button onClick={() => setOotdStatsView(true)} style={{ fontSize: 12, color: "#6B2D3E", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>기록 보기 ({ootdLogs.length}) →</button>
        </div>}

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
        {!ootdImage && (
          <button onClick={() => fileInputRef.current?.click()} style={{ width: "100%", padding: "40px 20px", borderRadius: 16, border: "2px dashed rgba(107,45,62,0.2)", background: "rgba(107,45,62,0.03)", cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 32 }}>📸</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: "#6B2D3E" }}>오늘의 OOTD 올리기</span>
            <span style={{ fontSize: 11, color: "#888" }}>사진을 올리면 AI가 착장을 분석해줘</span>
          </button>
        )}

        {ootdImage && !ootdResult && (
          <div>
            <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 12, maxHeight: 400, display: "flex", justifyContent: "center", background: "#000" }}>
              <img src={ootdImage} style={{ maxWidth: "100%", maxHeight: 400, objectFit: "contain" }} alt="OOTD" />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setOotdImage(null)} style={{ flex: 1, padding: 12, borderRadius: 12, border: "1.5px solid rgba(0,0,0,0.1)", background: "transparent", cursor: "pointer", fontSize: 13, fontFamily: "inherit", color: "#888" }}>다시 선택</button>
              <button onClick={analyzeOotd} disabled={ootdAnalyzing} style={{ flex: 2, padding: 12, borderRadius: 12, border: "none", background: ootdAnalyzing ? "#B0A090" : "#2A2A2A", color: "#F5F0E1", cursor: ootdAnalyzing ? "default" : "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>
                {ootdAnalyzing ? "분석 중..." : "AI 착장 분석하기"}
              </button>
            </div>
          </div>
        )}

        {ootdResult && (
          <div>
            {ootdImage && (
              <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 12, maxHeight: 300, display: "flex", justifyContent: "center", background: "#000" }}>
                <img src={ootdImage} style={{ maxWidth: "100%", maxHeight: 300, objectFit: "contain" }} alt="OOTD" />
              </div>
            )}
            <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: 14, padding: 16, marginBottom: 12, border: "1px solid rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#6B2D3E", marginBottom: 8 }}>AI 분석 결과</div>
              <div style={{ fontSize: 12, color: "#555", marginBottom: 12, lineHeight: 1.6 }}>{ootdResult.description}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#2A2A2A", marginBottom: 8 }}>매칭된 아이템 ({ootdResult.items.length})</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                {ootdResult.items.map(id => { const item = getItem(id); if (!item) return null; return <ItemCard key={id} item={item} compact onRemove={() => setOotdResult({ ...ootdResult, items: ootdResult.items.filter(i => i !== id) })} />; })}
              </div>

              {ootdAddPicker ? (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>아이템 추가 (탭하여 선택)</div>
                  <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                    {CLOTHING_ITEMS.filter(i => !ootdResult.items.includes(i.id)).map(item => (
                      <ItemCard key={item.id} item={item} compact onClick={() => setOotdResult({ ...ootdResult, items: [...ootdResult.items, item.id] })} />
                    ))}
                  </div>
                  <button onClick={() => setOotdAddPicker(false)} style={{ marginTop: 8, width: "100%", padding: 8, borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)", background: "transparent", cursor: "pointer", fontSize: 12, fontFamily: "inherit", color: "#888" }}>닫기</button>
                </div>
              ) : (
                <button onClick={() => setOotdAddPicker(true)} style={{ width: "100%", padding: 8, borderRadius: 8, border: "1.5px dashed rgba(0,0,0,0.12)", background: "transparent", cursor: "pointer", fontSize: 12, fontFamily: "inherit", color: "#888", marginBottom: 12 }}>+ 아이템 추가/수정</button>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setOotdImage(null); setOotdResult(null); setOotdAddPicker(false); }} style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)", background: "transparent", cursor: "pointer", fontSize: 12, fontFamily: "inherit", color: "#888" }}>취소</button>
                <button onClick={saveOotdRecord} disabled={ootdSaving || ootdResult.items.length === 0} style={{ flex: 2, padding: 10, borderRadius: 10, border: "none", background: ootdSaving ? "#B0A090" : "#6B2D3E", color: "#fff", cursor: ootdSaving ? "default" : "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>{ootdSaving ? "AI 코멘트 생성 중..." : "오늘 착장 저장하기"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── CLOSET ───────────────────────────────────────────────────
  const renderCloset = () => (
    <div>
      {imageUploading && <div style={{ padding: "8px 16px", marginBottom: 12, borderRadius: 10, background: "rgba(196,149,43,0.1)", border: "1px solid rgba(196,149,43,0.2)", fontSize: 12, color: "#C4952B", textAlign: "center" }}>사진 업로드 중...</div>}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        <Pill label="전체" active={closetFilter === "all"} onClick={() => setClosetFilter("all")} />
        {Object.entries(SEASONS).map(([k, v]) => <Pill key={k} label={v} active={closetFilter === k} onClick={() => setClosetFilter(k as Season)} count={ITEMS.filter(i => i.season?.includes(k as Season)).length} />)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(Object.keys(CATEGORIES) as CategoryKey[]).map(ck => {
          let items = ITEMS.filter(i => i.cat === ck);
          if (closetFilter !== "all") items = items.filter(i => !i.season || i.season.includes(closetFilter));
          if (!items.length) return null;
          const isOpen = expandedCat === ck;
          return (
            <div key={ck} style={{ background: "rgba(255,255,255,0.5)", borderRadius: 14, border: "1px solid rgba(0,0,0,0.06)", overflow: "hidden" }}>
              <button onClick={() => setExpandedCat(isOpen ? null : ck)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 18px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit" }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#2A2A2A" }}>{CATEGORIES[ck]}</span>
                <span style={{ fontSize: 12, color: "#888" }}>{items.length}개 {isOpen ? "▲" : "▼"}</span>
              </button>
              {isOpen && <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 6 }}>{items.map(i => <ItemCard key={i.id} item={i} imageUrl={itemImages[i.id]} onAddPhoto={() => { setImageTargetId(i.id); itemImageInputRef.current?.click(); }} onRemovePhoto={() => { const next = { ...itemImages }; delete next[i.id]; setItemImages(next); }} />)}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ─── COMBO ────────────────────────────────────────────────────
  const renderCombo = () => {
    const bottoms = ITEMS.filter(i => i.cat === "bottoms" && i.season?.includes(activeSeason));
    const matches = selectedBottom ? COMBOS.filter(c => c.bottom === selectedBottom && c.season.includes(activeSeason)) : [];
    return (
      <div>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 8, fontWeight: 500 }}>시즌</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {Object.entries(SEASONS).map(([k, v]) => <Pill key={k} label={v} active={activeSeason === k} onClick={() => { setSelectedSeason(k as Season); setSelectedBottom(null); }} />)}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#2A2A2A", marginBottom: 10 }}>하의를 골라봐</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
          {bottoms.map(b => <ItemCard key={b.id} item={b} compact selected={selectedBottom === b.id} onClick={() => setSelectedBottom(selectedBottom === b.id ? null : b.id)} />)}
        </div>
        {selectedBottom && matches.length > 0 && <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#2A2A2A", marginBottom: 10 }}>이렇게 입어봐 ({matches.length}개)</div>
          {matches.map((combo, idx) => {
            const ck = `${combo.bottom}-${activeSeason}-${idx}`;
            const saved = savedCombos.some(s => s.key === ck);
            return (
              <div key={idx} style={{ background: "rgba(255,255,255,0.7)", borderRadius: 14, padding: 16, marginBottom: 10, border: "1px solid rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#6B2D3E" }}>{combo.desc}</span>
                  <button onClick={() => saved ? setSavedCombos(savedCombos.filter(s => s.key !== ck)) : setSavedCombos([...savedCombos, { key: ck, combo, savedAt: new Date().toISOString() }])} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 18, color: saved ? "#C4952B" : "#CCC" }}>{saved ? "★" : "☆"}</button>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>{combo.mood.map(m => <span key={m} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(0,0,0,0.06)", color: "#555" }}>{MOODS[m]}</span>)}</div>
                <div style={{ fontSize: 12, color: "#555", lineHeight: 1.8 }}>
                  <div><strong>상의:</strong> {combo.tops.map(t => getItem(t)?.name).filter(Boolean).join(" / ")}</div>
                  <div><strong>아우터:</strong> {combo.outers.map(t => getItem(t)?.name).filter(Boolean).join(" / ")}</div>
                  <div><strong>신발:</strong> {combo.shoes.map(t => getItem(t)?.name).filter(Boolean).join(" / ")}</div>
                </div>
              </div>
            );
          })}
        </div>}
        {selectedBottom && !matches.length && <div style={{ textAlign: "center", padding: 30, color: "#888", fontSize: 13 }}>이 하의에 등록된 조합이 아직 없어</div>}
      </div>
    );
  };

  // ─── MOOD ─────────────────────────────────────────────────────
  const renderMood = () => {
    const filtered = COMBOS.filter(c => c.season.includes(activeSeason) && (!selectedMood || c.mood.includes(selectedMood)));
    const shuffled = [...filtered].sort(() => Math.random() - 0.5).slice(0, 3);
    return (
      <div key={refreshKey}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#2A2A2A", marginBottom: 10 }}>오늘 기분은?</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {Object.entries(MOODS).map(([k, v]) => <button key={k} onClick={() => { setSelectedMood(selectedMood === k ? null : k as Mood); setRefreshKey(r => r + 1); }} style={{ padding: "10px 20px", borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "inherit", background: selectedMood === k ? "#2A2A2A" : "rgba(255,255,255,0.7)", color: selectedMood === k ? "#F5F0E1" : "#555", fontWeight: 500, fontSize: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", transition: "all 0.2s" }}>{v}</button>)}
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {Object.entries(SEASONS).map(([k, v]) => <Pill key={k} label={v} active={activeSeason === k} onClick={() => { setSelectedSeason(k as Season); setRefreshKey(r => r + 1); }} />)}
        </div>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>{SEASONS[activeSeason]} · {selectedMood ? MOODS[selectedMood] : "전체"} — {filtered.length}개 조합</div>
        {shuffled.map((combo, idx) => {
          const bottom = getItem(combo.bottom);
          return (
            <div key={idx} style={{ background: "rgba(255,255,255,0.7)", borderRadius: 14, padding: 16, marginBottom: 10, border: "1px solid rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#6B2D3E", marginBottom: 8 }}>{combo.desc}</div>
              <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>{[bottom, ...combo.tops.map(getItem), ...combo.outers.map(getItem), ...combo.shoes.map(getItem)].filter(Boolean).map((it, i) => it!.color && <ColorDot key={i} color={it!.color} size={14} />)}</div>
              <div style={{ fontSize: 12, color: "#555", lineHeight: 1.8 }}>
                <div><strong>하의:</strong> {bottom?.name}</div>
                <div><strong>상의:</strong> {combo.tops.map(t => getItem(t)?.name).filter(Boolean).join(" / ")}</div>
                <div><strong>아우터:</strong> {combo.outers.map(t => getItem(t)?.name).filter(Boolean).join(" / ")}</div>
                <div><strong>신발:</strong> {combo.shoes.map(t => getItem(t)?.name).filter(Boolean).join(" / ")}</div>
              </div>
            </div>
          );
        })}
        {!shuffled.length && <div style={{ textAlign: "center", padding: 30, color: "#888", fontSize: 13 }}>조건에 맞는 조합이 없어!</div>}
        {filtered.length > 3 && <button onClick={() => setRefreshKey(r => r + 1)} style={{ width: "100%", padding: 12, border: "1.5px dashed rgba(0,0,0,0.15)", borderRadius: 12, background: "transparent", cursor: "pointer", color: "#888", fontSize: 13, fontFamily: "inherit", marginTop: 4 }}>다른 조합 보기 ↻</button>}
      </div>
    );
  };

  // ─── WISHLIST ──────────────────────────────────────────────────
  const renderWishlist = () => {
    const grouped: Record<string, WishItem[]> = {};
    wishlist.forEach(w => { if (!grouped[w.status]) grouped[w.status] = []; grouped[w.status].push(w); });
    return (
      <div>
        {Object.entries(STATUS_LABELS).map(([st, lb]) => { const its = grouped[st] || []; if (!its.length) return null; return (
          <div key={st} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: STATUS_COLORS[st], marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLORS[st] }} />{lb} ({its.length})</div>
            {its.map(w => (
              <div key={w.id} style={{ background: "rgba(255,255,255,0.7)", borderRadius: 12, padding: "12px 16px", marginBottom: 6, border: "1px solid rgba(0,0,0,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div><div style={{ fontSize: 13, fontWeight: 500, color: "#2A2A2A" }}>{w.name}</div><div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{w.price && <span style={{ marginRight: 8 }}>{w.price}</span>}{w.note}</div></div>
                <button onClick={() => setWishlist(wishlist.filter(x => x.id !== w.id))} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#CCC", fontSize: 16, padding: 4 }}>✕</button>
              </div>
            ))}
          </div>
        ); })}
        <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
          <input value={newWish} onChange={e => setNewWish(e.target.value)} placeholder="찜할 아이템 추가..." style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1.5px solid rgba(0,0,0,0.1)", fontSize: 13, fontFamily: "inherit", background: "rgba(255,255,255,0.7)", outline: "none" }} onKeyDown={e => { if (e.key === "Enter" && newWish.trim()) { setWishlist([...wishlist, { id: `w${Date.now()}`, name: newWish.trim(), status: "watch", note: "" }]); setNewWish(""); } }} />
          <button onClick={() => { if (newWish.trim()) { setWishlist([...wishlist, { id: `w${Date.now()}`, name: newWish.trim(), status: "watch", note: "" }]); setNewWish(""); } }} style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: "#2A2A2A", color: "#F5F0E1", cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "inherit" }}>추가</button>
        </div>
        {savedCombos.length > 0 && <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#C4952B", marginBottom: 10 }}>★ 저장한 코디 ({savedCombos.length})</div>
          {savedCombos.map((sc, idx) => (
            <div key={idx} style={{ background: "rgba(196,149,43,0.06)", borderRadius: 12, padding: "12px 16px", marginBottom: 6, border: "1px solid rgba(196,149,43,0.15)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><div style={{ fontSize: 13, fontWeight: 500, color: "#2A2A2A" }}>{sc.combo.desc}</div><div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{getItem(sc.combo.bottom)?.name} + {sc.combo.tops.length}개 상의</div></div>
              <button onClick={() => setSavedCombos(savedCombos.filter((_, i) => i !== idx))} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#C4952B", fontSize: 16, padding: 4 }}>★</button>
            </div>
          ))}
        </div>}
      </div>
    );
  };

  // ─── NAV & LAYOUT ─────────────────────────────────────────────
  const NAV = [
    { key: "ootd" as const, label: "OOTD", icon: "📸" },
    { key: "closet" as const, label: "옷장", icon: "◫" },
    { key: "combo" as const, label: "코디", icon: "◈" },
    { key: "mood" as const, label: "오늘 뭐 입지", icon: "☀" },
    { key: "wishlist" as const, label: "찜", icon: "★" },
  ];

  return (
    <div style={{ minHeight: "100vh", maxWidth: 480, margin: "0 auto" }}>
      <input ref={itemImageInputRef} type="file" accept="image/*" onChange={handleItemImageUpload} style={{ display: "none" }} />
      <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.5px", color: "#2A2A2A" }}>내옷 myot</h1>
        <p style={{ fontSize: 11, color: "#999", margin: "4px 0 0", letterSpacing: "2px", textTransform: "uppercase" }}>workwear · ivy · casual</p>
      </div>
      <div style={{ display: "flex", padding: "0 8px", borderBottom: "1px solid rgba(0,0,0,0.06)", background: "rgba(255,255,255,0.3)", overflowX: "auto" }}>
        {NAV.map(n => (
          <button key={n.key} onClick={() => { setView(n.key); if (n.key === "ootd") setOotdStatsView(ootdLogs.length > 0); }} style={{
            flex: "0 0 auto", padding: "12px 10px", border: "none", cursor: "pointer", background: "transparent", fontFamily: "inherit",
            borderBottom: view === n.key ? "2px solid #2A2A2A" : "2px solid transparent",
            color: view === n.key ? "#2A2A2A" : "#999", fontWeight: view === n.key ? 600 : 400, fontSize: 11,
            transition: "all 0.2s", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, whiteSpace: "nowrap",
          }}>
            <span style={{ fontSize: 14 }}>{n.icon}</span>{n.label}
          </button>
        ))}
      </div>
      <div style={{ padding: "20px 16px 40px" }}>
        {view === "ootd" && renderOotd()}
        {view === "closet" && renderCloset()}
        {view === "combo" && renderCombo()}
        {view === "mood" && renderMood()}
        {view === "wishlist" && renderWishlist()}
      </div>
    </div>
  );
}
