import type { Season } from "@/data/closet";

export function getCurrentSeason(): Season {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  if (m >= 9 && m <= 11) return "fall";
  return "winter";
}

export const resizeImage = (dataUrl: string, maxSize: number): Promise<string> => {
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

export const LETGO_STATUSES: Record<string, { label: string; color: string }> = {
  undecided: { label: "미정", color: "#888" },
  decided: { label: "나눔 결정", color: "#C4952B" },
  giving: { label: "나눔 완료", color: "#4CAF50" },
  sold: { label: "판매 완료", color: "#6B2D3E" },
  disposed: { label: "정리 완료", color: "#555" },
};
