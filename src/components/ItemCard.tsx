import { TAG_COLORS, type ClothingItem } from "@/data/closet";
import { ColorDot } from "./ColorDot";

export function ItemCard({
  item, compact, onClick, selected, onRemove, imageUrl, onAddPhoto, onRemovePhoto, onEdit, wearCount, lastWorn,
}: {
  item: ClothingItem; compact?: boolean; onClick?: () => void; selected?: boolean; onRemove?: () => void;
  imageUrl?: string; onAddPhoto?: () => void; onRemovePhoto?: () => void; onEdit?: () => void;
  wearCount?: number; lastWorn?: string;
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
        {!compact && wearCount !== undefined && (
          <div style={{ fontSize: 10, color: lastWorn ? "#888" : "#C4952B", marginTop: 2 }}>
            {wearCount > 0 ? `${wearCount}회 착용${lastWorn ? ` · 마지막 ${lastWorn}` : ""}` : "아직 안 입음"}
          </div>
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
