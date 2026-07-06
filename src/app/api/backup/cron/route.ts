import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { put, list, del } from "@vercel/blob";

const TABLES = [
  "clothing_items", "combos", "saved_combos", "ootd_logs",
  "wish_items", "wish_statuses", "letgo_items", "custom_categories",
  "push_subscriptions",
];
const KEEP = 8; // 최근 8주치 보관

// 주 1회 (Vercel cron) — 전체 테이블을 JSON으로 덤프해서 Blob에 저장.
// Neon 무료 플랜의 시점 복구(6시간)를 보완하는 장기 안전망.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return NextResponse.json({ error: "not configured" }, { status: 500 });

  const sql = neon(dbUrl);
  const dump: Record<string, unknown[]> = {};
  for (const table of TABLES) {
    dump[table] = await sql.query(`select * from "${table}"`, []);
  }

  const dateKst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const blob = await put(`myot/backups/myot-${dateKst}.json`, JSON.stringify(dump), {
    access: "public",
    contentType: "application/json",
  });

  // 오래된 백업 정리 (파일명이 날짜순이라 정렬로 충분)
  const existing = await list({ prefix: "myot/backups/" });
  const sorted = existing.blobs.sort((a, b) => b.pathname.localeCompare(a.pathname));
  const stale = sorted.slice(KEEP);
  for (const old of stale) await del(old.url);

  const rows = Object.values(dump).reduce((n, r) => n + r.length, 0);
  return NextResponse.json({ ok: true, rows, url: blob.url, kept: Math.min(sorted.length, KEEP), removed: stale.length });
}
