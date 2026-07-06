"use client";

import { useEffect, useRef, useState } from "react";

// 새 배포 감지 → 새로고침 유도. 앱을 계속 켜두면 옛 JS가 남으므로,
// 부팅 시 버전을 기억했다가 앱이 다시 보일 때 재확인해 바뀌었으면 배너 표시.
export function UpdateBanner() {
  const boot = useRef<string | null>(null);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const { version } = await res.json();
        if (!version || version === "dev") return;      // 로컬 개발에선 무시
        if (boot.current === null) { boot.current = version; return; }  // 부팅 버전 저장
        if (version !== boot.current && active) setStale(true);
      } catch { /* 네트워크 오류 무시 */ }
    };
    check();
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);
    const iv = setInterval(onVisible, 5 * 60 * 1000);  // 켜둔 채여도 주기적 확인
    return () => { active = false; document.removeEventListener("visibilitychange", onVisible); clearInterval(iv); };
  }, []);

  if (!stale) return null;
  return (
    <div
      onClick={() => location.reload()}
      role="button"
      style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 300, background: "#6B2D3E", color: "#fff", padding: "11px 16px", textAlign: "center", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 2px 10px rgba(0,0,0,0.25)" }}
    >
      ✨ 새 버전이 있어요 · 탭하면 새로고침
    </div>
  );
}
