"use client";

import { CATEGORIES, SEASONS, TAG_COLORS, type Season, type ClothingItem } from "@/data/closet";
import { supabase } from "@/lib/db";
import type { App } from "@/app/useAppState";
import { ItemCard } from "@/components/ItemCard";
import { Markdown } from "@/components/Markdown";
import { Pill } from "@/components/Pill";

function ClosetStats({ app }: { app: App }) {
  const {
    allItems, customCats, wearData,
    statsSeason, setStatsSeason, statsYear, setStatsYear,
    styleAnalysis, setStyleAnalysis, analyzingStyle, setAnalyzingStyle,
  } = app;

  const now = new Date();

  // 시즌별 필터
  const seasonStartMonth: Record<Season, number> = { spring: 3, summer: 6, fall: 9, winter: 12 };
  const seasonEndMonth: Record<Season, number> = { spring: 5, summer: 8, fall: 11, winter: 2 };
  const [selYear, selSeason] = statsSeason.split("-") as [string, Season];
  const sYear = parseInt(selYear);
  const sStart = new Date(selSeason === "winter" ? sYear : sYear, seasonStartMonth[selSeason] - 1, 1);
  const sEndMonth = seasonEndMonth[selSeason];
  const sEnd = new Date(selSeason === "winter" ? sYear + 1 : sYear, sEndMonth, 0, 23, 59, 59);

  const seasonNew = allItems.filter(i => {
    if (!i.purchased_at) return false;
    const d = new Date(i.purchased_at);
    return d >= sStart && d <= sEnd;
  });
  const yearNew = allItems.filter(i => i.purchased_at && i.purchased_at.startsWith(String(statsYear)));

  // 선택 가능한 시즌/연도 목록 생성
  const years = [...new Set(allItems.filter(i => i.purchased_at).map(i => parseInt(i.purchased_at!.slice(0, 4))))];
  if (!years.includes(now.getFullYear())) years.push(now.getFullYear());
  years.sort((a, b) => b - a);

  const seasonOptions: { value: string; label: string }[] = [];
  years.forEach(y => {
    (["spring", "summer", "fall", "winter"] as Season[]).forEach(s => {
      seasonOptions.push({ value: `${y}-${s}`, label: `${y} ${SEASONS[s]}` });
    });
  });

  const byAcquired: Record<string, number> = {};
  allItems.forEach(i => {
    const via = i.acquired_via === "new" ? "새옷 구매" : i.acquired_via === "gift" ? "선물" : i.acquired_via === "used" ? "중고구매" : "미입력";
    byAcquired[via] = (byAcquired[via] || 0) + 1;
  });

  const allCats = { ...CATEGORIES, ...customCats };
  const byCat: Record<string, number> = {};
  allItems.forEach(i => { const label = allCats[i.cat] || i.cat; byCat[label] = (byCat[label] || 0) + 1; });
  const topCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const statBox = { background: "rgba(255,255,255,0.7)", borderRadius: 12, padding: "12px 16px", border: "1px solid rgba(0,0,0,0.06)" } as const;
  const statNum = { fontSize: 22, fontWeight: 700, color: "#6B2D3E" } as const;
  const statLabel = { fontSize: 11, color: "#888", marginTop: 2 } as const;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ ...statBox, marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
          <select value={statsSeason} onChange={e => setStatsSeason(e.target.value)} style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.1)", fontSize: 12, fontFamily: "inherit", background: "rgba(255,255,255,0.7)" }}>
            {seasonOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={statsYear} onChange={e => setStatsYear(parseInt(e.target.value))} style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.1)", fontSize: 12, fontFamily: "inherit", background: "rgba(255,255,255,0.7)" }}>
            {years.map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={statNum}>{allItems.length}</div>
            <div style={statLabel}>전체</div>
          </div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={statNum}>{seasonNew.length}</div>
            <div style={statLabel}>{selYear} {SEASONS[selSeason]} 신규</div>
          </div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={statNum}>{yearNew.length}</div>
            <div style={statLabel}>{statsYear}년 신규</div>
          </div>
        </div>
      </div>

      <div style={{ ...statBox, marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#2A2A2A", marginBottom: 8 }}>카테고리별</div>
        {topCats.map(([cat, count]) => (
          <div key={cat} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: "#555", flex: 1 }}>{cat}</span>
            <div style={{ flex: 2, height: 6, borderRadius: 3, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
              <div style={{ width: `${(count / allItems.length) * 100}%`, height: "100%", borderRadius: 3, background: "#6B2D3E" }} />
            </div>
            <span style={{ fontSize: 11, color: "#888", minWidth: 24, textAlign: "right" }}>{count}</span>
          </div>
        ))}
      </div>

      <div style={{ ...statBox, marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#2A2A2A", marginBottom: 6 }}>입수 경로</div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {Object.entries(byAcquired).map(([via, count]) => (
            <span key={via} style={{ fontSize: 12, color: "#555" }}>{via} <strong style={{ color: "#6B2D3E" }}>{count}</strong></span>
          ))}
        </div>
      </div>

      {(() => {
        const neverWorn = allItems.filter(i => !wearData.counts[i.id]);
        const mostWorn = allItems.filter(i => wearData.counts[i.id]).sort((a, b) => (wearData.counts[b.id] || 0) - (wearData.counts[a.id] || 0)).slice(0, 5);
        const longUnworn = allItems.filter(i => {
          const last = wearData.lastDates[i.id];
          if (!last) return false;
          return (now.getTime() - new Date(last).getTime()) / (1000 * 60 * 60 * 24) > 60;
        }).sort((a, b) => (wearData.lastDates[a.id] || "").localeCompare(wearData.lastDates[b.id] || ""));

        return <>
          {mostWorn.length > 0 && (
            <div style={{ ...statBox, marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#2A2A2A", marginBottom: 6 }}>자주 입는 옷 TOP 5</div>
              {mostWorn.map(i => (
                <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "#555", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.name}</span>
                  <div style={{ flex: 1.5, height: 6, borderRadius: 3, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                    <div style={{ width: `${(wearData.counts[i.id] / (wearData.counts[mostWorn[0].id] || 1)) * 100}%`, height: "100%", borderRadius: 3, background: "#6B2D3E" }} />
                  </div>
                  <span style={{ fontSize: 11, color: "#888", minWidth: 30, textAlign: "right" }}>{wearData.counts[i.id]}회</span>
                </div>
              ))}
            </div>
          )}

          {longUnworn.length > 0 && (
            <div style={{ ...statBox, marginBottom: 8, borderColor: "rgba(196,149,43,0.3)" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#C4952B", marginBottom: 6 }}>60일 넘게 안 입은 옷</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {longUnworn.map(i => {
                  const days = Math.floor((now.getTime() - new Date(wearData.lastDates[i.id]).getTime()) / (1000 * 60 * 60 * 24));
                  return <span key={i.id} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 16, background: "rgba(196,149,43,0.1)", color: "#C4952B" }}>{i.name} ({days}일)</span>;
                })}
              </div>
            </div>
          )}

          {neverWorn.length > 0 && (
            <div style={{ ...statBox, borderColor: "rgba(0,0,0,0.1)" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 6 }}>아직 안 입은 옷 ({neverWorn.length})</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {neverWorn.slice(0, 15).map(i => <span key={i.id} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 16, background: "rgba(0,0,0,0.04)", color: "#888" }}>{i.name}</span>)}
                {neverWorn.length > 15 && <span style={{ fontSize: 10, color: "#aaa" }}>+{neverWorn.length - 15}개</span>}
              </div>
            </div>
          )}
        </>;
      })()}

      {/* 스타일 분석 */}
      {(() => {
        const tagCounts: Record<string, number> = {};
        allItems.forEach(i => i.tags.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
        const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
        const total = Object.values(tagCounts).reduce((a, b) => a + b, 0);

        return (
          <div style={{ ...statBox, marginTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#2A2A2A", marginBottom: 8 }}>내 스타일 분석</div>
            {sorted.length > 0 ? (
              <>
                <div style={{ marginBottom: 10 }}>
                  {sorted.map(([tag, count]) => (
                    <div key={tag} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: TAG_COLORS[tag] || "#888", fontWeight: 600, minWidth: 56 }}>{tag}</span>
                      <div style={{ flex: 1, height: 8, borderRadius: 4, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                        <div style={{ width: `${(count / (sorted[0][1])) * 100}%`, height: "100%", borderRadius: 4, background: TAG_COLORS[tag] || "#888" }} />
                      </div>
                      <span style={{ fontSize: 11, color: "#888", minWidth: 40, textAlign: "right" }}>{Math.round((count / total) * 100)}%</span>
                    </div>
                  ))}
                </div>
                <button onClick={async () => {
                  setAnalyzingStyle(true);
                  try {
                    const itemSummary = allItems.map(i => `${i.name}${i.brand ? ` [${i.brand}]` : ""}${i.color ? ` (${i.color})` : ""} — ${({ ...CATEGORIES, ...customCats })[i.cat] || i.cat}${i.tags.length ? ` #${i.tags.join(" #")}` : ""}`).join("\n");
                    const tagSummary = sorted.map(([t, c]) => `${t}: ${c}개 (${Math.round((c / total) * 100)}%)`).join(", ");
                    const brandCounts: Record<string, number> = {};
                    allItems.forEach(i => { if (i.brand) brandCounts[i.brand] = (brandCounts[i.brand] || 0) + 1; });
                    const topBrands = Object.entries(brandCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([b, c]) => `${b}(${c})`).join(", ");
                    const colorCounts: Record<string, number> = {};
                    allItems.forEach(i => { if (i.color) colorCounts[i.color] = (colorCounts[i.color] || 0) + 1; });
                    const topColors = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c, n]) => `${c}(${n})`).join(", ");

                    const res = await fetch("/api/analyze-text", {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ prompt: `옷장 아이템 ${allItems.length}개를 분석해서 이 사람의 패션 스타일을 진단해줘.

스타일 태그 분포: ${tagSummary}
주요 브랜드: ${topBrands || "없음"}
주요 색상: ${topColors || "없음"}

전체 아이템:
${itemSummary}

다음 형식으로 한국어 답변해줘:
1. 메인 스타일 (1-2개, 예: 워크웨어 캐주얼)
2. 스타일 성향 요약 (2-3문장)
3. 옷장의 강점과 보완할 점 (각 1-2줄)
4. 추천 아이템 (2-3개, 현재 옷장에 없는 것)

답변만 써줘.` }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setStyleAnalysis(data.content?.map((c: { text?: string }) => c.text || "").join("") || "분석 실패");
                    }
                  } catch { setStyleAnalysis("분석 중 오류 발생"); }
                  setAnalyzingStyle(false);
                }} disabled={analyzingStyle} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1.5px dashed rgba(107,45,62,0.2)", background: analyzingStyle ? "rgba(107,45,62,0.08)" : "rgba(107,45,62,0.03)", cursor: analyzingStyle ? "default" : "pointer", fontSize: 12, fontFamily: "inherit", color: "#6B2D3E", fontWeight: 500 }}>
                  {analyzingStyle ? "AI 분석 중..." : "AI로 내 스타일 분석하기"}
                </button>
                {styleAnalysis && (
                  <div style={{ marginTop: 10, padding: 12, borderRadius: 10, background: "rgba(107,45,62,0.04)", border: "1px solid rgba(107,45,62,0.1)", fontSize: 12, color: "#555" }}>
                    <Markdown text={styleAnalysis} />
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 12, color: "#888" }}>아이템에 스타일 태그를 추가하면 분석할 수 있어</div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

export function ClosetTab({ app }: { app: App }) {
  const {
    allItems, customCats, wearData, fetchData,
    imageUploading, generatingCombos,
    showClosetStats, setShowClosetStats,
    closetFilter, setClosetFilter, closetViewMode, setClosetViewMode,
    expandedCat, setExpandedCat,
    setEditingItem, setAddingItem, setImageTargetId, itemImageInputRef,
  } = app;

  return (
    <div>
      {imageUploading && <div style={{ padding: "8px 16px", marginBottom: 12, borderRadius: 10, background: "rgba(196,149,43,0.1)", border: "1px solid rgba(196,149,43,0.2)", fontSize: 12, color: "#C4952B", textAlign: "center" }}>사진 업로드 중...</div>}
      {generatingCombos && <div style={{ padding: "8px 16px", marginBottom: 12, borderRadius: 10, background: "rgba(107,45,62,0.08)", border: "1px solid rgba(107,45,62,0.15)", fontSize: 12, color: "#6B2D3E", textAlign: "center" }}>AI가 새 아이템으로 코디 조합 만드는 중...</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button onClick={() => setShowClosetStats(!showClosetStats)} style={{ fontSize: 12, color: "#6B2D3E", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>{showClosetStats ? "통계 접기 ▲" : "옷장 통계 ▼"}</button>
      </div>
      {showClosetStats && <ClosetStats app={app} />}
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <Pill label="전체" active={closetFilter === "all"} onClick={() => setClosetFilter("all")} />
        {Object.entries(SEASONS).map(([k, v]) => <Pill key={k} label={v} active={closetFilter === k} onClick={() => setClosetFilter(k as Season)} count={allItems.filter(i => i.season?.includes(k as Season)).length} />)}
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        <button onClick={() => setClosetViewMode("category")} style={{ padding: "5px 12px", borderRadius: 6, border: "none", fontSize: 11, fontFamily: "inherit", cursor: "pointer", background: closetViewMode === "category" ? "#2A2A2A" : "rgba(0,0,0,0.06)", color: closetViewMode === "category" ? "#F5F0E1" : "#888", fontWeight: 500 }}>종류별</button>
        <button onClick={() => setClosetViewMode("date")} style={{ padding: "5px 12px", borderRadius: 6, border: "none", fontSize: 11, fontFamily: "inherit", cursor: "pointer", background: closetViewMode === "date" ? "#2A2A2A" : "rgba(0,0,0,0.06)", color: closetViewMode === "date" ? "#F5F0E1" : "#888", fontWeight: 500 }}>입고순</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {closetViewMode === "category" ? (
          Object.entries({ ...CATEGORIES, ...customCats }).map(([ck, catLabel]) => {
            let items = allItems.filter(i => i.cat === ck);
            if (closetFilter !== "all") items = items.filter(i => !i.season || i.season.includes(closetFilter));
            if (!items.length) return null;
            const isOpen = expandedCat === ck;
            return (
              <div key={ck} style={{ background: "rgba(255,255,255,0.5)", borderRadius: 14, border: "1px solid rgba(0,0,0,0.06)", overflow: "hidden" }}>
                <button onClick={() => setExpandedCat(isOpen ? null : ck)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 18px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit" }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#2A2A2A" }}>{catLabel}</span>
                  <span style={{ fontSize: 12, color: "#888" }}>{items.length}개 {isOpen ? "▲" : "▼"}</span>
                </button>
                {isOpen && <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {items.map(i => <ItemCard key={i.id} item={i} imageUrl={i.image_url} onEdit={() => setEditingItem(i)} onAddPhoto={() => { setImageTargetId(i.id); itemImageInputRef.current?.click(); }} onRemovePhoto={() => { supabase.from("clothing_items").update({ image_url: null }).eq("id", i.id).then(() => fetchData()); }} wearCount={wearData.counts[i.id] || 0} lastWorn={wearData.lastDates[i.id]} />)}
                </div>}
              </div>
            );
          })
        ) : (() => {
          let filtered = [...allItems];
          if (closetFilter !== "all") filtered = filtered.filter(i => !i.season || i.season.includes(closetFilter));
          const grouped: Record<string, ClothingItem[]> = {};
          filtered.forEach(i => {
            const key = i.purchased_at ? i.purchased_at.slice(0, 7) : "미입력";
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(i);
          });
          const sortedKeys = Object.keys(grouped).sort((a, b) => a === "미입력" ? 1 : b === "미입력" ? -1 : b.localeCompare(a));
          return sortedKeys.map(key => {
            const items = grouped[key];
            const label = key === "미입력" ? "날짜 미입력" : `${key.replace("-", "년 ")}월`;
            const isOpen = expandedCat === key;
            return (
              <div key={key} style={{ background: "rgba(255,255,255,0.5)", borderRadius: 14, border: "1px solid rgba(0,0,0,0.06)", overflow: "hidden" }}>
                <button onClick={() => setExpandedCat(isOpen ? null : key)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 18px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit" }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#2A2A2A" }}>{label}</span>
                  <span style={{ fontSize: 12, color: "#888" }}>{items.length}개 {isOpen ? "▲" : "▼"}</span>
                </button>
                {isOpen && <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {items.sort((a, b) => (b.purchased_at || "").localeCompare(a.purchased_at || "")).map(i => <ItemCard key={i.id} item={i} imageUrl={i.image_url} onEdit={() => setEditingItem(i)} onAddPhoto={() => { setImageTargetId(i.id); itemImageInputRef.current?.click(); }} onRemovePhoto={() => { supabase.from("clothing_items").update({ image_url: null }).eq("id", i.id).then(() => fetchData()); }} wearCount={wearData.counts[i.id] || 0} lastWorn={wearData.lastDates[i.id]} />)}
                </div>}
              </div>
            );
          });
        })()}
      </div>
      <button onClick={() => setAddingItem(true)} style={{ width: "100%", marginTop: 16, padding: 14, borderRadius: 14, border: "2px dashed rgba(107,45,62,0.2)", background: "rgba(107,45,62,0.03)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 500, color: "#6B2D3E" }}>+ 새 아이템 추가</button>
    </div>
  );
}
