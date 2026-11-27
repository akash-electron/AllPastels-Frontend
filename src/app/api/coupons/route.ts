import { backendApi, backendProxyResponse } from "@/lib/server-api";

/**
 * GET /api/coupons — proxies the backend's public active-offers feed for the
 * storefront. Only eligible coupons are returned and no admin data is exposed;
 * checkout still validates every code server-side.
 */
export async function GET() {
  return backendProxyResponse(
    await backendApi("/coupons/active", { method: "GET" }, "none"),
    "Failed to load offers.",
  );
}
