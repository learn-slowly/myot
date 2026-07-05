import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import sharp from "sharp";

export async function POST(req: NextRequest) {
  // OIDC 방식(신규 기본)은 BLOB_STORE_ID만, 구방식은 BLOB_READ_WRITE_TOKEN이 존재
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    return NextResponse.json(
      { error: "Blob storage not configured" },
      { status: 500 }
    );
  }

  const { image } = await req.json();
  const match = /^data:image\/[a-z+.-]+;base64,(.+)$/i.exec(image ?? "");
  if (!match) {
    return NextResponse.json(
      { error: "expected data URL image" },
      { status: 400 }
    );
  }

  try {
    // Cloudinary 시절의 c_limit,w_600 변환과 동일한 축소를 서버에서 수행
    const resized = await sharp(Buffer.from(match[1], "base64"))
      .rotate() // EXIF 회전 반영 (폰 사진)
      .resize({ width: 600, height: 600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const blob = await put(`myot/${crypto.randomUUID()}.webp`, resized, {
      access: "public",
      contentType: "image/webp",
    });

    return NextResponse.json({ url: blob.url, publicId: blob.pathname });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
