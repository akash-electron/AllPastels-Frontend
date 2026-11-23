import { backendApi, backendProxyResponse } from "@/lib/server-api";

/**
 * GET /api/payments/options — available payment methods for this storefront.
 */

export async function GET() {
  return backendProxyResponse(
    await backendApi("/payments/options", { method: "GET" }, "optional"),
    "Failed to load payment options.",
  );
}
