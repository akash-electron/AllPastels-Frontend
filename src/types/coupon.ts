/**
 * Storefront-safe coupon shape returned by the public active-coupons feed.
 *
 * Internal counters, per-user limits and first-order rules stay on the backend;
 * only the fields needed to present an offer reach the browser. Checkout
 * remains the single authority on whether a code can actually be used.
 */

export type CouponDiscountType = "percent" | "fixed";

export interface PublicCoupon {
  code: string;
  type: CouponDiscountType;
  value: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  expiresAt: string | null;
}
