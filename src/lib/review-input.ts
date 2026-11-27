import type { ReviewInput } from "@/types/review";

/**
 * Normalises and validates a review payload before it is proxied to the
 * backend. The backend is still authoritative; this keeps obvious mistakes
 * from leaving the browser and returns a friendly 400 early.
 */

const TITLE_MIN = 3;
const TITLE_MAX = 120;
const BODY_MIN = 10;
const BODY_MAX = 2000;
const SIZE_MAX = 40;

export function parseReviewInput(value: unknown): ReviewInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;

  const rating = record.rating;
  if (
    typeof rating !== "number" ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    return null;
  }

  const title = typeof record.title === "string" ? record.title.trim() : "";
  if (title.length < TITLE_MIN || title.length > TITLE_MAX) return null;

  const body = typeof record.body === "string" ? record.body.trim() : "";
  if (body.length < BODY_MIN || body.length > BODY_MAX) return null;

  const rawSize =
    typeof record.sizePurchased === "string" ? record.sizePurchased.trim() : "";
  if (rawSize.length > SIZE_MAX) return null;

  return { rating, title, body, sizePurchased: rawSize };
}
