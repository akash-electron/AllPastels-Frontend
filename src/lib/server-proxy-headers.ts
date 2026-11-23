import { headers } from "next/headers";
const IP_RE = /^[0-9a-fA-F:.]{2,45}$/;
function pickClientIp(h: Headers): string | null {
  const real = h.get("x-real-ip")?.trim();
  if (real && IP_RE.test(real)) return real;
  const first = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (first && IP_RE.test(first)) return first;
  return null;
}
/** Adds X-Forwarded-For + X-Proxy-Secret so the backend rate-limits per visitor, not per Next server. */
export async function applyProxyHeaders(target: Headers): Promise<void> {
  const secret = process.env.PROXY_SHARED_SECRET;
  if (!secret) return;
  let incoming: Headers;
  try { incoming = await headers(); } catch { return; } // called outside a request scope
  const ip = pickClientIp(incoming);
  if (!ip) return;
  target.set("X-Forwarded-For", ip);
  target.set("X-Proxy-Secret", secret);
}
