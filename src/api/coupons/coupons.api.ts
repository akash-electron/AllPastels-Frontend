/**
 * Coupons service — storefront-side helpers.
 *
 * Coupon codes are priced authoritatively by the checkout routes when an order
 * is placed. Checkout may also call the public order-preview endpoint to show
 * a live discount; its result is only an estimate. Client code here normalises
 * the code it submits and reads the public active-offer feed for display.
 */

import {
  NETWORK_ERROR_MESSAGE,
  apiRequest,
  readRouteBody,
} from "@/lib/api-client";
import type { PublicCoupon } from "@/types/coupon";

export const COUPON_CODE_MAX_LENGTH = 30;

/** Matches the backend's checkout handling: trimmed and upper-cased. */
export function normalizeCouponCode(value: string): string {
  return value.trim().toUpperCase();
}

export type ActiveCouponsResult =
  | { ok: true; coupons: PublicCoupon[] }
  | { ok: false; error: string };

const FALLBACK_ERROR = "Failed to load offers.";

function nonNegative(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

/**
 * Defence in depth: the backend already filters state, but a stale cache or a
 * malformed payload must never surface an inactive, expired or invalid offer.
 * Exhausted coupons are filtered server-side because the counter is private.
 */
function coerceCoupon(value: unknown): PublicCoupon | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  const code = typeof record.code === "string" ? record.code.trim().toUpperCase() : "";
  if (!code) return null;

  const type = record.type;
  if (type !== "percent" && type !== "fixed") return null;

  const discountValue = nonNegative(record.value);
  if (discountValue === null) return null;
  if (type === "percent" && discountValue > 100) return null;

  const minOrderAmount = nonNegative(record.minOrderAmount) ?? 0;

  const rawCap = record.maxDiscountAmount;
  const maxDiscountAmount =
    rawCap === null || rawCap === undefined ? null : nonNegative(rawCap);
  if (rawCap !== null && rawCap !== undefined && maxDiscountAmount === null) {
    return null;
  }

  let expiresAt: string | null = null;
  if (record.expiresAt !== null && record.expiresAt !== undefined) {
    if (typeof record.expiresAt !== "string") return null;
    const expiry = new Date(record.expiresAt).getTime();
    if (!Number.isFinite(expiry) || expiry <= Date.now()) return null;
    expiresAt = record.expiresAt;
  }

  return {
    code,
    type,
    value: discountValue,
    minOrderAmount,
    maxDiscountAmount,
    expiresAt,
  };
}

/**
 * `GET /api/coupons` — public active offers for the welcome widget. The
 * same-origin Route Handler proxies the backend feed, so no admin
 * credentials or private counters ever reach the browser.
 */
export async function getActiveCoupons(): Promise<ActiveCouponsResult> {
  const response = await apiRequest("/coupons", { cache: "no-store" });
  if (!response) {
    return { ok: false, error: NETWORK_ERROR_MESSAGE };
  }

  const body = await readRouteBody(response, FALLBACK_ERROR);
  if (body.ok !== true) {
    return {
      ok: false,
      error: typeof body.error === "string" ? body.error : FALLBACK_ERROR,
    };
  }

  if (!Array.isArray(body.data)) {
    return { ok: false, error: "The offers response was incomplete." };
  }

  const coupons = body.data
    .map(coerceCoupon)
    .filter((coupon): coupon is PublicCoupon => coupon !== null);

  return { ok: true, coupons };
}
