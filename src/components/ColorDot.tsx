import { getColor } from "@/data/closet";

export function ColorDot({ color, size = 18 }: { color?: string; size?: number }) {
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
