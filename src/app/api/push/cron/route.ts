import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import webpush from "web-push";

// 매일 저녁 (Vercel cron) 실행 — 오늘 OOTD 기록이 없으면 리마인더 발송
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const dbUrl = process.env.DATABASE_URL;
  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!dbUrl || !vapidPublic || !vapidPrivate) {
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  webpush.setVapidDetails("mailto:redoutk@gmail.com", vapidPublic, vapidPrivate);
  const sql = neon(dbUrl);

  // KST 기준 오늘 날짜
  const todayKst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const logged = await sql.query(`select count(*)::int as n from ootd_logs where date = $1`, [todayKst]);
  if (logged[0].n > 0) {
    return NextResponse.json({ sent: 0, reason: "already logged today" });
  }

  const subs = await sql.query(`select endpoint, subscription from push_subscriptions`, []);
  const payload = JSON.stringify({
    title: "내옷 myot",
    body: "오늘 뭐 입었어? 자기 전에 30초면 기록 끝 📸",
    url: "/",
  });

  let sent = 0;
  for (const row of subs) {
    try {
      await webpush.sendNotification(row.subscription, payload);
      sent++;
    } catch (e) {
      // 만료·해지된 구독은 정리
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await sql.query(`delete from push_subscriptions where endpoint = $1`, [row.endpoint]);
      }
    }
  }
  return NextResponse.json({ sent, total: subs.length });
}
