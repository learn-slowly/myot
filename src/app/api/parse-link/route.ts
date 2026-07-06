import { NextRequest, NextResponse } from "next/server";

// 데스크탑 크롬 UA — 대부분의 쇼핑몰이 OG/JSON-LD를 서버 응답에 포함
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function fmtPrice(v: unknown): string | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseInt(String(v).replace(/[^0-9]/g, ""), 10);
  if (!n || isNaN(n)) return null;
  return n.toLocaleString("ko-KR") + "원";
}

function decodeEntities(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d));
}

function cleanName(t?: string | null): string | null {
  if (!t) return null;
  let s = decodeEntities(t.trim());
  s = s.replace(/\s*[|\-:·–]\s*(무신사|MUSINSA|29CM|29cm|네이버\s*쇼핑|스마트스토어|SSF몰|W\s?컨셉|WCONCEPT|쿠팡!?|SSG\.COM|지그재그|에이블리).*$/i, "");  // 사이트명 꼬리 먼저
  s = s.replace(/\s*[-–—|]\s*사이즈\s*&?\s*후기\s*$/i, "");                   // 무신사 " - 사이즈 & 후기" 꼬리
  return s.trim() || decodeEntities(t.trim());
}

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "링크(URL)가 필요해요" }, { status: 400 });
  }

  let html: string;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9", Accept: "text/html" },
      redirect: "follow", signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return NextResponse.json({ error: `상품 페이지를 불러오지 못했어요 (${res.status})` }, { status: 502 });
    html = await res.text();
  } catch {
    return NextResponse.json({ error: "상품 페이지를 불러오지 못했어요" }, { status: 502 });
  }

  let name: string | null = null, price: string | null = null, image: string | null = null;

  // 1) JSON-LD Product (이름·이미지·가격이 구조화돼 가장 정확)
  const lds = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of lds) {
    try {
      const json = JSON.parse(m[1].trim());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nodes: any[] = Array.isArray(json) ? json : json["@graph"] ? json["@graph"] : [json];
      for (const node of nodes) {
        const type = node?.["@type"];
        const isProduct = type === "Product" || (Array.isArray(type) && type.includes("Product"));
        if (!isProduct) continue;
        name = name || node.name || null;
        const img = node.image;
        image = image || (Array.isArray(img) ? img[0] : (img && typeof img === "object" ? img.url : img)) || null;
        const offers = Array.isArray(node.offers) ? node.offers[0] : node.offers;
        if (offers) price = price || fmtPrice(offers.price ?? offers.lowPrice ?? offers.highPrice);
      }
    } catch { /* 잘못된 ld+json 무시 */ }
  }

  // 2) OG / meta 태그 폴백
  const meta = (prop: string) =>
    html.match(new RegExp(`<meta[^>]*(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`, "i"))?.[1]
    || html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, "i"))?.[1]
    || null;
  if (!name) name = meta("og:title");
  if (!image) image = meta("og:image");
  if (!price) price = fmtPrice(meta("product:price:amount") || meta("og:price:amount"));
  if (!name) name = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || null;

  name = cleanName(name);
  if (image && image.startsWith("//")) image = "https:" + image;
  if (image && image.startsWith("/")) { try { image = new URL(image, url).href; } catch { /* keep */ } }

  if (!name && !image) {
    return NextResponse.json({ error: "상품 정보를 찾지 못했어요 (페이지 형식에 따라 안 될 수 있어요)" }, { status: 422 });
  }
  return NextResponse.json({ name: name || "(이름 없음)", price, image_url: image || null, link: url });
}
