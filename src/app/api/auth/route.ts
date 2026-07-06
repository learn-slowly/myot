import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, pinHash } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const pin = process.env.APP_PIN;
  if (!pin) return NextResponse.json({ error: "PIN not configured" }, { status: 500 });

  const { pin: input } = await req.json();
  if (input !== pin) {
    return NextResponse.json({ error: "wrong pin" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await pinHash(pin), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1년
  });
  return res;
}
