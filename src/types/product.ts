/**
 * Shared product domain types.
 *
 * `ApiProduct` mirrors the backend product document returned by
 * `GET /api/products`. UI-facing `Product` (in `src/lib/types.ts`) is a
 * richer shape; `src/lib/product-adapter.ts` bridges the two so the
 * storefront keeps working against the real API.
 */

export interface ApiProduct {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  stock: number;
  sizes: string[];
  isActive: boolean;
  /** Denormalised review aggregate maintained by the backend. */
  rating: number;
  reviewCount: number;
  /** SEO copy — empty string means the storefront uses its own defaults. */
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  /** Alt text for the product's gallery images. */
  imageAlt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductsApiResponse {
  success?: boolean;
  count?: number;
  data?: unknown;
  message?: string;
  error?: string;
}

export interface ProductApiResponse {
  success?: boolean;
  data?: unknown;
  message?: string;
  error?: string;
}
