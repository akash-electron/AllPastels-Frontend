/**
 * Product reviews service — real backend integration.
 *
 * All calls go through `lib/api-client.ts`, which targets this app's
 * same-origin Route Handlers. Those handlers forward the HttpOnly session
 * cookie to the Express backend, so review ownership is enforced server-side.
 */

import {
  NETWORK_ERROR_MESSAGE,
  apiPostBody,
  apiRequest,
  readRouteBody,
} from "@/lib/api-client";
import type {
  ApiReview,
  MyReviewPayload,
  ReviewBreakdownRow,
  ReviewFailureReason,
  ReviewInput,
  ReviewListPayload,
  ReviewMutationPayload,
  ReviewResult,
  ReviewSummary,
} from "@/types/review";

function failureReason(status: number): ReviewFailureReason {
  if (status === 401) return "unauthorized";
  if (status === 403) return "unauthorized";
  if (status === 404) return "not-found";
  if (status === 400) return "invalid";
  if (status === 409) return "conflict";
  if (status >= 500) return "server";
  return "conflict";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toReview(value: unknown): ApiReview | null {
  const record = asRecord(value);
  if (!record) return null;
  if (typeof record.id !== "string" || !record.id) return null;
  if (typeof record.rating !== "number") return null;
  if (typeof record.title !== "string" || typeof record.body !== "string") {
    return null;
  }

  return {
    id: record.id,
    productId: typeof record.productId === "string" ? record.productId : "",
    author: typeof record.author === "string" ? record.author : "Customer",
    rating: Math.max(1, Math.min(5, Math.round(record.rating))),
    title: record.title,
    body: record.body,
    sizePurchased:
      typeof record.sizePurchased === "string" ? record.sizePurchased : "",
    verifiedPurchase: record.verifiedPurchase === true,
    helpful:
      typeof record.helpful === "number" && Number.isFinite(record.helpful)
        ? record.helpful
        : 0,
    date: typeof record.date === "string" ? record.date : new Date().toISOString(),
    edited: record.edited === true,
    mine: record.mine === true,
  };
}

function toBreakdown(value: unknown): ReviewBreakdownRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      const record = asRecord(row);
      if (!record) return null;
      if (typeof record.stars !== "number") return null;
      return {
        stars: record.stars,
        count: typeof record.count === "number" ? record.count : 0,
        percent: typeof record.percent === "number" ? record.percent : 0,
      };
    })
    .filter((row): row is ReviewBreakdownRow => row !== null);
}

function coerceSummary(value: unknown): ReviewSummary | null {
  const record = asRecord(value);
  if (!record) return null;
  if (typeof record.average !== "number" || !Number.isFinite(record.average)) {
    return null;
  }
  if (typeof record.total !== "number" || !Number.isFinite(record.total)) {
    return null;
  }
  return {
    average: record.average,
    total: record.total,
    breakdown: toBreakdown(record.breakdown),
    recommended:
      typeof record.recommended === "number" && Number.isFinite(record.recommended)
        ? record.recommended
        : 0,
  };
}

function coerceList(value: unknown): ReviewListPayload | null {
  const record = asRecord(value);
  if (!record) return null;
  const summary = coerceSummary(record);
  if (!summary) return null;
  if (!Array.isArray(record.reviews)) return null;

  const reviews = record.reviews
    .map(toReview)
    .filter((review): review is ApiReview => review !== null);

  const page = typeof record.page === "number" ? record.page : 1;
  const limit = typeof record.limit === "number" ? record.limit : reviews.length;
  const pageCount =
    typeof record.pageCount === "number" ? record.pageCount : 1;

  return { ...summary, reviews, page, limit, pageCount };
}

function coerceMutation(value: unknown): ReviewMutationPayload | null {
  const record = asRecord(value);
  if (!record) return null;
  const summary = coerceSummary(record);
  const review = toReview(record.review);
  if (!summary || !review) return null;
  return { ...summary, review };
}

function coerceMine(value: unknown): MyReviewPayload | null {
  const record = asRecord(value);
  if (!record) return null;
  const summary = coerceSummary(record);
  if (!summary) return null;
  if (record.review === null || record.review === undefined) {
    return { ...summary, review: null };
  }
  const review = toReview(record.review);
  if (!review) return null;
  return { ...summary, review };
}

async function readResult<T>(
  response: Response | null,
  fallbackError: string,
  coerce: (value: unknown) => T | null,
): Promise<ReviewResult<T>> {
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
      reason: failureReason(response.status),
      unauthorized,
    };
  }

  const data = coerce(body.data);
  if (!data) {
    return {
      ok: false,
      error: "The review response was incomplete - please try again.",
      status: response.status,
      reason: "server",
    };
  }

  return { ok: true, data };
}

function reviewBase(productId: string): string {
  return `/products/${encodeURIComponent(productId)}/reviews`;
}

export async function getProductReviews(
  productId: string,
  page = 1,
  limit = 6,
): Promise<ReviewResult<ReviewListPayload>> {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const response = await apiRequest(`${reviewBase(productId)}?${query}`, {
    cache: "no-store",
  });
  return readResult(response, "Failed to load reviews.", coerceList);
}

export async function getMyProductReview(
  productId: string,
): Promise<ReviewResult<MyReviewPayload>> {
  const response = await apiRequest(`${reviewBase(productId)}/mine`, {
    cache: "no-store",
  });
  return readResult(response, "Failed to load your review.", coerceMine);
}

export async function createProductReview(
  productId: string,
  input: ReviewInput,
): Promise<ReviewResult<ReviewMutationPayload>> {
  const response = await apiPostBody(reviewBase(productId), input);
  return readResult(response, "Failed to submit your review.", coerceMutation);
}

export async function updateProductReview(
  productId: string,
  reviewId: string,
  input: ReviewInput,
): Promise<ReviewResult<ReviewMutationPayload>> {
  const response = await apiRequest(
    `${reviewBase(productId)}/${encodeURIComponent(reviewId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return readResult(response, "Failed to update your review.", coerceMutation);
}

export async function deleteProductReview(
  productId: string,
  reviewId: string,
): Promise<ReviewResult<ReviewSummary>> {
  const response = await apiRequest(
    `${reviewBase(productId)}/${encodeURIComponent(reviewId)}`,
    { method: "DELETE" },
  );
  return readResult(response, "Failed to delete your review.", coerceSummary);
}
