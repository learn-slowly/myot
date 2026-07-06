"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import exifr from "exifr";
import { CATEGORIES, SEASONS, type Season, type Mood, type CategoryKey, type ClothingItem, type WishItem } from "@/data/closet";
import { supabase } from "@/lib/db";
import { getCurrentSeason, resizeImage } from "@/lib/utils";
import type { DbCombo, OotdLog, SavedCombo, LetgoItem, WishStatus, Weather } from "@/types";

export type View = "ootd" | "closet" | "combo" | "mood" | "buyornot" | "wishlist" | "letgo";

export type App = ReturnType<typeof useAppState>;

export function useAppState() {
  const [view, setView] = useState<View>("closet");
  const [comboSelections, setComboSelections] = useState<{ bottom?: string; top?: string; outer?: string }>({});
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [closetFilter, setClosetFilter] = useState<"all" | Season>("all");
  const [expandedCat, setExpandedCat] = useState<CategoryKey | null>(null);
  const [closetViewMode, setClosetViewMode] = useState<"category" | "date">("category");
  const [newWish, setNewWish] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Weather state
  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // 비움 state
  const [letgoItems, setLetgoItems] = useState<LetgoItem[]>([]);
  const [letgoAdding, setLetgoAdding] = useState(false);
  const [letgoSearch, setLetgoSearch] = useState("");
  const [letgoRecCat, setLetgoRecCat] = useState<string>("all");

  // OOTD state
  const [ootdImage, setOotdImage] = useState<string | null>(null);
  const [ootdAnalyzing, setOotdAnalyzing] = useState(false);
  const [ootdResult, setOotdResult] = useState<{ items: string[]; description: string } | null>(null);
  const [ootdStatsView, setOotdStatsView] = useState(false);
  const [ootdAddPicker, setOotdAddPicker] = useState(false);
  const [ootdSearchQuery, setOotdSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ootdPhotoInputRef = useRef<HTMLInputElement>(null);
  const [ootdPhotoTargetId, setOotdPhotoTargetId] = useState<string | null>(null);
  const [ootdPhotoUploading, setOotdPhotoUploading] = useState<string | null>(null);
  const [ootdSaving, setOotdSaving] = useState(false);
  const [ootdMemo, setOotdMemo] = useState("");
  const [ootdDate, setOotdDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [editingMemoText, setEditingMemoText] = useState("");

  // DB data
  const [allItems, setAllItems] = useState<ClothingItem[]>([]);
  const [combos, setCombos] = useState<DbCombo[]>([]);
  const [wishlist, setWishlist] = useState<WishItem[]>([]);
  const [ootdLogs, setOotdLogs] = useState<OotdLog[]>([]);
  const [wishStatuses, setWishStatuses] = useState<WishStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const [customCats, setCustomCats] = useState<Record<string, string>>({});

  // 살/말 state
  const [buyImage, setBuyImage] = useState<string | null>(null);
  const [buyAnalyzing, setBuyAnalyzing] = useState(false);
  const [buyResult, setBuyResult] = useState<{ verdict: string; emoji: string; analysis: string; itemName: string } | null>(null);
  const buyFileRef = useRef<HTMLInputElement>(null);

  // Local state
  const [savedCombos, setSavedCombos] = useState<SavedCombo[]>([]);
  const [editingItem, setEditingItem] = useState<ClothingItem | null>(null);
  const [addingItem, setAddingItem] = useState(false);
  const itemImageInputRef = useRef<HTMLInputElement>(null);
  const [imageTargetId, setImageTargetId] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [generatingCombos, setGeneratingCombos] = useState(false);

  // Closet stats state
  const [showClosetStats, setShowClosetStats] = useState(false);
  const [styleAnalysis, setStyleAnalysis] = useState<string | null>(null);
  const [analyzingStyle, setAnalyzingStyle] = useState(false);
  const [statsSeason, setStatsSeason] = useState<string>(() => { const s = getCurrentSeason(); const y = new Date().getFullYear(); return `${y}-${s}`; });
  const [statsYear, setStatsYear] = useState<number>(new Date().getFullYear());

  // Wishlist edit state
  const [editingWish, setEditingWish] = useState<WishItem | null>(null);

  const getItem = useCallback((id: string) => allItems.find(i => i.id === id), [allItems]);
  const clothingItems = allItems.filter(i => i.cat !== "accessories");
  const activeSeason = selectedSeason || getCurrentSeason();

  // 착용 빈도 계산
  const wearData = (() => {
    const counts: Record<string, number> = {};
    const lastDates: Record<string, string> = {};
    ootdLogs.forEach(log => {
      log.items.forEach(id => {
        counts[id] = (counts[id] || 0) + 1;
        if (!lastDates[id] || log.date > lastDates[id]) lastDates[id] = log.date;
      });
    });
    return { counts, lastDates };
  })();

  // ─── Fetch data from DB ─────────────────────────────────────────
  const fetchData = useCallback(async () => {
    const [itemsRes, combosRes, wishRes, ootdRes, statusRes, letgoRes, customCatsRes, savedCombosRes] = await Promise.all([
      supabase.from("clothing_items").select("*").order("id"),
      supabase.from("combos").select("*"),
      supabase.from("wish_items").select("*").order("created_at"),
      supabase.from("ootd_logs").select("*").order("date", { ascending: false }),
      supabase.from("wish_statuses").select("*").order("sort_order"),
      supabase.from("letgo_items").select("*").order("created_at"),
      supabase.from("custom_categories").select("*"),
      supabase.from("saved_combos").select("*").order("saved_at"),
    ]);
    if (itemsRes.data) setAllItems(itemsRes.data.map((r: Record<string, unknown>) => ({
      id: r.id as string, cat: r.cat as CategoryKey, name: r.name as string, brand: r.brand as string | undefined,
      color: r.color as string | undefined, season: r.season as Season[] | undefined,
      tags: ((r.tags as string[]) || []) as import("@/data/closet").StyleTag[], note: r.note as string | undefined, image_url: r.image_url as string | undefined,
      purchased_at: r.purchased_at as string | undefined, last_cleaned_at: r.last_cleaned_at as string | undefined,
      acquired_via: r.acquired_via as string | undefined, size: r.size as string | undefined,
      price: r.price as number | undefined,
    })));
    if (combosRes.data) setCombos(combosRes.data as DbCombo[]);
    if (wishRes.data) setWishlist(wishRes.data.map((r: Record<string, unknown>) => ({
      id: r.id as string, name: r.name as string, price: r.price as string | undefined,
      status: r.status as string, note: (r.note as string) || "", link: r.link as string | undefined, image_url: r.image_url as string | undefined,
    })));
    if (ootdRes.data) setOotdLogs(ootdRes.data.map((r: Record<string, unknown>) => ({
      id: r.id as string, date: r.date as string, items: r.items as string[],
      description: (r.description as string) || "", image_url: r.image_url as string | undefined, memo: (r.memo as string) || undefined,
    })));
    if (statusRes.data) setWishStatuses(statusRes.data as WishStatus[]);
    if (letgoRes.data) setLetgoItems(letgoRes.data.map((r: Record<string, unknown>) => ({
      dbId: r.id as string, id: r.item_id as string, reason: (r.reason as string) || undefined, addedAt: (r.added_at as string) || "", status: (r.status as string) || "undecided",
    })));
    if (customCatsRes.data) {
      const cats: Record<string, string> = {};
      customCatsRes.data.forEach((r: Record<string, unknown>) => { cats[r.key as string] = r.label as string; });
      setCustomCats(cats);
    }
    if (savedCombosRes.data) setSavedCombos(savedCombosRes.data.map((r: Record<string, unknown>) => ({
      key: r.combo_key as string, combo: r.combo as SavedCombo["combo"], savedAt: r.saved_at as string,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Weather (Open-Meteo) ───────────────────────────────────────
  useEffect(() => {
    const fetchWeather = async (lat: number, lon: number) => {
      setWeatherLoading(true);
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`);
        const data = await res.json();
        const temp = Math.round(data.current.temperature_2m);
        const code = data.current.weather_code as number;
        // WMO weather code → description + icon
        const weatherMap: Record<number, [string, string]> = {
          0: ["맑음", "☀️"], 1: ["대체로 맑음", "🌤"], 2: ["구름 조금", "⛅"], 3: ["흐림", "☁️"],
          45: ["안개", "🌫"], 48: ["안개", "🌫"],
          51: ["이슬비", "🌦"], 53: ["이슬비", "🌦"], 55: ["이슬비", "🌦"],
          61: ["비", "🌧"], 63: ["비", "🌧"], 65: ["폭우", "🌧"],
          71: ["눈", "🌨"], 73: ["눈", "🌨"], 75: ["폭설", "🌨"],
          80: ["소나기", "🌦"], 81: ["소나기", "🌦"], 82: ["소나기", "🌦"],
          95: ["뇌우", "⛈"], 96: ["뇌우+우박", "⛈"], 99: ["뇌우+우박", "⛈"],
        };
        const [desc, icon] = weatherMap[code] || ["맑음", "☀️"];
        setWeather({ temp, desc, icon });
        localStorage.setItem("myot-coords", JSON.stringify({ lat, lon }));
      } catch { setWeather(null); }
      setWeatherLoading(false);
    };

    // 캐싱된 좌표 확인
    const cached = localStorage.getItem("myot-coords");
    if (cached) {
      const { lat, lon } = JSON.parse(cached);
      fetchWeather(lat, lon);
    }

    // 위치 가져오기
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => { if (!cached) fetchWeather(37.5665, 126.978); } // 서울 기본값
      );
    } else if (!cached) {
      fetchWeather(37.5665, 126.978);
    }
  }, []);

  // ─── Item CRUD ──────────────────────────────────────────────────
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
    const row = { id: item.id, cat: item.cat, name: item.name, brand: item.brand || null, color: item.color || null, season: item.season || [], tags: item.tags, note: item.note || null, purchased_at: item.purchased_at || null, last_cleaned_at: item.last_cleaned_at || null, acquired_via: item.acquired_via || null, size: item.size || null, price: item.price ?? null };
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

  // ─── Item Image Upload ──────────────────────────────────────────
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
    // 사진의 EXIF 촬영 날짜를 읽어 기록 날짜에 자동 반영 — 과거 OOTD 소급 기록용.
    // 메타데이터가 없으면 오늘 날짜 유지. 저장 전 날짜 입력칸에서 확인·수정 가능.
    exifr.parse(file, ["DateTimeOriginal", "CreateDate"]).then((exif) => {
      const taken: unknown = exif?.DateTimeOriginal || exif?.CreateDate;
      if (taken instanceof Date && !isNaN(taken.getTime())) {
        const y = taken.getFullYear();
        const m = String(taken.getMonth() + 1).padStart(2, "0");
        const d = String(taken.getDate()).padStart(2, "0");
        setOotdDate(`${y}-${m}-${d}`);
      } else {
        setOotdDate(new Date().toISOString().split("T")[0]);
      }
    }).catch(() => setOotdDate(new Date().toISOString().split("T")[0]));
    const reader = new FileReader();
    reader.onload = () => { setOotdImage(reader.result as string); setOotdResult(null); setOotdAddPicker(false); };
    reader.readAsDataURL(file);
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
      await supabase.from("ootd_logs").insert({ date: ootdDate, items: ootdResult.items, description: text, image_url: imageUrl, memo: ootdMemo.trim() || null });
      setOotdImage(null); setOotdResult(null); setOotdMemo(""); setOotdDate(new Date().toISOString().split("T")[0]); setOotdStatsView(true);
      fetchData();
    } catch {
      await supabase.from("ootd_logs").insert({ date: ootdDate, items: ootdResult.items, description: ootdResult.description, memo: ootdMemo.trim() || null });
      setOotdImage(null); setOotdResult(null); setOotdMemo(""); setOotdDate(new Date().toISOString().split("T")[0]); setOotdStatsView(true);
      fetchData();
    }
    setOotdSaving(false);
  };

  const deleteOotdLog = async (id: string) => {
    await supabase.from("ootd_logs").delete().eq("id", id);
    fetchData();
  };

  const saveOotdMemo = async (id: string, memo: string) => {
    await supabase.from("ootd_logs").update({ memo: memo.trim() || null }).eq("id", id);
    setEditingMemoId(null);
    fetchData();
  };

  const handleOotdPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetId = ootdPhotoTargetId;
    if (!file || !targetId) return;
    setOotdPhotoUploading(targetId);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const resized = await resizeImage(base64, 800);
      const res = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: resized }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await supabase.from("ootd_logs").update({ image_url: data.url }).eq("id", targetId);
      fetchData();
    } catch (err) {
      console.error("Upload error:", err);
      alert("사진 업로드에 실패했어요.");
    }
    setOotdPhotoTargetId(null);
    setOotdPhotoUploading(null);
    e.target.value = "";
  };

  // ─── Wishlist CRUD ──────────────────────────────────────────────
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

  return {
    view, setView,
    comboSelections, setComboSelections,
    selectedSeason, setSelectedSeason,
    selectedMood, setSelectedMood,
    closetFilter, setClosetFilter,
    expandedCat, setExpandedCat,
    closetViewMode, setClosetViewMode,
    newWish, setNewWish,
    refreshKey, setRefreshKey,
    weather, weatherLoading,
    letgoItems, letgoAdding, setLetgoAdding, letgoSearch, setLetgoSearch, letgoRecCat, setLetgoRecCat,
    ootdImage, setOotdImage, ootdAnalyzing, ootdResult, setOotdResult,
    ootdStatsView, setOotdStatsView, ootdAddPicker, setOotdAddPicker, ootdSearchQuery, setOotdSearchQuery,
    fileInputRef, ootdPhotoInputRef, setOotdPhotoTargetId, ootdPhotoUploading,
    ootdSaving, ootdMemo, setOotdMemo, ootdDate, setOotdDate,
    editingMemoId, setEditingMemoId, editingMemoText, setEditingMemoText,
    allItems, combos, wishlist, ootdLogs, wishStatuses, loading, customCats,
    buyImage, setBuyImage, buyAnalyzing, buyResult, setBuyResult, buyFileRef,
    savedCombos, editingItem, setEditingItem, addingItem, setAddingItem,
    itemImageInputRef, setImageTargetId, imageUploading, generatingCombos,
    showClosetStats, setShowClosetStats, styleAnalysis, setStyleAnalysis,
    analyzingStyle, setAnalyzingStyle, statsSeason, setStatsSeason, statsYear, setStatsYear,
    editingWish, setEditingWish,
    getItem, clothingItems, activeSeason, wearData,
    fetchData,
    generateCombosForItem, saveItem, deleteItem,
    handleItemImageUpload, handleImageUpload,
    analyzeOotd, saveOotdRecord, deleteOotdLog, saveOotdMemo, handleOotdPhotoUpload,
    addWish, saveWish, addWishStatus, removeWish,
    analyzeBuyOrNot,
  };
}
