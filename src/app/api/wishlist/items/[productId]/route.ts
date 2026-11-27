import { backendApi, backendProxyResponse } from "@/lib/server-api";

type WishlistItemContext = { params: Promise<{ productId: string }> };

export async function DELETE(_request: Request, context: WishlistItemContext) {
  const { productId } = await context.params;

  return backendProxyResponse(
    await backendApi(`/wishlist/items/${encodeURIComponent(productId)}`, {
      method: "DELETE",
    }),
    "Failed to remove this piece.",
  );
}
