// PIN 인증 쿠키 값 계산 — Web Crypto 기반이라 Node 라우트와 Edge 미들웨어 양쪽에서 동작
export const AUTH_COOKIE = "myot_auth";

export async function pinHash(pin: string): Promise<string> {
  const data = new TextEncoder().encode("myot-pin-v1:" + pin);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}
