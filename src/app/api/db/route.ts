import { NextRequest, NextResponse } from "next/server";
import { neon, types } from "@neondatabase/serverless";

// date 컬럼을 Date 객체로 파싱하면 시간대가 밀려 하루 어긋난다.
// supabase(PostgREST)와 동일하게 'YYYY-MM-DD' 문자열 그대로 반환한다.
types.setTypeParser(types.builtins.DATE, (v: string) => v);

// 화이트리스트: 여기 없는 테이블은 접근 불가. pk는 upsert 충돌 키.
const TABLES: Record<string, { pk: string }> = {
  clothing_items: { pk: "id" },
  combos: { pk: "id" },
  saved_combos: { pk: "id" },
  ootd_logs: { pk: "id" },
  wish_items: { pk: "id" },
  wish_statuses: { pk: "id" },
  letgo_items: { pk: "id" },
  custom_categories: { pk: "id" },
};

const IDENT = /^[a-z_][a-z0-9_]*$/;

type Filter = { col: string; val: unknown };
type Body = {
  table: string;
  op: "select" | "insert" | "upsert" | "update" | "delete";
  payload?: Record<string, unknown> | Record<string, unknown>[];
  filters?: Filter[];
  order?: { col: string; ascending?: boolean };
};

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function checkIdent(name: string) {
  if (!IDENT.test(name)) throw new Error(`invalid identifier: ${name}`);
  return `"${name}"`;
}

export async function POST(req: NextRequest) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return bad("DATABASE_URL not configured", 500);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return bad("invalid JSON body");
  }

  const { table, op, payload, filters = [], order } = body;
  if (!TABLES[table]) return bad(`unknown table: ${table}`);
  const { pk } = TABLES[table];

  const sql = neon(dbUrl);
  const params: unknown[] = [];
  const p = (val: unknown) => {
    params.push(val);
    return `$${params.length}`;
  };

  try {
    let text: string;

    const where = () => {
      if (!filters.length) return "";
      return " where " + filters.map(f => `${checkIdent(f.col)} = ${p(f.val)}`).join(" and ");
    };

    if (op === "select") {
      text = `select * from ${checkIdent(table)}${where()}`;
      if (order) {
        text += ` order by ${checkIdent(order.col)} ${order.ascending === false ? "desc" : "asc"}`;
      }
    } else if (op === "insert" || op === "upsert") {
      const rows = Array.isArray(payload) ? payload : [payload];
      if (!rows.length || rows.some(r => !r || typeof r !== "object")) return bad("invalid payload");
      const cols = [...new Set(rows.flatMap(r => Object.keys(r!)))];
      const colSql = cols.map(checkIdent).join(", ");
      const valuesSql = rows
        .map(r => "(" + cols.map(c => p((r as Record<string, unknown>)[c] ?? null)).join(", ") + ")")
        .join(", ");
      text = `insert into ${checkIdent(table)} (${colSql}) values ${valuesSql}`;
      if (op === "upsert") {
        const updates = cols.filter(c => c !== pk);
        text += updates.length
          ? ` on conflict (${checkIdent(pk)}) do update set ` +
            updates.map(c => `${checkIdent(c)} = excluded.${checkIdent(c)}`).join(", ")
          : ` on conflict (${checkIdent(pk)}) do nothing`;
      }
      text += " returning *";
    } else if (op === "update") {
      if (!payload || Array.isArray(payload)) return bad("invalid payload");
      if (!filters.length) return bad("update requires filters");
      const sets = Object.entries(payload)
        .map(([c, v]) => `${checkIdent(c)} = ${p(v)}`)
        .join(", ");
      text = `update ${checkIdent(table)} set ${sets}${where()} returning *`;
    } else if (op === "delete") {
      if (!filters.length) return bad("delete requires filters");
      text = `delete from ${checkIdent(table)}${where()} returning *`;
    } else {
      return bad(`unknown op: ${op}`);
    }

    const data = await sql.query(text, params);
    return NextResponse.json({ data });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const status = message.startsWith("invalid identifier") ? 400 : 500;
    return bad(message, status);
  }
}
