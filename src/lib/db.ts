// supabase-js와 같은 문법의 얇은 쿼리 빌더. 실제 실행은 /api/db 라우트가 담당한다.
// 지원 범위는 이 앱이 쓰는 패턴만: select/order/insert/upsert/update/delete/eq.

type Result = { data: any; error: string | null };

class QueryBuilder implements PromiseLike<Result> {
  private op: "select" | "insert" | "upsert" | "update" | "delete" = "select";
  private payload: unknown = undefined;
  private filters: { col: string; val: unknown }[] = [];
  private orderBy?: { col: string; ascending: boolean };

  constructor(private table: string) {}

  select(_columns = "*") {
    this.op = "select";
    return this;
  }
  insert(payload: unknown) {
    this.op = "insert";
    this.payload = payload;
    return this;
  }
  upsert(payload: unknown) {
    this.op = "upsert";
    this.payload = payload;
    return this;
  }
  update(payload: unknown) {
    this.op = "update";
    this.payload = payload;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(col: string, val: unknown) {
    this.filters.push({ col, val });
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orderBy = { col, ascending: opts?.ascending !== false };
    return this;
  }

  then<T1 = Result, T2 = never>(
    onfulfilled?: ((value: Result) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null
  ) {
    return this.run().then(onfulfilled, onrejected);
  }

  private async run(): Promise<Result> {
    try {
      const res = await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: this.table,
          op: this.op,
          payload: this.payload,
          filters: this.filters,
          order: this.orderBy,
        }),
      });
      const json = await res.json();
      if (!res.ok) return { data: null, error: json.error ?? res.statusText };
      return { data: json.data, error: null };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : String(e) };
    }
  }
}

export const supabase = {
  from: (table: string) => new QueryBuilder(table),
};
