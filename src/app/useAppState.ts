"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import exifr from "exifr";
import { CATEGORIES, SEASONS, type Season, type Mood, type CategoryKey, type ClothingItem, type WishItem } from "@/data/closet";
import { supabase } from "@/lib/db";
import { getCurrentSeason, resizeImage } from "@/lib/utils";
import { STYLE_CONTEXT, buildWardrobeSummary } from "@/lib/prompts";
import type { DbCombo, OotdLog, SavedCombo, LetgoItem, WishStatus, Weather, CompareResult, CompareCandidate } from "@/types";

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
  const [linkLoading, setLinkLoading] = useState(false);
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

  // 여러 개 비교 (가성비) state
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<Set<string>>(new Set());
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [compareItems, setCompareItems] = useState<WishItem[]>([]);

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

  // 이름이 겹치는 아이템은 브랜드를 덧붙여 구분 (예: "스트레이트 청바지 진청 · 플랙")
  const dupNames = (() => {
    const counts: Record<string, number> = {};
    allItems.forEach(i => { counts[i.name] = (counts[i.name] || 0) + 1; });
    return new Set(Object.entries(counts).filter(([, n]) => n > 1).map(([name]) => name));
  })();
  const itemLabel = useCallback((item: ClothingItem) =>
    dupNames.has(item.name) && item.brand ? `${item.name} · ${item.brand}` : item.name,
    [dupNames]);

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

  // 찜 탭을 벗어나면 비교 모드/선택 초기화
  useEffect(() => {
    if (view !== "wishlist" && compareMode) {
      setCompareMode(false);
      setCompareSelection(new Set());
    }
  }, [view, compareMode]);

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
      `${i.id}: ${i.name}${i.color ? ` (${i.color})` : ''}${i.brand ? ` [${i.brand}]` : ''} — ${CATEGORIES[i.cat] || customCats[i.cat] || i.cat}${i.season?.length ? ` [${i.season.map(s => SEASONS[s]).join('/')}]` : ''}`
    ).join('\n');
    return `거울 셀피(OOTD) 사진을 분석해서, 아래 옷장 목록에서 착용 중인 아이템을 찾아줘.

옷장 목록 (id: 이름 (색상) [브랜드] — 카테고리 [시즌]):
${itemList}

분석 순서:
1. 사진에 보이는 착장을 부위별로 관찰해: 하의(색·핏·기장), 상의(이너까지), 아우터, 신발, 가방, 안경/모자/시계 같은 소품.
2. 각 부위마다 옷장 목록에서 후보를 찾아. 이름의 색상 단어(진청/연청/중청, 크림/화이트, 그레이/블랙 등)와 옷 종류가 사진과 일치하는지 대조해.
3. 비슷한 후보가 여럿이면 색상이 가장 정확히 일치하는 것을 골라. 색으로도 구분이 안 되면 핏(스트레이트/테이퍼드, 오버사이즈 등)으로 판단해.

규칙:
- 사진에 실제로 보이는 아이템만 포함해. 보이지 않는 부위는 추측하지 마.
- 확신이 없는 아이템은 넣지 말고 빼. 틀린 매칭보다 빠뜨리는 게 낫다.
- 목록에 없는 옷이 보이면 무시해.
- 반드시 위 목록의 id만 사용해.

JSON만 반환:
{"items": ["id1", ...], "description": "전체 룩을 한국어 1-2문장으로"}`;
  };

  const analyzeOotd = async () => {
    if (!ootdImage) return;
    setOotdAnalyzing(true);
    try {
      // Sonnet 5는 고해상도 vision 지원(최대 2576px) — 비슷한 옷 구분에 디테일이 중요
      const resized = await resizeImage(ootdImage, 2000);
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
  // 상품 링크 붙여넣기 → OG/JSON-LD로 사진·이름·가격 추출 → 확인 모달(임시 찜)
  const addWishFromLink = async (url: string) => {
    setLinkLoading(true);
    try {
      const res = await fetch("/api/parse-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "링크를 읽지 못했어요"); return; }
      setNewWish("");
      setEditingWish({ id: crypto.randomUUID(), name: data.name || "", price: data.price || "", image_url: data.image_url || undefined, link: data.link || url, status: "watch", note: "링크" });
    } catch {
      alert("링크 분석 중 오류가 났어요");
    } finally {
      setLinkLoading(false);
    }
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

  // 찜 = 인박스. 여기서 옷장으로 졸업시키거나 살/말 판단으로 보냄.
  const guessCat = (note?: string): CategoryKey => {
    if (note) for (const [k, label] of Object.entries(CATEGORIES)) if (note.includes(label)) return k as CategoryKey;
    return "shortTees" as CategoryKey;
  };
  const moveWishToCloset = async (wish: WishItem) => {
    // insert 성공을 확인한 뒤에만 찜에서 삭제 (실패 시 데이터 손실 방지)
    const { error } = await supabase.from("clothing_items").insert({
      id: `custom-${Date.now()}`, cat: guessCat(wish.note), name: wish.name,
      image_url: wish.image_url || null, season: [], tags: [],
    });
    if (error) { alert(`옷장 추가에 실패했어요: ${error}`); return; }
    await supabase.from("wish_items").delete().eq("id", wish.id);
    setEditingWish(null);
    await fetchData();
    setView("closet");
  };
  const judgeWish = (wish: WishItem) => {
    if (!wish.image_url) return;
    // URL을 그대로 넘김 — 표시는 <img>, 분석 시엔 서버가 fetch (외부 쇼핑몰 이미지 CORS 회피)
    setBuyImage(wish.image_url);
    setBuyResult(null);
    setEditingWish(null);
    setView("buyornot");
  };

  // ─── BUY OR NOT (살/말) ─────────────────────────────────────────
  const analyzeBuyOrNot = async () => {
    if (!buyImage) return;
    setBuyAnalyzing(true);
    try {
      // 업로드 사진(dataURL)은 클라이언트 리사이즈, 링크로 담은 외부/blob URL은
      // 서버가 fetch (CORS·canvas taint 회피)
      const isDataUrl = buyImage.startsWith("data:");
      const imgPayload = isDataUrl
        ? { image: (await resizeImage(buyImage, 1024)).split(",")[1], mediaType: "image/jpeg" }
        : { imageUrl: buyImage };

      const wardrobeSummary = buildWardrobeSummary(allItems);

      const prompt = `사진 속 옷에 대해 "살까 말까" 판단을 해줘.

현재 옷장:
${wardrobeSummary}

${STYLE_CONTEXT}

분석해줄 것:
1. 중복 체크: 옷장에 비슷한 아이템이 있는지
2. 활용도: 이 아이템이 있으면 기존 옷들과 새 조합이 몇 개나 가능한지
3. 스타일 적합성: 내 스타일 축에 맞는지
4. 색상 조화: 내 옷장 컬러 팔레트와 어울리는지

답변 형식 (JSON만):
{"verdict": "살" 또는 "고민" 또는 "말", "itemName": "사진 속 아이템 이름 (예: 네이비 치노 팬츠)", "analysis": "한국어로 4-5문장 분석. 각 항목(중복/활용도/스타일/색상)을 자연스럽게 포함해서."}`;

      const response = await fetch("/api/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...imgPayload, prompt }),
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

  // ─── 여러 개 비교 (가성비) ─────────────────────────────────────
  const enterCompareMode = (seedId?: string) => {
    setCompareMode(true);
    setCompareSelection(seedId ? new Set([seedId]) : new Set());
  };
  const cancelCompare = () => {
    setCompareMode(false);
    setCompareSelection(new Set());
  };
  const toggleCompareSelect = (id: string) => {
    setCompareSelection(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else { if (next.size >= 5) return prev; next.add(id); }
      return next;
    });
  };
  const closeCompareResult = () => {
    setCompareResult(null);
    setCompareItems([]);
  };
  const runCompare = async () => {
    const items = wishlist.filter(w => compareSelection.has(w.id));
    if (items.length < 2) return;
    setCompareItems(items);
    setCompareMode(false);
    setCompareSelection(new Set());
    setCompareResult(null);
    setCompareLoading(true);
    try {
      const candidates: CompareCandidate[] = items.map(w => ({
        name: w.name,
        price: w.price,
        note: w.note || undefined,
        imageUrl: w.image_url,
      }));
      const instruction = `아래 후보들은 내가 살까 고민 중인 옷이야. 내 옷장과 스타일을 기준으로 "가성비(가격 대비 활용도)" 순위를 매겨줘.

현재 옷장:
${buildWardrobeSummary(allItems)}

${STYLE_CONTEXT}

판단 기준: 가격 대비 활용도. 옷장에 새 조합을 얼마나 만들어주는지, 비슷한 게 이미 있는지(중복), 스타일·색이 맞는지를 가격과 함께 저울질해. 비싼데 활용도 낮으면 순위가 낮고, 싼데 활용도 높으면 위. 셋 다 별로면 summary에 사지 말라고 적어. name은 내가 준 후보 이름을 그대로 써.

답변 형식 (JSON만, 다른 말 없이):
{"ranking": [{"rank": 1, "name": "후보 이름", "reason": "가성비 관점 한 줄 이유"}], "topPick": "1위 이름", "summary": "종합 한마디 (한국어 1-2문장)"}`;

      const res = await fetch("/api/compare", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidates, instruction }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const text = data.content?.map((c: { text?: string }) => c.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean) as CompareResult;
      setCompareResult(parsed);
    } catch (err) {
      console.error("Compare error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setCompareResult({ ranking: [], topPick: "", summary: `비교에 실패했어: ${msg}` });
    }
    setCompareLoading(false);
  };

  return {
    view, setView,
    comboSelections, setComboSelections,
    selectedSeason, setSelectedSeason,
    selectedMood, setSelectedMood,
    closetFilter, setClosetFilter,
    expandedCat, setExpandedCat,
    closetViewMode, setClosetViewMode,
    newWish, setNewWish, linkLoading, addWishFromLink,
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
    getItem, itemLabel, clothingItems, activeSeason, wearData,
    fetchData,
    generateCombosForItem, saveItem, deleteItem,
    handleItemImageUpload, handleImageUpload,
    analyzeOotd, saveOotdRecord, deleteOotdLog, saveOotdMemo, handleOotdPhotoUpload,
    addWish, saveWish, addWishStatus, removeWish, moveWishToCloset, judgeWish,
    analyzeBuyOrNot,
    compareMode, compareSelection, compareLoading, compareResult, compareItems,
    enterCompareMode, cancelCompare, toggleCompareSelect, runCompare, closeCompareResult,
  };
}
