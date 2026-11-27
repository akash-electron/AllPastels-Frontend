/**
 * Storefront review domain types.
 *
 * Mirrors the backend `/api/products/:productId/reviews` payload. The UI only
 * consumes these coerced shapes, so the wire format can evolve behind
 * `src/api/reviews/reviews.api.ts`.
 */

export interface ApiReview {
  id: string;
  productId: string;
  author: string;
  /** Whole number 1–5. */
  rating: number;
  title: string;
  body: string;
  sizePurchased: string;
  verifiedPurchase: boolean;
  helpful: number;
  /** ISO timestamp. */
  date: string;
  /** True when the review has been edited since it was posted. */
  edited: boolean;
  /** True when the signed-in viewer authored this review. */
  mine: boolean;
}

export interface ReviewBreakdownRow {
  /** Star value 1–5. */
  stars: number;
  count: number;
  /** Share of reviews at this star value, 0–100. */
  percent: number;
}

export interface ReviewSummary {
  average: number;
  total: number;
  breakdown: ReviewBreakdownRow[];
  /** Percentage of reviewers who gave 4 or 5 stars. */
  recommended: number;
}

export interface ReviewListPayload extends ReviewSummary {
  reviews: ApiReview[];
  page: number;
  limit: number;
  pageCount: number;
}

export interface ReviewMutationPayload extends ReviewSummary {
  review: ApiReview;
}

export interface MyReviewPayload extends ReviewSummary {
  review: ApiReview | null;
}

export interface ReviewInput {
  rating: number;
  title: string;
  body: string;
  sizePurchased: string;
}

export type ReviewFailureReason =
  | "unauthorized"
  | "not-found"
  | "invalid"
  | "conflict"
  | "network"
  | "server";

export type ReviewResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      status: number;
      reason: ReviewFailureReason;
      unauthorized?: boolean;
    };
