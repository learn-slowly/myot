"use client";

import { useState } from "react";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!pin.trim() || submitting) return;
    setSubmitting(true);
    setError(false);
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: pin.trim() }),
    });
    if (res.ok) {
      window.location.href = "/";
    } else {
      setError(true);
      setPin("");
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 20 }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.5px", color: "#2A2A2A" }}>내<span style={{ color: "#6B2D3E" }}>옷</span> myot</h1>
        <p style={{ fontSize: 11, color: "#999", margin: "4px 0 0", letterSpacing: "2px", textTransform: "uppercase" }}>my only trend</p>
      </div>
      <input
        type="password"
        inputMode="numeric"
        autoFocus
        value={pin}
        onChange={e => setPin(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") submit(); }}
        placeholder="PIN"
        style={{ width: 180, padding: "12px 16px", borderRadius: 12, border: error ? "2px solid #E85D5D" : "1.5px solid rgba(0,0,0,0.1)", fontSize: 18, textAlign: "center", letterSpacing: 6, fontFamily: "inherit", background: "rgba(255,255,255,0.7)", outline: "none", boxSizing: "border-box" }}
      />
      {error && <div style={{ fontSize: 12, color: "#E85D5D" }}>PIN이 맞지 않아요</div>}
      <button onClick={submit} disabled={submitting} style={{ width: 180, padding: 12, borderRadius: 12, border: "none", background: submitting ? "#B0A090" : "#2A2A2A", color: "#F5F0E1", cursor: submitting ? "default" : "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit" }}>
        {submitting ? "확인 중..." : "들어가기"}
      </button>
    </div>
  );
}
