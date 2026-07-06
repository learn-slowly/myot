import { NextRequest, NextResponse } from "next/server";

const PROMPT = `이미지들은 온라인 쇼핑몰(무신사·네이버·29cm·쿠팡 등)의 "주문내역" 캡처야. 각 주문 상품을 하나씩 추출해줘.

각 상품마다 다음을 뽑아:
- name: 상품명. 색상 옵션이 있으면 이름 끝에 대괄호로 붙여 (예: "베이식 피케 폴로 셔츠 [블랙]")
- brand: 브랜드명 (있으면, 없으면 null)
- color: 색상 옵션 (없으면 null)
- size: 사이즈 옵션 (없으면 null)
- price: 실제 결제 금액을 "숫자,단위원" 형태로 (예: "29,890원"). 취소선 그은 원가 말고 결제가.
- purchased_at: 구매확정일/주문일을 YYYY-MM-DD로 (화면의 날짜에서)
- category: 다음 중 가장 가까운 것으로 추론 [bottoms, shirts, poloTees, shortTees, longTees, knits, hoodies, outerWinter, outerSpringFall, outerSummer, shoes, bags, hats, scarves, accessories]. 애매하면 accessories.
- is_clothing: 옷/신발/가방 등 착용 아이템이면 true, 키링·폰케이스·상품권 같은 잡화면 false
- image_index: 이 상품이 몇 번째 이미지에 있는지 (0부터 시작하는 정수)
- box: 그 이미지 안에서 이 상품의 "썸네일 제품 사진"에만 딱 맞는 사각형. 각 주문 항목의 왼쪽에 있는 정사각형 제품 이미지야. 옆의 상품명 텍스트·가격·버튼·여백·다른 상품은 절대 포함하지 마 — 제품 사진의 네 변에 타이트하게. 이미지 좌상단 (0,0), 우하단 (1,1) 정규화 좌표로 {"x":좌상단x, "y":좌상단y, "w":너비, "h":높이}. 세로 위치를 특히 정확히 맞춰줘.

규칙:
- 취소·반품·배송비·적립 안내는 제외.
- 같은 상품의 다른 색상 옵션은 각각 별개 상품으로.
- 화면에 실제로 보이는 상품만. 추측 금지.

다른 말 없이 JSON 배열만 반환:
[{"name":"...","brand":null,"color":null,"size":null,"price":"...","purchased_at":"2026-01-01","category":"...","is_clothing":true,"image_index":0,"box":{"x":0.0,"y":0.0,"w":0.0,"h":0.0}}]`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your-api-key-here") {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  // images: [{ data: base64, mediaType }], text?: string
  const { images, text } = await req.json();
  if ((!Array.isArray(images) || !images.length) && !text) {
    return NextResponse.json({ error: "이미지나 텍스트가 필요해요" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any[] = [];
  if (Array.isArray(images)) {
    images.forEach((img: { data: string; mediaType: string }, i: number) => {
      content.push({ type: "text", text: `이미지 ${i}:` });
      content.push({ type: "image", source: { type: "base64", media_type: img.mediaType, data: img.data } });
    });
  }
  if (text) content.push({ type: "text", text: `추가 텍스트 주문내역:\n${text}` });
  content.push({ type: "text", text: PROMPT });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      messages: [{ role: "user", content }],
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: `Anthropic API error: ${response.status}` }, { status: response.status });
  }

  const data = await response.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = (data.content || []).map((c: any) => c.text || "").join("");
  const clean = raw.replace(/```json|```/g, "").trim();
  const match = clean.match(/\[[\s\S]*\]/);
  try {
    const items = JSON.parse(match ? match[0] : clean);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "파싱 결과를 읽지 못했어요", raw: clean.slice(0, 300) }, { status: 502 });
  }
}
