import { backendApi, backendProxyResponse } from "@/lib/server-api";

/** GET /api/products/:productId/reviews/mine — the viewer's own review. */

type MineContext = { params: Promise<{ productId: string }> };

export async function GET(_request: Request, context: MineContext) {
  const { productId } = await context.params;

  return backendProxyResponse(
    await backendApi(
      `/products/${encodeURIComponent(productId)}/reviews/mine`,
      { method: "GET" },
      "required",
    ),
    "Failed to load your review.",
  );
}
