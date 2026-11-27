import {
  NETWORK_ERROR_MESSAGE,
  apiPostBody,
  apiRequest,
  readRouteBody,
} from "@/lib/api-client";
import type {
  ApiWishlist,
  WishlistFailureReason,
  WishlistResult,
} from "@/types/wishlist";

function coerceWishlist(value: unknown): ApiWishlist | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  const rawIds = Array.isArray(record.productIds)
    ? record.productIds
    : Array.isArray(record.items)
      ? record.items.map((item) =>
          item && typeof item === "object"
            ? (item as Record<string, unknown>).productId
            : null,
        )
      : [];

  const productIds: string[] = [];
  for (const rawId of rawIds) {
    if (typeof rawId !== "string" || !rawId.trim()) continue;
    if (!productIds.includes(rawId)) productIds.push(rawId);
  }

  return {
    id: typeof record.id === "string" ? record.id : null,
    productIds,
    items: productIds.map((productId) => ({ productId })),
    count: productIds.length,
  };
}

function failureReason(status: number): WishlistFailureReason {
  if (status === 401) return "unauthorized";
  if (status === 404) return "not-found";
  if (status === 400) return "invalid";
  if (status >= 500) return "server";
  return "conflict";
}

async function readWishlistResponse(
  response: Response | null,
  fallbackError: string,
): Promise<WishlistResult> {
  if (!response) {
    return {
      ok: false,
      error: NETWORK_ERROR_MESSAGE,
      status: 0,
      reason: "network",
    };
  }

  const body = await readRouteBody(response, fallbackError);
  if (body.ok !== true) {
    const message = typeof body.error === "string" ? body.error : fallbackError;
    const unauthorized = body.unauthorized === true || response.status === 401;
    return {
      ok: false,
      error: message,
      status: response.status,
      reason: unauthorized ? "unauthorized" : failureReason(response.status),
      unauthorized,
    };
  }

  const wishlist = coerceWishlist(body.data);
  if (!wishlist) {
    return {
      ok: false,
      error: "The wishlist response was incomplete - please try again.",
      status: response.status,
      reason: "server",
    };
  }

  return { ok: true, wishlist };
}

export async function getWishlist(): Promise<WishlistResult> {
  const response = await apiRequest("/wishlist", { cache: "no-store" });
  return readWishlistResponse(response, "Failed to load your wishlist.");
}

export async function addWishlistItem(productId: string): Promise<WishlistResult> {
  const response = await apiPostBody("/wishlist/items", { productId });
  return readWishlistResponse(response, "Failed to save this piece.");
}

export async function removeWishlistItem(
  productId: string,
): Promise<WishlistResult> {
  const response = await apiRequest(
    `/wishlist/items/${encodeURIComponent(productId)}`,
    { method: "DELETE" },
  );
  return readWishlistResponse(response, "Failed to remove this piece.");
}
