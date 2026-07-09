import { CATEGORIES, type Season, type CategoryKey } from "@/data/closet";

// 찜 이름·메모의 옷 종류 키워드로 옷장 카테고리를 추정. 확실치 않으면 shortTees.
// (옷장으로 보낼 때 드롭다운에서 최종 확인·수정하므로 '그럴듯한 기본값'이면 충분)
const CAT_KEYWORDS: [string[], CategoryKey][] = [
  [["코트", "패딩", "다운", "파카", "무스탕"], "outerWinter"],
  [["블레이저", "자켓", "재킷", "바람막이", "점퍼", "야상", "아노락", "트렌치", "블루종"], "outerSpringFall"],
  [["가디건", "니트", "스웨터", "스웻", "맨투맨"], "knits"],
  [["후디", "후드"], "hoodies"],
  [["블라우스"], "blouses"],
  [["원피스", "드레스"], "dresses"],
  [["스커트", "치마"], "skirts"],
  [["폴로", "피케", "카라티"], "poloTees"],
  [["셔츠", "남방"], "shirts"],
  [["긴팔", "긴소매", "롱슬리브"], "longTees"],
  [["반팔", "반소매"], "shortTees"],
  [["청바지", "데님", "팬츠", "바지", "슬랙스", "조거", "트라우저", "반바지", "쇼츠", "카고", "치노"], "bottoms"],
  [["티셔츠", "라운드티", "티"], "shortTees"],
  [["신발", "슈즈", "스니커즈", "운동화", "구두", "로퍼", "부츠", "샌들", "슬리퍼"], "shoes"],
  [["백팩", "토트백", "크로스백", "숄더백", "파우치", "슬링", "가방"], "bags"],
  [["모자", "비니", "버킷", "캡"], "hats"],
  [["목걸이", "반지", "귀걸이", "팔찌", "주얼리"], "jewelry"],
  [["시계", "워치"], "watches"],
  [["머플러", "스카프", "목도리", "넥타이", "타이"], "scarves"],
  [["벨트", "양말", "장갑", "안경", "선글라스", "키링"], "accessories"],
];

export function guessCategory(text: string): CategoryKey {
  const t = text || "";
  // 1) 옷장 카테고리 한글 라벨이 그대로 들어있으면 그것
  for (const [k, label] of Object.entries(CATEGORIES)) if (t.includes(label)) return k as CategoryKey;
  // 2) 종류 키워드 매칭
  for (const [kws, cat] of CAT_KEYWORDS) if (kws.some(kw => t.includes(kw))) return cat;
  return "shortTees" as CategoryKey;
}

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
