import { CATEGORIES, SEASONS, type ClothingItem } from "@/data/closet";

// 살/말 단건 판단과 여러 개 비교가 같은 스타일 기준을 공유한다.
export const STYLE_CONTEXT = `스타일 축: 워크웨어, 아이비/프레피, 힙합 캐주얼
퍼스널컬러: 웜톤 가을(Autumn) — 어스톤 컬러(브라운, 카키, 샌드베이지, 머스터드)
개인 원칙: 빼입기 선호, 안 입는 옷 사지 않기, 모자 안 씀, 노란색은 어렵다(머스터드가 한계)`;

// 옷장 아이템을 프롬프트용 한 줄 요약 목록으로 만든다 (잡화 제외).
export function buildWardrobeSummary(items: ClothingItem[]): string {
  return items
    .filter(i => i.cat !== "accessories")
    .map(i =>
      `${i.name}${i.color ? ` (${i.color})` : ""}${i.brand ? ` [${i.brand}]` : ""} — ${CATEGORIES[i.cat]}${i.season ? ` [${i.season.map(s => SEASONS[s]).join("/")}]` : ""}`
    )
    .join("\n");
}
