"use client";

import { useEffect, useState } from "react";

// 저녁 OOTD 리마인더 알림 켜기/끄기 토글
export function PushToggle() {
  // unsupported | idle | subscribing | on
  const [status, setStatus] = useState<"unsupported" | "idle" | "subscribing" | "on">("idle");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      setStatus("unsupported");
      return;
    }
    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      if (sub) setStatus("on");
    }).catch(() => setStatus("unsupported"));
  }, []);

  if (status === "unsupported") return null;

  const enable = async () => {
    setStatus("subscribing");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setStatus("idle"); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });
      const res = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      if (!res.ok) throw new Error();
      setStatus("on");
    } catch {
      alert("알림 설정에 실패했어요. 홈 화면에 추가한 앱에서 시도해봐 (iOS는 필수).");
      setStatus("idle");
    }
  };

  const disable = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
    } catch {}
    setStatus("idle");
  };

  return status === "on" ? (
    <button onClick={disable} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 16, border: "1px solid rgba(74,124,89,0.3)", background: "rgba(74,124,89,0.08)", color: "#4A7C59", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>🔔 리마인더 켜짐</button>
  ) : (
    <button onClick={enable} disabled={status === "subscribing"} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 16, border: "1px dashed rgba(0,0,0,0.15)", background: "transparent", color: "#888", cursor: "pointer", fontFamily: "inherit" }}>
      {status === "subscribing" ? "설정 중..." : "🔕 저녁 리마인더 켜기"}
    </button>
  );
}
