import { NextResponse } from "next/server";

// 현재 배포의 커밋 SHA. 배포마다 바뀌므로 클라이언트가 새 버전 감지에 사용.
export const dynamic = "force-dynamic";

export function GET() {
  const version = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || "dev";
  return NextResponse.json({ version }, { headers: { "Cache-Control": "no-store" } });
}
