import type { Product } from "@/lib/types";

/**
 * Order domain types.
 *
 * UI-facing orders are adapted from the backend's populated order documents;
 * amounts always come from the backend and never from the cart or the client.
 */

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "payment_failed"
  | "refunded";

export type OrderPaymentMethod = "cod" | "online";
export type OrderPaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface OrderStatusEntry {
  status: OrderStatus;
  at: string;
  note?: string;
}

export interface OrderCoupon {
  code: string;
  type: "percent" | "fixed";
  value: number;
  amount: number;
}

export interface OrderShippingAddress {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface OrderLine {
  productId: string;
  /** Present only if an order source eventually captures a size. */
  size?: string;
  quantity: number;
  product: Product;
  lineTotal: number;
}

export interface OrderDetail {
  id: string;
  placedOn: string;
  status: OrderStatus;
  lines: OrderLine[];
  itemCount: number;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  coupon: OrderCoupon | null;
  shippingAddress: OrderShippingAddress | null;
  customerName?: string;
  customerEmail?: string;
  paymentMethod: OrderPaymentMethod;
  paymentStatus: OrderPaymentStatus;
  statusHistory: OrderStatusEntry[];
}

export interface CheckoutShippingAddress {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface PlaceOrderInput {
  shippingAddress: CheckoutShippingAddress;
  /** Optional address-book entry; the backend copies it server-side. */
  shippingAddressId?: string;
  couponCode?: string;
  paymentMethod?: OrderPaymentMethod;
  paymentProvider?: "razorpay" | "stripe";
  idempotencyKey?: string;
}

export interface GuestOrderItem {
  productId: string;
  qty: number;
  size?: string;
}

export interface PlaceGuestOrderInput {
  items: GuestOrderItem[];
  shippingAddress?: CheckoutShippingAddress;
  couponCode?: string;
  customerEmail?: string;
  paymentMethod?: OrderPaymentMethod;
  paymentProvider?: "razorpay" | "stripe";
  idempotencyKey?: string;
}

export type LookupOrderInput =
  | { orderNumber: string; email: string }
  | { orderNumber: string; token: string };

/** Server-priced bag estimate used by the checkout coupon preview. */
export interface OrderPreview {
  subtotal: number;
  discount: number;
  shipping: number;
  shippingFree: boolean;
  taxRatePercent: number;
  tax: number;
  total: number;
  coupon: OrderCoupon | null;
}

export interface PreviewOrderInput {
  items: GuestOrderItem[];
  couponCode?: string;
}
