import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } },
};

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your-api-key-here") {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  const { image, mediaType, prompt, imageUrl } = await req.json();

  // imageUrl이 오면 서버가 대신 가져와 정규화 (외부 쇼핑몰 이미지는 브라우저에서
  // CORS로 fetch/canvas가 막히므로 — 링크로 담은 찜 사진 살/말 판단 지원)
  let imgData = image, imgType = mediaType;
  if (imageUrl && !image) {
    try {
      const r = await fetch(imageUrl, { headers: { "User-Agent": UA }, redirect: "follow", signal: AbortSignal.timeout(12000) });
      if (!r.ok) return NextResponse.json({ error: `이미지를 불러오지 못했어요 (${r.status})` }, { status: 502 });
      const resized = await sharp(Buffer.from(await r.arrayBuffer())).resize(1024, 1024, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
      imgData = resized.toString("base64");
      imgType = "image/jpeg";
    } catch {
      return NextResponse.json({ error: "이미지를 불러오지 못했어요" }, { status: 502 });
    }
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      // 옷장 ~100벌 대조 매칭이라 사고가 정확도에 크게 기여 — adaptive 유지,
      // 사고 토큰이 max_tokens를 잠식하므로 여유 있게
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: imgType, data: imgData },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json(
      { error: `Anthropic API error: ${response.status}` },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}
