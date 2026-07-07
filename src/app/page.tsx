"use client";

import { supabase } from "@/lib/db";
import { useAppState } from "./useAppState";
import { ItemEditModal } from "@/components/ItemEditModal";
import { WishEditModal } from "@/components/WishEditModal";
import { OotdTab } from "@/components/tabs/OotdTab";
import { ClosetTab } from "@/components/tabs/ClosetTab";
import { ComboTab } from "@/components/tabs/ComboTab";
import { MoodTab } from "@/components/tabs/MoodTab";
import { BuyOrNotTab } from "@/components/tabs/BuyOrNotTab";
import { WishlistTab } from "@/components/tabs/WishlistTab";
import { LetgoTab } from "@/components/tabs/LetgoTab";
import { UpdateBanner } from "@/components/UpdateBanner";
import { CompareModal } from "@/components/CompareModal";

export default function Home() {
  const app = useAppState();
  const {
    view, setView, loading, ootdLogs, setOotdStatsView,
    itemImageInputRef, handleItemImageUpload,
    editingItem, setEditingItem, addingItem, setAddingItem,
    saveItem, deleteItem, generateCombosForItem, customCats, fetchData,
    editingWish, setEditingWish, wishStatuses, saveWish, removeWish, addWishStatus, moveWishToCloset, judgeWish,
    compareResult, compareLoading, compareItems, closeCompareResult,
  } = app;

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontSize: 14 }}>로딩 중...</div>;

  const NAV = [
    { key: "ootd" as const, label: "OOTD", icon: "📸" },
    { key: "closet" as const, label: "옷장", icon: "◫" },
    { key: "combo" as const, label: "코디", icon: "◈" },
    { key: "mood" as const, label: "뭐?", icon: "☀" },
    { key: "buyornot" as const, label: "살/말", icon: "🤔" },
    { key: "wishlist" as const, label: "찜", icon: "★" },
    { key: "letgo" as const, label: "비움", icon: "↗" },
  ];

  return (
    <div style={{ minHeight: "100vh", maxWidth: 480, margin: "0 auto" }}>
      <UpdateBanner />
      <input ref={itemImageInputRef} type="file" accept="image/*" onChange={handleItemImageUpload} style={{ display: "none" }} />
      <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.5px", color: "#2A2A2A" }}>내<span style={{ color: "#6B2D3E" }}>옷</span> myot</h1>
        <p style={{ fontSize: 11, color: "#999", margin: "4px 0 0", letterSpacing: "2px", textTransform: "uppercase" }}>my only trend</p>
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
        {view === "ootd" && <OotdTab app={app} />}
        {view === "closet" && <ClosetTab app={app} />}
        {view === "combo" && <ComboTab app={app} />}
        {view === "mood" && <MoodTab app={app} />}
        {view === "buyornot" && <BuyOrNotTab app={app} />}
        {view === "wishlist" && <WishlistTab app={app} />}
        {view === "letgo" && <LetgoTab app={app} />}
      </div>

      {/* Edit / Add Item Modal */}
      {(editingItem || addingItem) && (
        <ItemEditModal
          item={editingItem}
          onSave={saveItem}
          onDelete={editingItem ? deleteItem : undefined}
          onClose={() => { setEditingItem(null); setAddingItem(false); }}
          onGenerateCombos={editingItem ? generateCombosForItem : undefined}
          customCats={customCats}
          onAddCat={async (key, label) => { await supabase.from("custom_categories").insert({ key, label }); fetchData(); }}
        />
      )}

      {/* Wish Edit Modal */}
      {editingWish && (
        <WishEditModal
          wish={editingWish}
          wishStatuses={wishStatuses}
          onClose={() => setEditingWish(null)}
          onSave={saveWish}
          onDelete={removeWish}
          onAddStatus={addWishStatus}
          onMoveToCloset={moveWishToCloset}
          onJudge={judgeWish}
        />
      )}

      {/* 가성비 비교 결과 모달 */}
      {(compareLoading || compareResult) && (
        <CompareModal
          result={compareResult}
          loading={compareLoading}
          items={compareItems}
          onClose={closeCompareResult}
        />
      )}
    </div>
  );
}
