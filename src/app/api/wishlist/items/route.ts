import { backendApi, backendProxyResponse } from "@/lib/server-api";

export async function POST(request: Request) {
  let payload: { productId?: unknown };
  try {
    payload = (await request.json()) as { productId?: unknown };
  } catch {
    return Response.json(
      { ok: false, error: "Please choose a product to save." },
      { status: 400 },
    );
  }

  if (typeof payload.productId !== "string" || !payload.productId.trim()) {
    return Response.json(
      { ok: false, error: "A valid product is required." },
      { status: 400 },
    );
  }

  return backendProxyResponse(
    await backendApi("/wishlist/items", {
      method: "POST",
      body: JSON.stringify({ productId: payload.productId.trim() }),
    }),
    "Failed to save this piece.",
  );
}
