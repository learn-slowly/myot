export function Pill({ label, active, onClick, count }: { label: string; active: boolean; onClick: () => void; count?: number }) {
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
