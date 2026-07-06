"use client";

import { SEASONS, MOODS, type Season, type Mood } from "@/data/closet";
import { getCurrentSeason } from "@/lib/utils";
import type { App } from "@/app/useAppState";
import { ColorDot } from "@/components/ColorDot";
import { Pill } from "@/components/Pill";

export function MoodTab({ app }: { app: App }) {
  const {
    weather, weatherLoading, selectedSeason, setSelectedSeason,
    selectedMood, setSelectedMood, refreshKey, setRefreshKey,
    combos, ootdLogs, getItem,
  } = app;

  // 기온 → 시즌 자동 판단
  const weatherSeason: Season | null = weather ? (
    weather.temp >= 25 ? "summer" :
    weather.temp >= 15 ? (new Date().getMonth() < 6 ? "spring" : "fall") :
    "winter"
  ) : null;
  const moodSeason = selectedSeason || weatherSeason || getCurrentSeason();
  const isRainy = weather && (weather.desc.includes("비") || weather.desc.includes("소나기") || weather.desc.includes("뇌우") || weather.desc.includes("이슬비"));

  const filtered = combos.filter(c => c.season.includes(moodSeason) && (!selectedMood || c.mood.includes(selectedMood)));

  // 비 오면 비 관련 신발 우선 정렬
  const sorted = [...filtered];
  if (isRainy) {
    sorted.sort((a, b) => {
      const aRain = a.shoes.some(s => { const item = getItem(s); return item?.note?.includes("비") || item?.name?.includes("장화"); });
      const bRain = b.shoes.some(s => { const item = getItem(s); return item?.note?.includes("비") || item?.name?.includes("장화"); });
      return (bRain ? 1 : 0) - (aRain ? 1 : 0);
    });
  }

  // 최근 안 입은 옷 우선
  const recentItems = new Set(ootdLogs.slice(0, 5).flatMap(l => l.items));
  sorted.sort((a, b) => {
    const aRecent = [a.bottom, ...a.tops].filter(id => recentItems.has(id)).length;
    const bRecent = [b.bottom, ...b.tops].filter(id => recentItems.has(id)).length;
    return aRecent - bRecent;
  });

  const shuffled = sorted.slice(0, 3);

  return (
    <div key={refreshKey}>
      {/* 날씨 카드 */}
      {weather && (
        <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: 14, padding: "16px 20px", marginBottom: 16, border: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 36 }}>{weather.icon}</span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#2A2A2A" }}>{weather.temp}°C</div>
            <div style={{ fontSize: 12, color: "#888" }}>{weather.desc} · {SEASONS[moodSeason]} 옷차림 추천</div>
          </div>
        </div>
      )}
      {weatherLoading && <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>날씨 확인 중...</div>}

      <div style={{ fontSize: 13, fontWeight: 600, color: "#2A2A2A", marginBottom: 10 }}>오늘 기분은?</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {Object.entries(MOODS).map(([k, v]) => <button key={k} onClick={() => { setSelectedMood(selectedMood === k ? null : k as Mood); setRefreshKey(r => r + 1); }} style={{ padding: "10px 20px", borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "inherit", background: selectedMood === k ? "#2A2A2A" : "rgba(255,255,255,0.7)", color: selectedMood === k ? "#F5F0E1" : "#555", fontWeight: 500, fontSize: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", transition: "all 0.2s" }}>{v}</button>)}
      </div>

      {/* 시즌 수동 오버라이드 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "#888", marginRight: 4 }}>시즌:</span>
        {Object.entries(SEASONS).map(([k, v]) => <Pill key={k} label={v} active={moodSeason === k} onClick={() => { setSelectedSeason(k as Season); setRefreshKey(r => r + 1); }} />)}
        {selectedSeason && <button onClick={() => { setSelectedSeason(null); setRefreshKey(r => r + 1); }} style={{ fontSize: 11, color: "#888", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit" }}>자동으로</button>}
      </div>

      <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>
        {SEASONS[moodSeason]} · {selectedMood ? MOODS[selectedMood] : "전체"} — {filtered.length}개 조합
        {isRainy && <span style={{ marginLeft: 6, color: "#5A7BA0" }}>🌧 비 오는 날 추천</span>}
      </div>

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
}
