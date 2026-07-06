import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function POST(req: NextRequest) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 500 });

  const subscription = await req.json();
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: "invalid subscription" }, { status: 400 });
  }

  const sql = neon(dbUrl);
  await sql.query(
    `insert into push_subscriptions (endpoint, subscription) values ($1, $2)
     on conflict (endpoint) do update set subscription = excluded.subscription`,
    [subscription.endpoint, JSON.stringify(subscription)]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 500 });

  const { endpoint } = await req.json();
  if (!endpoint) return NextResponse.json({ error: "endpoint required" }, { status: 400 });

  const sql = neon(dbUrl);
  await sql.query(`delete from push_subscriptions where endpoint = $1`, [endpoint]);
  return NextResponse.json({ ok: true });
}
