"use client";

import { CATEGORIES } from "@/data/closet";
import type { App } from "@/app/useAppState";
import { ColorDot } from "@/components/ColorDot";
import { ItemCard } from "@/components/ItemCard";

export function OotdTab({ app }: { app: App }) {
  const {
    ootdLogs, clothingItems, getItem, allItems, customCats,
    ootdStatsView, setOotdStatsView,
    ootdPhotoInputRef, handleOotdPhotoUpload, setOotdPhotoTargetId, ootdPhotoUploading,
    deleteOotdLog, editingMemoId, setEditingMemoId, editingMemoText, setEditingMemoText, saveOotdMemo,
    fileInputRef, handleImageUpload,
    ootdImage, setOotdImage, ootdResult, setOotdResult, analyzeOotd, ootdAnalyzing,
    ootdAddPicker, setOotdAddPicker, ootdSearchQuery, setOotdSearchQuery,
    ootdDate, setOotdDate, ootdMemo, setOotdMemo, saveOotdRecord, ootdSaving,
  } = app;

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
        <input ref={ootdPhotoInputRef} type="file" accept="image/*" onChange={handleOotdPhotoUpload} style={{ display: "none" }} />
        {ootdLogs.map(log => (
          <div key={log.id} style={{ background: "rgba(255,255,255,0.7)", borderRadius: 12, padding: "12px 16px", marginBottom: 8, border: "1px solid rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#6B2D3E" }}>{log.date}</span>
              <button onClick={() => deleteOotdLog(log.id)} style={{ border: "none", background: "transparent", color: "#CCC", cursor: "pointer", fontSize: 14 }}>✕</button>
            </div>
            {log.image_url ? (
              <div style={{ borderRadius: 10, overflow: "hidden", marginBottom: 8 }}>
                <img src={log.image_url} alt={`OOTD ${log.date}`} style={{ width: "100%", maxHeight: 280, objectFit: "cover", display: "block" }} />
              </div>
            ) : (
              <button onClick={() => { setOotdPhotoTargetId(log.id); ootdPhotoInputRef.current?.click(); }} disabled={ootdPhotoUploading === log.id} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, border: "1px dashed rgba(0,0,0,0.12)", background: "transparent", color: "#aaa", cursor: "pointer", fontFamily: "inherit", marginBottom: 8 }}>
                {ootdPhotoUploading === log.id ? "업로드 중..." : "+ 사진"}
              </button>
            )}
            <div style={{ fontSize: 12, color: "#555", marginBottom: 6, lineHeight: 1.5 }}>{log.description}</div>
            {editingMemoId === log.id ? (
              <div style={{ marginBottom: 6 }}>
                <textarea value={editingMemoText} onChange={e => setEditingMemoText(e.target.value)} rows={2} autoFocus style={{ width: "100%", padding: "6px 10px", borderRadius: 8, border: "1.5px solid rgba(107,45,62,0.2)", fontSize: 11, fontFamily: "inherit", background: "rgba(255,255,255,0.7)", outline: "none", boxSizing: "border-box", resize: "vertical" }} />
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  <button onClick={() => saveOotdMemo(log.id, editingMemoText)} style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "none", background: "#6B2D3E", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>저장</button>
                  <button onClick={() => setEditingMemoId(null)} style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.1)", background: "transparent", color: "#888", cursor: "pointer", fontFamily: "inherit" }}>취소</button>
                </div>
              </div>
            ) : log.memo ? (
              <div onClick={() => { setEditingMemoId(log.id); setEditingMemoText(log.memo || ""); }} style={{ fontSize: 11, color: "#888", marginBottom: 6, fontStyle: "italic", lineHeight: 1.5, cursor: "pointer" }}>{log.memo}</div>
            ) : (
              <button onClick={() => { setEditingMemoId(log.id); setEditingMemoText(""); }} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, border: "1px dashed rgba(0,0,0,0.12)", background: "transparent", color: "#aaa", cursor: "pointer", fontFamily: "inherit", marginBottom: 6 }}>+ 메모</button>
            )}
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
                    return i.name.toLowerCase().includes(q) || (i.brand || "").toLowerCase().includes(q) || (i.color || "").toLowerCase().includes(q) || (CATEGORIES[i.cat] || customCats[i.cat] || i.cat).includes(q);
                  }).map(item => (
                    <ItemCard key={item.id} item={item} compact onClick={() => setOotdResult({ ...ootdResult, items: [...ootdResult.items, item.id] })} />
                  ))}
                </div>
                <button onClick={() => { setOotdAddPicker(false); setOotdSearchQuery(""); }} style={{ marginTop: 8, width: "100%", padding: 8, borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)", background: "transparent", cursor: "pointer", fontSize: 12, fontFamily: "inherit", color: "#888" }}>닫기</button>
              </div>
            ) : (
              <button onClick={() => setOotdAddPicker(true)} style={{ width: "100%", padding: 8, borderRadius: 8, border: "1.5px dashed rgba(0,0,0,0.12)", background: "transparent", cursor: "pointer", fontSize: 12, fontFamily: "inherit", color: "#888", marginBottom: 12 }}>+ 아이템 추가/수정</button>
            )}
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input type="date" value={ootdDate} onChange={e => setOotdDate(e.target.value)} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1.5px solid rgba(0,0,0,0.1)", fontSize: 12, fontFamily: "inherit", background: "rgba(255,255,255,0.7)", outline: "none", boxSizing: "border-box" }} />
            </div>
            <textarea value={ootdMemo} onChange={e => setOotdMemo(e.target.value)} placeholder="메모 (선택) — 어디 가는 길, 느낀 점 등" rows={2} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid rgba(0,0,0,0.1)", fontSize: 12, fontFamily: "inherit", background: "rgba(255,255,255,0.7)", outline: "none", marginBottom: 10, boxSizing: "border-box", resize: "vertical" }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setOotdImage(null); setOotdResult(null); setOotdAddPicker(false); setOotdMemo(""); setOotdDate(new Date().toISOString().split("T")[0]); }} style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)", background: "transparent", cursor: "pointer", fontSize: 12, fontFamily: "inherit", color: "#888" }}>취소</button>
              <button onClick={saveOotdRecord} disabled={ootdSaving || ootdResult.items.length === 0} style={{ flex: 2, padding: 10, borderRadius: 10, border: "none", background: ootdSaving ? "#B0A090" : "#6B2D3E", color: "#fff", cursor: ootdSaving ? "default" : "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>{ootdSaving ? "AI 코멘트 생성 중..." : "오늘 착장 저장하기"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
