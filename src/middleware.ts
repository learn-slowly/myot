import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, pinHash } from "@/lib/auth";

// 인증 없이 접근 가능한 경로:
// - /login, /api/auth: PIN 입력 플로우
// - cron 라우트 2종: CRON_SECRET Bearer로 자체 보호
// - PWA 정적 자원: 설치·아이콘·서비스워커
const PUBLIC_PATHS = [
  /^\/login$/,
  /^\/api\/auth$/,
  /^\/api\/push\/cron$/,
  /^\/api\/backup\/cron$/,
  /^\/api\/version$/,
  /^\/sw\.js$/,
  /^\/manifest\.json$/,
  /^\/favicon\.ico$/,
  /^\/icon-/,
];

export async function middleware(req: NextRequest) {
  const pin = process.env.APP_PIN;
  if (!pin) return NextResponse.next(); // PIN 미설정 시 잠금 해제

  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some(re => re.test(pathname))) return NextResponse.next();

  const cookie = req.cookies.get(AUTH_COOKIE)?.value;
  if (cookie && cookie === (await pinHash(pin))) return NextResponse.next();

  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
