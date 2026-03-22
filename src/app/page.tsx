"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  CATEGORIES, SEASONS, MOODS,
  STATUS_LABELS, STATUS_COLORS, TAG_COLORS,
  getColor,
  type Season, type Mood, type CategoryKey, type ClothingItem, type WishItem,
} from "@/data/closet";
import { useLocalStorage } from "@/data/useLocalStorage";
import { supabase } from "@/lib/supabase";

// ─── Helpers ────────────────────────────────────────────────────────
function getCurrentSeason(): Season {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  if (m >= 9 && m <= 11) return "fall";
  return "winter";
}

// DB combo shape
interface DbCombo {
  id: string;
  bottom: string;
  tops: string[];
  outers: string[];
  shoes: string[];
  mood: string[];
  season: string[];
  description: string;
}

// ─── Types ──────────────────────────────────────────────────────────
interface OotdLog {
  id: string;
  date: string;
  items: string[];
  description: string;
  image_url?: string;
}

interface SavedCombo {
  key: string;
  combo: { bottom: string; tops: string[]; outers: string[]; shoes: string[]; mood: string[]; season: string[]; desc: string };
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
  item, compact, onClick, selected, onRemove, imageUrl, onAddPhoto, onRemovePhoto, onEdit,
}: {
  item: ClothingItem; compact?: boolean; onClick?: () => void; selected?: boolean; onRemove?: () => void;
  imageUrl?: string; onAddPhoto?: () => void; onRemovePhoto?: () => void; onEdit?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
        padding: compact ? "8px 12px" : "12px 16px", borderRadius: 12,
        cursor: onClick || onEdit ? "pointer" : "default",
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
      {onEdit && !compact && (
        <span onClick={(e) => { e.stopPropagation(); onEdit(); }} style={{ color: "#B0A090", fontSize: 12, cursor: "pointer", padding: "0 4px", flexShrink: 0 }}>편집</span>
      )}
      {onAddPhoto && !compact && (
        <span onClick={(e) => { e.stopPropagation(); onAddPhoto(); }} style={{ color: imageUrl ? "#C4952B" : "#CCC", fontSize: 14, cursor: "pointer", padding: "0 4px", flexShrink: 0 }}>📷</span>
      )}
      {onRemovePhoto && imageUrl && !compact && (
        <span onClick={(e) => { e.stopPropagation(); onRemovePhoto(); }} style={{ color: "#CCC", fontSize: 12, cursor: "pointer", padding: "0 2px", flexShrink: 0 }}>✕</span>
      )}
      {item.tags.length > 0 && !compact && !onRemove && !onAddPhoto && !onEdit && (
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

// ─── Item Edit Modal ────────────────────────────────────────────────
const ALL_TAGS = Object.keys(TAG_COLORS) as import("@/data/closet").StyleTag[];
const ALL_SEASONS: Season[] = ["spring", "summer", "fall", "winter"];
const ALL_CATS = Object.keys(CATEGORIES) as CategoryKey[];

function ItemEditModal({ item, onSave, onDelete, onClose, onGenerateCombos }: {
  item: ClothingItem | null; onSave: (item: ClothingItem) => void; onDelete?: (id: string) => void; onClose: () => void; onGenerateCombos?: (item: ClothingItem) => void;
}) {
  const isNew = !item;
  const [form, setForm] = useState<ClothingItem>(item || {
    id: `custom-${Date.now()}`, cat: "bottoms" as CategoryKey, name: "", brand: "", color: "", season: [], tags: [], note: "",
  });

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
            <select value={form.cat} onChange={e => setForm({ ...form, cat: e.target.value as CategoryKey })} style={fieldStyle}>
              {ALL_CATS.map(c => <option key={c} value={c}>{CATEGORIES[c]}</option>)}
            </select>
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

// ─── Main App ───────────────────────────────────────────────────────
export default function Home() {
  const [view, setView] = useState<"ootd" | "closet" | "combo" | "mood" | "buyornot" | "wishlist">("closet");
  const [comboSelections, setComboSelections] = useState<{ bottom?: string; top?: string; outer?: string }>({});
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
  const [ootdSearchQuery, setOotdSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Supabase data
  const [allItems, setAllItems] = useState<ClothingItem[]>([]);
  const [combos, setCombos] = useState<DbCombo[]>([]);
  const [wishlist, setWishlist] = useState<WishItem[]>([]);
  const [ootdLogs, setOotdLogs] = useState<OotdLog[]>([]);
  const [wishStatuses, setWishStatuses] = useState<{ id: string; label: string; color: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // 살/말 state
  const [buyImage, setBuyImage] = useState<string | null>(null);
  const [buyAnalyzing, setBuyAnalyzing] = useState(false);
  const [buyResult, setBuyResult] = useState<{ verdict: string; emoji: string; analysis: string; itemName: string } | null>(null);
  const buyFileRef = useRef<HTMLInputElement>(null);

  // Local state
  const [savedCombos, setSavedCombos] = useLocalStorage<SavedCombo[]>("lego-saved-combos", []);
  const [editingItem, setEditingItem] = useState<ClothingItem | null>(null);
  const [addingItem, setAddingItem] = useState(false);
  const itemImageInputRef = useRef<HTMLInputElement>(null);
  const [imageTargetId, setImageTargetId] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);

  const getItem = useCallback((id: string) => allItems.find(i => i.id === id), [allItems]);
  const clothingItems = allItems.filter(i => i.cat !== "accessories");
  const activeSeason = selectedSeason || getCurrentSeason();

  // ─── Fetch data from Supabase ──────────────────────────────────
  const fetchData = useCallback(async () => {
    const [itemsRes, combosRes, wishRes, ootdRes, statusRes] = await Promise.all([
      supabase.from("clothing_items").select("*").order("id"),
      supabase.from("combos").select("*"),
      supabase.from("wish_items").select("*").order("created_at"),
      supabase.from("ootd_logs").select("*").order("created_at", { ascending: false }),
      supabase.from("wish_statuses").select("*").order("sort_order"),
    ]);
    if (itemsRes.data) setAllItems(itemsRes.data.map((r: Record<string, unknown>) => ({
      id: r.id as string, cat: r.cat as CategoryKey, name: r.name as string, brand: r.brand as string | undefined,
      color: r.color as string | undefined, season: r.season as Season[] | undefined,
      tags: ((r.tags as string[]) || []) as import("@/data/closet").StyleTag[], note: r.note as string | undefined, image_url: r.image_url as string | undefined,
    })));
    if (combosRes.data) setCombos(combosRes.data as DbCombo[]);
    if (wishRes.data) setWishlist(wishRes.data.map((r: Record<string, unknown>) => ({
      id: r.id as string, name: r.name as string, price: r.price as string | undefined,
      status: r.status as string, note: (r.note as string) || "", link: r.link as string | undefined, image_url: r.image_url as string | undefined,
    })));
    if (ootdRes.data) setOotdLogs(ootdRes.data.map((r: Record<string, unknown>) => ({
      id: r.id as string, date: r.date as string, items: r.items as string[],
      description: (r.description as string) || "", image_url: r.image_url as string | undefined,
    })));
    if (statusRes.data) setWishStatuses(statusRes.data as { id: string; label: string; color: string }[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Item CRUD ──────────────────────────────────────────────────
  const [generatingCombos, setGeneratingCombos] = useState(false);

  const generateCombosForItem = async (item: ClothingItem) => {
    setGeneratingCombos(true);
    try {
      // 최신 아이템 목록을 DB에서 다시 가져옴
      const { data: freshItems } = await supabase.from("clothing_items").select("*").order("id");
      if (!freshItems) return;

      const items = freshItems as { id: string; cat: string; name: string; color?: string; brand?: string; season?: string[]; tags?: string[] }[];
      const itemList = items.filter(i => i.cat !== "accessories").map(i =>
        `${i.id}: ${i.name}${i.color ? ` (${i.color})` : ""}${i.brand ? ` [${i.brand}]` : ""} — ${CATEGORIES[i.cat as CategoryKey] || i.cat}${i.season?.length ? ` [${i.season.map(s => SEASONS[s as Season] || s).join("/")}]` : ""}`
      ).join("\n");

      const prompt = `새 아이템이 옷장에 추가됐어:
${item.id}: ${item.name}${item.color ? ` (${item.color})` : ""}${item.brand ? ` [${item.brand}]` : ""} — ${CATEGORIES[item.cat]}${item.season?.length ? ` [${item.season.map(s => SEASONS[s]).join("/")}]` : ""}

현재 옷장 전체:
${itemList}

이 새 아이템을 포함하는 코디 조합을 만들어줘.

규칙:
- 각 조합은 하의 1개 + 상의 여러개 + 아우터 여러개 + 신발 여러개
- 시즌별로 완전 분리 (겨울 아우터와 여름 상의 섞지 않기)
- 새 아이템의 시즌에 맞는 조합만
- 현실적으로 어울리는 조합만
- 최대 5개 조합

JSON 배열만 반환:
[{"bottom":"id","tops":["id",...],"outers":["id",...],"shoes":["id",...],"mood":["casual"/"neat"/"cool"/"formal"],"season":["spring"/"summer"/"fall"/"winter"],"description":"한국어 조합 설명"}]`;

      const res = await fetch("/api/analyze-text", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const text = data.content?.map((c: { text?: string }) => c.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const newCombos = JSON.parse(clean);

      if (Array.isArray(newCombos) && newCombos.length > 0) {
        const rows = newCombos.map((c: { bottom: string; tops: string[]; outers: string[]; shoes: string[]; mood: string[]; season: string[]; description: string }) => ({
          bottom: c.bottom,
          tops: c.tops || [],
          outers: c.outers || [],
          shoes: c.shoes || [],
          mood: c.mood || ["casual"],
          season: c.season || [],
          description: c.description || "",
        }));
        await supabase.from("combos").insert(rows);
        fetchData();
      }
    } catch (err) {
      console.error("Combo generation error:", err);
    }
    setGeneratingCombos(false);
  };

  const saveItem = async (item: ClothingItem) => {
    const isNew = item.id.startsWith("custom-");
    const row = { id: item.id, cat: item.cat, name: item.name, brand: item.brand || null, color: item.color || null, season: item.season || [], tags: item.tags, note: item.note || null };
    await supabase.from("clothing_items").upsert(row);
    setEditingItem(null);
    setAddingItem(false);
    fetchData();
    if (isNew && item.cat !== "accessories") {
      generateCombosForItem(item);
    }
  };

  const deleteItem = async (id: string) => {
    await supabase.from("clothing_items").delete().eq("id", id);
    setEditingItem(null);
    fetchData();
  };

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
      const res = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: base64 }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await supabase.from("clothing_items").update({ image_url: data.url }).eq("id", imageTargetId);
      fetchData();
    } catch (err) {
      console.error("Upload error:", err);
      alert("사진 업로드에 실패했어요.");
    }
    setImageTargetId(null);
    setImageUploading(false);
    e.target.value = "";
  };

  // ─── OOTD ───────────────────────────────────────────────────────
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setOotdImage(reader.result as string); setOotdResult(null); setOotdAddPicker(false); };
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
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = dataUrl;
    });
  };

  const buildAnalysisPrompt = () => {
    const itemList = allItems.map(i =>
      `${i.id}: ${i.name}${i.color ? ` (${i.color})` : ''}${i.brand ? ` [${i.brand}]` : ''} — ${CATEGORIES[i.cat]}`
    ).join('\n');
    return `You are analyzing an OOTD (outfit of the day) photo. The person's wardrobe contains these items:\n\n${itemList}\n\nAnalyze the photo and identify which items from the wardrobe the person is wearing. Return ONLY a JSON object with no other text, in this exact format:\n{"items": ["id1", "id2", ...], "description": "Brief Korean description of the outfit"}\n\nRules:\n- Only use item IDs from the list above\n- Pick the closest matching items\n- Include: bottom, top, outer (if visible), shoes (if visible), accessories (glasses, tie, bag, watch if visible)\n- description should be 1-2 sentences in Korean describing the overall look`;
  };

  const analyzeOotd = async () => {
    if (!ootdImage) return;
    setOotdAnalyzing(true);
    try {
      const resized = await resizeImage(ootdImage, 1024);
      const base64 = resized.split(",")[1];
      const response = await fetch("/api/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mediaType: "image/jpeg", prompt: buildAnalysisPrompt() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "API error");
      const text = data.content?.map((c: { text?: string }) => c.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      const validItems = (parsed.items || []).filter((id: string) => allItems.some(i => i.id === id));
      setOotdResult({ items: validItems, description: parsed.description || "" });
    } catch (err) {
      console.error("Analysis error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setOotdResult({ items: [], description: `분석에 실패했어: ${msg}` });
    }
    setOotdAnalyzing(false);
  };

  const [ootdSaving, setOotdSaving] = useState(false);

  const saveOotdRecord = async () => {
    if (!ootdResult || ootdResult.items.length === 0) return;
    setOotdSaving(true);
    try {
      const [imageUrl, commentRes] = await Promise.all([
        (async () => {
          if (!ootdImage) return undefined;
          try {
            const resized = await resizeImage(ootdImage, 800);
            const res = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: resized }) });
            const data = await res.json();
            if (res.ok) return data.url as string;
          } catch {} return undefined;
        })(),
        (async () => {
          const itemNames = ootdResult.items.map(id => {
            const item = getItem(id);
            return item ? `${item.name}${item.color ? ` (${item.color})` : ""} — ${CATEGORIES[item.cat]}` : id;
          });
          const res = await fetch("/api/analyze-text", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: `오늘 착장 아이템 목록:\n${itemNames.join("\n")}\n\n이 조합에 대해 한국어로 2문장 이내로 코디 코멘트를 해줘. 스타일 느낌, 잘 어울리는 포인트, 또는 개선 팁을 짧게. 답변만 써줘.` }),
          });
          if (!res.ok) throw new Error();
          return res.json();
        })(),
      ]);
      const text = commentRes.content?.map((c: { text?: string }) => c.text || "").join("") || ootdResult.description;
      await supabase.from("ootd_logs").insert({ date: new Date().toISOString().split("T")[0], items: ootdResult.items, description: text, image_url: imageUrl });
      setOotdImage(null); setOotdResult(null); setOotdStatsView(true);
      fetchData();
    } catch {
      await supabase.from("ootd_logs").insert({ date: new Date().toISOString().split("T")[0], items: ootdResult.items, description: ootdResult.description });
      setOotdImage(null); setOotdResult(null); setOotdStatsView(true);
      fetchData();
    }
    setOotdSaving(false);
  };

  const deleteOotdLog = async (id: string) => {
    await supabase.from("ootd_logs").delete().eq("id", id);
    fetchData();
  };

  // ─── Wishlist CRUD ──────────────────────────────────────────────
  const [editingWish, setEditingWish] = useState<WishItem | null>(null);

  const addWish = async (name: string) => {
    await supabase.from("wish_items").insert({ name, status: "watch", note: "" });
    setNewWish(""); fetchData();
  };
  const saveWish = async (w: WishItem) => {
    await supabase.from("wish_items").upsert({ id: w.id, name: w.name, price: w.price || null, status: w.status, note: w.note || "", link: w.link || null, image_url: w.image_url || null });
    setEditingWish(null); fetchData();
  };
  const addWishStatus = async (label: string) => {
    const id = label.toLowerCase().replace(/[^a-z0-9가-힣]/g, "_").slice(0, 30) + "_" + Date.now();
    const colors = ["#6B6B42", "#C47070", "#5A7BA0", "#4A7C59", "#C4952B", "#6B2D3E", "#8E8E8E"];
    const color = colors[wishStatuses.length % colors.length];
    await supabase.from("wish_statuses").insert({ id, label, color, sort_order: wishStatuses.length });
    fetchData();
    return id;
  };
  const removeWish = async (id: string) => {
    await supabase.from("wish_items").delete().eq("id", id);
    setEditingWish(null); fetchData();
  };

  // ─── RENDER: OOTD ─────────────────────────────────────────────
  const renderOotd = () => {
    const counts: Record<string, number> = {};
    ootdLogs.forEach(log => { log.items.forEach(id => { counts[id] = (counts[id] || 0) + 1; }); });
    const topWorn = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const worn = new Set(ootdLogs.flatMap(l => l.items));
    const unworn = clothingItems.filter(i => !worn.has(i.id));

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
          {ootdLogs.slice(0, 10).map(log => (
            <div key={log.id} style={{ background: "rgba(255,255,255,0.7)", borderRadius: 12, padding: "12px 16px", marginBottom: 8, border: "1px solid rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#6B2D3E" }}>{log.date}</span>
                <button onClick={() => deleteOotdLog(log.id)} style={{ border: "none", background: "transparent", color: "#CCC", cursor: "pointer", fontSize: 14 }}>✕</button>
              </div>
              {log.image_url && (
                <div style={{ borderRadius: 10, overflow: "hidden", marginBottom: 8 }}>
                  <img src={log.image_url} alt={`OOTD ${log.date}`} style={{ width: "100%", maxHeight: 280, objectFit: "cover", display: "block" }} />
                </div>
              )}
              <div style={{ fontSize: 12, color: "#555", marginBottom: 6, lineHeight: 1.5 }}>{log.description}</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {log.items.map(id => { const item = getItem(id); if (!item) return null; return <span key={id} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 16, background: "rgba(0,0,0,0.06)", color: "#555" }}>{item.name}</span>; })}
              </div>
            </div>
          ))}
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
                  <input value={ootdSearchQuery} onChange={e => setOotdSearchQuery(e.target.value)} placeholder="아이템 검색..." style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid rgba(0,0,0,0.1)", fontSize: 12, fontFamily: "inherit", background: "rgba(255,255,255,0.7)", outline: "none", marginBottom: 8, boxSizing: "border-box" }} />
                  <div style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                    {allItems.filter(i => !ootdResult.items.includes(i.id)).filter(i => {
                      if (!ootdSearchQuery.trim()) return true;
                      const q = ootdSearchQuery.toLowerCase();
                      return i.name.toLowerCase().includes(q) || (i.brand || "").toLowerCase().includes(q) || (i.color || "").toLowerCase().includes(q) || CATEGORIES[i.cat].includes(q);
                    }).map(item => (
                      <ItemCard key={item.id} item={item} compact onClick={() => setOotdResult({ ...ootdResult, items: [...ootdResult.items, item.id] })} />
                    ))}
                  </div>
                  <button onClick={() => { setOotdAddPicker(false); setOotdSearchQuery(""); }} style={{ marginTop: 8, width: "100%", padding: 8, borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)", background: "transparent", cursor: "pointer", fontSize: 12, fontFamily: "inherit", color: "#888" }}>닫기</button>
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
      {generatingCombos && <div style={{ padding: "8px 16px", marginBottom: 12, borderRadius: 10, background: "rgba(107,45,62,0.08)", border: "1px solid rgba(107,45,62,0.15)", fontSize: 12, color: "#6B2D3E", textAlign: "center" }}>AI가 새 아이템으로 코디 조합 만드는 중...</div>}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        <Pill label="전체" active={closetFilter === "all"} onClick={() => setClosetFilter("all")} />
        {Object.entries(SEASONS).map(([k, v]) => <Pill key={k} label={v} active={closetFilter === k} onClick={() => setClosetFilter(k as Season)} count={allItems.filter(i => i.season?.includes(k as Season)).length} />)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(Object.keys(CATEGORIES) as CategoryKey[]).map(ck => {
          let items = allItems.filter(i => i.cat === ck);
          if (closetFilter !== "all") items = items.filter(i => !i.season || i.season.includes(closetFilter));
          if (!items.length) return null;
          const isOpen = expandedCat === ck;
          return (
            <div key={ck} style={{ background: "rgba(255,255,255,0.5)", borderRadius: 14, border: "1px solid rgba(0,0,0,0.06)", overflow: "hidden" }}>
              <button onClick={() => setExpandedCat(isOpen ? null : ck)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 18px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit" }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#2A2A2A" }}>{CATEGORIES[ck]}</span>
                <span style={{ fontSize: 12, color: "#888" }}>{items.length}개 {isOpen ? "▲" : "▼"}</span>
              </button>
              {isOpen && <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                {items.map(i => <ItemCard key={i.id} item={i} imageUrl={i.image_url} onEdit={() => setEditingItem(i)} onAddPhoto={() => { setImageTargetId(i.id); itemImageInputRef.current?.click(); }} onRemovePhoto={() => { supabase.from("clothing_items").update({ image_url: null }).eq("id", i.id).then(() => fetchData()); }} />)}
              </div>}
            </div>
          );
        })}
      </div>
      <button onClick={() => setAddingItem(true)} style={{ width: "100%", marginTop: 16, padding: 14, borderRadius: 14, border: "2px dashed rgba(107,45,62,0.2)", background: "rgba(107,45,62,0.03)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 500, color: "#6B2D3E" }}>+ 새 아이템 추가</button>
    </div>
  );

  // ─── COMBO ────────────────────────────────────────────────────
  const renderCombo = () => {
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
                  <button onClick={() => saved ? setSavedCombos(savedCombos.filter(s => s.key !== ck)) : setSavedCombos([...savedCombos, { key: ck, combo: comboForSave, savedAt: new Date().toISOString() }])} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 18, color: saved ? "#C4952B" : "#CCC" }}>{saved ? "★" : "☆"}</button>
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
  };

  // ─── MOOD ─────────────────────────────────────────────────────
  const renderMood = () => {
    const filtered = combos.filter(c => c.season.includes(activeSeason) && (!selectedMood || c.mood.includes(selectedMood)));
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
        {shuffled.map((combo) => {
          const bottom = getItem(combo.bottom);
          return (
            <div key={combo.id} style={{ background: "rgba(255,255,255,0.7)", borderRadius: 14, padding: 16, marginBottom: 10, border: "1px solid rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#6B2D3E", marginBottom: 8 }}>{combo.description}</div>
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

  // ─── BUY OR NOT (살/말) ─────────────────────────────────────────
  const analyzeBuyOrNot = async () => {
    if (!buyImage) return;
    setBuyAnalyzing(true);
    try {
      const resized = await resizeImage(buyImage, 1024);
      const base64 = resized.split(",")[1];

      const wardrobeSummary = allItems.filter(i => i.cat !== "accessories").map(i =>
        `${i.name}${i.color ? ` (${i.color})` : ""}${i.brand ? ` [${i.brand}]` : ""} — ${CATEGORIES[i.cat]}${i.season ? ` [${i.season.map(s => SEASONS[s]).join("/")}]` : ""}`
      ).join("\n");

      const prompt = `사진 속 옷에 대해 "살까 말까" 판단을 해줘.

현재 옷장:
${wardrobeSummary}

스타일 축: 워크웨어, 아이비/프레피, 힙합 캐주얼
퍼스널컬러: 웜톤 가을(Autumn) — 어스톤 컬러(브라운, 카키, 샌드베이지, 머스터드)
개인 원칙: 빼입기 선호, 안 입는 옷 사지 않기, 모자 안 씀, 노란색은 어렵다(머스터드가 한계)

분석해줄 것:
1. 중복 체크: 옷장에 비슷한 아이템이 있는지
2. 활용도: 이 아이템이 있으면 기존 옷들과 새 조합이 몇 개나 가능한지
3. 스타일 적합성: 내 스타일 축에 맞는지
4. 색상 조화: 내 옷장 컬러 팔레트와 어울리는지

답변 형식 (JSON만):
{"verdict": "살" 또는 "고민" 또는 "말", "itemName": "사진 속 아이템 이름 (예: 네이비 치노 팬츠)", "analysis": "한국어로 4-5문장 분석. 각 항목(중복/활용도/스타일/색상)을 자연스럽게 포함해서."}`;

      const response = await fetch("/api/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mediaType: "image/jpeg", prompt }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      const text = data.content?.map((c: { text?: string }) => c.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      const emojiMap: Record<string, string> = { "살": "🟢", "고민": "🟡", "말": "🔴" };
      setBuyResult({ verdict: parsed.verdict, emoji: emojiMap[parsed.verdict] || "🟡", analysis: parsed.analysis, itemName: parsed.itemName || "분석 아이템" });
    } catch (err) {
      console.error("Buy analysis error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setBuyResult({ verdict: "오류", emoji: "⚠️", analysis: `분석에 실패했어: ${msg}`, itemName: "" });
    }
    setBuyAnalyzing(false);
  };

  const renderBuyOrNot = () => (
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

  // ─── WISHLIST ──────────────────────────────────────────────────
  const renderWishlist = () => {
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
              <button onClick={() => setSavedCombos(savedCombos.filter((_, i) => i !== idx))} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#C4952B", fontSize: 16, padding: 4 }}>★</button>
            </div>
          ))}
        </div>}
      </div>
    );
  };

  // ─── NAV & LAYOUT ─────────────────────────────────────────────
  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontSize: 14 }}>로딩 중...</div>;

  const NAV = [
    { key: "ootd" as const, label: "OOTD", icon: "📸" },
    { key: "closet" as const, label: "옷장", icon: "◫" },
    { key: "combo" as const, label: "코디", icon: "◈" },
    { key: "mood" as const, label: "오늘 뭐 입지", icon: "☀" },
    { key: "buyornot" as const, label: "살/말", icon: "🤔" },
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
        {view === "buyornot" && renderBuyOrNot()}
        {view === "wishlist" && renderWishlist()}
      </div>

      {/* Edit / Add Item Modal */}
      {(editingItem || addingItem) && (
        <ItemEditModal
          item={editingItem}
          onSave={saveItem}
          onDelete={editingItem ? deleteItem : undefined}
          onClose={() => { setEditingItem(null); setAddingItem(false); }}
          onGenerateCombos={editingItem ? generateCombosForItem : undefined}
        />
      )}

      {/* Wish Edit Modal */}
      {editingWish && (() => {
        const WishModal = () => {
          const [form, setForm] = useState({ ...editingWish });
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
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setEditingWish(null)}>
              <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto", background: "linear-gradient(160deg, #F5F0E1, #E8E0D0)", borderRadius: "20px 20px 0 0", padding: "20px 16px 32px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#2A2A2A" }}>찜 아이템 편집</span>
                  <button onClick={() => setEditingWish(null)} style={{ border: "none", background: "transparent", fontSize: 18, cursor: "pointer", color: "#888" }}>✕</button>
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
                      <button onClick={async () => { if (newStatusName.trim()) { const id = await addWishStatus(newStatusName.trim()); setForm({ ...form, status: id }); setNewStatusName(""); } }} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#2A2A2A", color: "#F5F0E1", cursor: "pointer", fontSize: 12, fontFamily: "inherit", flexShrink: 0 }}>추가</button>
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
                <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
                  <button onClick={() => removeWish(form.id)} style={{ padding: "12px 16px", borderRadius: 10, border: "1.5px solid rgba(232,93,93,0.3)", background: "transparent", color: "#E85D5D", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>삭제</button>
                  <button onClick={() => setEditingWish(null)} style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)", background: "transparent", cursor: "pointer", fontSize: 13, fontFamily: "inherit", color: "#888" }}>취소</button>
                  <button onClick={() => saveWish(form)} style={{ flex: 2, padding: 12, borderRadius: 10, border: "none", background: "#2A2A2A", color: "#F5F0E1", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>저장</button>
                </div>
              </div>
            </div>
          );
        };
        return <WishModal />;
      })()}
    </div>
  );
}
