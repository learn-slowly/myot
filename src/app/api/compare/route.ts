import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import type { CompareCandidate } from "@/types";

export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } },
};

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// 후보 이미지 URL을 서버가 대신 fetch·리사이즈 (외부 쇼핑몰 CORS 회피). 실패 시 null.
async function fetchImage(url: string): Promise<{ data: string; type: string } | null> {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow", signal: AbortSignal.timeout(12000) });
    if (!r.ok) return null;
    const resized = await sharp(Buffer.from(await r.arrayBuffer()))
      .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    return { data: resized.toString("base64"), type: "image/jpeg" };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your-api-key-here") {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  let candidates: CompareCandidate[];
  let instruction: string;
  try {
    const body = (await req.json()) as { candidates: CompareCandidate[]; instruction: string };
    candidates = body.candidates;
    instruction = body.instruction;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식" }, { status: 400 });
  }
  if (!Array.isArray(candidates) || candidates.length < 2) {
    return NextResponse.json({ error: "후보가 2개 이상 필요해요" }, { status: 400 });
  }

  // 후보별 이미지 병렬 fetch
  const images = await Promise.all(
    candidates.map(c => (c.imageUrl ? fetchImage(c.imageUrl) : Promise.resolve(null)))
  );

  // 멀티이미지 메시지 조립: 후보마다 [라벨] + [이미지(있으면)], 마지막에 지시문
  const content: Array<Record<string, unknown>> = [];
  candidates.forEach((c, i) => {
    const priceStr = c.price ? `가격 ${c.price}` : "가격 미입력";
    const noteStr = c.note ? ` / 메모: ${c.note}` : "";
    const img = images[i];
    content.push({
      type: "text",
      text: `후보 ${i + 1}: ${c.name} / ${priceStr}${noteStr}${img ? "" : " (사진 없음)"}`,
    });
    if (img) {
      content.push({ type: "image", source: { type: "base64", media_type: img.type, data: img.data } });
    }
  });
  content.push({ type: "text", text: instruction });

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 4000,
        thinking: { type: "adaptive" },
        messages: [{ role: "user", content }],
      }),
      signal: AbortSignal.timeout(60000),
    });
  } catch {
    return NextResponse.json({ error: "AI 비교 요청에 실패했어요 (네트워크)" }, { status: 502 });
  }

  if (!response.ok) {
    return NextResponse.json({ error: `Anthropic API error: ${response.status}` }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
