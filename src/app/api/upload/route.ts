import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Cloudinary not configured" },
      { status: 500 }
    );
  }

  const { image } = await req.json();

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params = `folder=myot&timestamp=${timestamp}&transformation=c_limit,w_600,q_auto`;

  const { createHash } = await import("crypto");
  const signature = createHash("sha1")
    .update(params + apiSecret)
    .digest("hex");

  const formData = new FormData();
  formData.append("file", image);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp);
  formData.append("signature", signature);
  formData.append("folder", "myot");
  formData.append("transformation", "c_limit,w_600,q_auto");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json(
      { error: `Cloudinary error: ${response.status}` },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json({
    url: data.secure_url,
    publicId: data.public_id,
  });
}
