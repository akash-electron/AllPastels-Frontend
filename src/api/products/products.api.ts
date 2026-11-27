/**
 * Products service — real backend product integration.
 *
 * All requests go through `lib/api-client.ts` (base URL + network mapping);
 * no second client is created here.
 */

import { NETWORK_ERROR_MESSAGE } from "@/lib/api-client";
import { API_BASE_URL } from "@/utils/env";
import type {
  ApiProduct,
  ProductApiResponse,
  ProductsApiResponse,
} from "@/types/product";

export type ProductsResult =
  | { ok: true; products: ApiProduct[] }
  | { ok: false; error: string };

export type ProductResult =
  | { ok: true; product: ApiProduct }
  | { ok: false; error: string; notFound?: boolean };

export function coerceApiProduct(value: unknown): ApiProduct | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record._id !== "string" || !record._id.trim()) return null;
  if (typeof record.name !== "string") return null;
  if (typeof record.price !== "number" || !Number.isFinite(record.price)) return null;
  return {
    _id: record._id,
    name: record.name,
    description: typeof record.description === "string" ? record.description : "",
    price: record.price,
    category: typeof record.category === "string" ? record.category : "",
    images: Array.isArray(record.images)
      ? record.images.filter((item): item is string => typeof item === "string")
      : [],
    stock: typeof record.stock === "number" && Number.isFinite(record.stock) ? record.stock : 0,
    sizes: Array.isArray(record.sizes)
      ? record.sizes.filter((item): item is string => typeof item === "string")
      : [],
    isActive: record.isActive !== false,
    rating:
      typeof record.rating === "number" && Number.isFinite(record.rating)
        ? record.rating
        : 0,
    reviewCount:
      typeof record.reviewCount === "number" && Number.isFinite(record.reviewCount)
        ? record.reviewCount
        : 0,
    metaTitle: typeof record.metaTitle === "string" ? record.metaTitle : "",
    metaDescription: typeof record.metaDescription === "string" ? record.metaDescription : "",
    metaKeywords: typeof record.metaKeywords === "string" ? record.metaKeywords : "",
    imageAlt: typeof record.imageAlt === "string" ? record.imageAlt : "",
    createdAt: typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString(),
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : new Date().toISOString(),
  };
}

export async function getAllProducts(): Promise<ProductsResult> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/products`, {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) {
      let message = `Failed to load products (${response.status}).`;
      try {
        const body = (await response.json()) as ProductsApiResponse;
        if (typeof body?.message === "string") message = body.message;
        else if (typeof body?.error === "string") message = body.error;
      } catch {
        // ignore parse errors
      }
      return { ok: false, error: message };
    }
    const body = (await response.json().catch(() => ({}))) as ProductsApiResponse;
    const raw = Array.isArray(body?.data) ? body.data : [];
    const products = raw
      .map(coerceApiProduct)
      .filter((product): product is ApiProduct => product !== null);
    return { ok: true, products };
  } catch {
    return { ok: false, error: NETWORK_ERROR_MESSAGE };
  }
}

export async function getProductById(id: string): Promise<ProductResult> {
  const trimmed = (id ?? "").trim();
  if (!trimmed) {
    return { ok: false, error: "Product not found.", notFound: true };
  }
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/products/${encodeURIComponent(trimmed)}`,
      { method: "GET", cache: "no-store" },
    );
    if (response.status === 404) {
      let message = "Product not found.";
      try {
        const body = (await response.json()) as ProductApiResponse;
        if (typeof body?.message === "string") message = body.message;
        else if (typeof body?.error === "string") message = body.error;
      } catch {
        // ignore
      }
      return { ok: false, error: message, notFound: true };
    }
    if (!response.ok) {
      let message = `Failed to load product (${response.status}).`;
      try {
        const body = (await response.json()) as ProductApiResponse;
        if (typeof body?.message === "string") message = body.message;
        else if (typeof body?.error === "string") message = body.error;
      } catch {
        // ignore
      }
      return { ok: false, error: message };
    }
    const body = (await response.json().catch(() => ({}))) as ProductApiResponse;
    const product = coerceApiProduct(body?.data);
    if (!product || product.isActive === false) {
      return { ok: false, error: "Product not found.", notFound: true };
    }
    return { ok: true, product };
  } catch {
    return { ok: false, error: NETWORK_ERROR_MESSAGE };
  }
}
