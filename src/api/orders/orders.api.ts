/**
 * Orders service — real backend integration.
 *
 * Order history and cart checkout go through this app's same-origin Route
 * Handlers, which attach the HttpOnly session JWT server-side. The backend
 * remains authoritative for item prices, discounts, shipping, tax and totals.
 */

import {
  NETWORK_ERROR_MESSAGE,
  apiPostBody,
  apiRequest,
  readRouteBody,
} from "@/lib/api-client";
import { coerceApiProduct } from "@/api/products/products.api";
import { photoSet } from "@/lib/images";
import { toProduct } from "@/lib/product-adapter";
import type { Product } from "@/lib/types";
import type {
  LookupOrderInput,
  OrderCoupon,
  OrderDetail,
  OrderLine,
  OrderPaymentMethod,
  OrderPaymentStatus,
  OrderPreview,
  OrderShippingAddress,
  OrderStatus,
  OrderStatusEntry,
  PlaceGuestOrderInput,
  PlaceOrderInput,
  PreviewOrderInput,
} from "@/types/order";

export type OrdersResult =
  | { ok: true; orders: OrderDetail[] }
  | { ok: false; error: string; unauthorized?: boolean };

export type PlaceOrderResult =
  | { ok: true; order: OrderDetail; lookupToken?: string }
  | { ok: false; error: string; status: number; unauthorized?: boolean };

export type CancelOrderResult =
  | { ok: true; order: OrderDetail }
  | { ok: false; error: string; status: number; unauthorized?: boolean };

export type PreviewOrderResult =
  | { ok: true; preview: OrderPreview }
  | { ok: false; error: string; status: number; unauthorized?: boolean };

export type GetOrderResult =
  | { ok: true; order: OrderDetail; lookupToken?: string }
  | {
      ok: false;
      error: string;
      status: number;
      unauthorized?: boolean;
      notFound?: boolean;
    };

const ORDER_STATUSES: OrderStatus[] = [
  "placed",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "payment_failed",
  "refunded",
];

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function nonNegativeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function coerceStatus(value: unknown): OrderStatus {
  return ORDER_STATUSES.includes(value as OrderStatus)
    ? (value as OrderStatus)
    : "placed";
}

function coercePaymentMethod(value: unknown): OrderPaymentMethod {
  return value === "online" ? "online" : "cod";
}

function coercePaymentStatus(value: unknown): OrderPaymentStatus {
  return value === "paid" || value === "failed" || value === "refunded"
    ? value
    : "pending";
}

function coerceStatusHistory(value: unknown): OrderStatusEntry[] {
  if (!Array.isArray(value)) return [];
  const history: OrderStatusEntry[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const record = raw as Record<string, unknown>;
    const at =
      typeof record.at === "string" && !Number.isNaN(Date.parse(record.at))
        ? record.at
        : null;
    if (!at) continue;
    history.push({
      status: coerceStatus(record.status),
      at,
      note: typeof record.note === "string" ? record.note : undefined,
    });
  }
  return history;
}

function fallbackProduct(productId: string, price: number): Product {
  return {
    id: productId,
    slug: productId,
    name: "Product",
    category: "accessories",
    categoryLabel: "Product",
    price,
    photoSet: photoSet(productId),
    colors: [],
    sizes: [],
    summary: "",
    description: "",
    details: [],
    rating: 0,
    reviewCount: 0,
    isNew: false,
    isBestseller: false,
    moods: [],
    collections: [],
  };
}

function resolveOrderProduct(
  value: unknown,
  productId: string,
  price: number,
): Product {
  const apiProduct = coerceApiProduct(value);
  return apiProduct ? toProduct(apiProduct) : fallbackProduct(productId, price);
}

function coerceCoupon(value: unknown): OrderCoupon | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.code !== "string" || !record.code.trim()) return null;
  if (record.type !== "percent" && record.type !== "fixed") return null;

  const couponValue = nonNegativeNumber(record.value);
  const amount = nonNegativeNumber(record.amount);
  if (couponValue === null || amount === null) return null;

  return {
    code: record.code,
    type: record.type,
    value: couponValue,
    amount,
  };
}

function coerceAddress(value: unknown): OrderShippingAddress | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const required = [
    "fullName",
    "line1",
    "city",
    "postalCode",
    "country",
  ] as const;

  for (const key of required) {
    if (typeof record[key] !== "string" || !record[key]) return null;
  }

  return {
    fullName: record.fullName as string,
    line1: record.line1 as string,
    line2: typeof record.line2 === "string" ? record.line2 : undefined,
    city: record.city as string,
    state: typeof record.state === "string" ? record.state : undefined,
    postalCode: record.postalCode as string,
    country: record.country as string,
    phone: typeof record.phone === "string" ? record.phone : undefined,
  };
}

function coerceOrder(value: unknown): OrderDetail | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.orderNumber !== "string" || !record.orderNumber.trim()) {
    return null;
  }
  if (!Array.isArray(record.items)) return null;

  const lines: OrderLine[] = [];
  for (const rawItem of record.items) {
    if (!rawItem || typeof rawItem !== "object") continue;
    const item = rawItem as Record<string, unknown>;
    const rawProduct = item.product;
    const productId =
      typeof rawProduct === "string"
        ? rawProduct
        : rawProduct && typeof rawProduct === "object"
          ? (rawProduct as Record<string, unknown>)._id
          : null;
    if (typeof productId !== "string" || !productId) continue;

    const quantity = item.qty;
    if (
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      continue;
    }

    const price = nonNegativeNumber(item.priceAtPurchase) ?? 0;
    lines.push({
      productId,
      size:
        typeof item.size === "string" && item.size.trim()
          ? item.size.trim()
          : undefined,
      quantity,
      product: resolveOrderProduct(rawProduct, productId, price),
      lineTotal: round2(price * quantity),
    });
  }

  const subtotal =
    nonNegativeNumber(record.subtotal) ??
    round2(lines.reduce((sum, line) => sum + line.lineTotal, 0));
  const discount = nonNegativeNumber(record.discount) ?? 0;
  const shipping = nonNegativeNumber(record.shipping) ?? 0;
  const tax = nonNegativeNumber(record.tax) ?? 0;
  const total =
    nonNegativeNumber(record.total) ??
    round2(subtotal - discount + shipping + tax);
  const placedOn =
    typeof record.createdAt === "string" &&
    !Number.isNaN(Date.parse(record.createdAt))
      ? record.createdAt
      : new Date().toISOString();

  return {
    id: record.orderNumber,
    placedOn,
    status: coerceStatus(record.status),
    lines,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotal,
    discount,
    shipping,
    tax,
    total,
    coupon: coerceCoupon(record.coupon),
    shippingAddress: coerceAddress(record.shippingAddress),
    customerName:
      typeof record.customerName === "string" ? record.customerName : undefined,
    customerEmail:
      typeof record.customerEmail === "string" ? record.customerEmail : undefined,
    paymentMethod: coercePaymentMethod(record.paymentMethod),
    paymentStatus: coercePaymentStatus(record.paymentStatus),
    statusHistory: coerceStatusHistory(record.statusHistory),
  };
}

function coercePreview(value: unknown): OrderPreview | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  const subtotal = nonNegativeNumber(record.subtotal);
  const discount = nonNegativeNumber(record.discount);
  const shipping = nonNegativeNumber(record.shipping);
  const tax = nonNegativeNumber(record.tax);
  const total = nonNegativeNumber(record.total);
  const taxRatePercent = nonNegativeNumber(record.taxRatePercent);
  if (
    subtotal === null ||
    discount === null ||
    shipping === null ||
    tax === null ||
    total === null ||
    taxRatePercent === null
  ) {
    return null;
  }

  return {
    subtotal,
    discount,
    shipping,
    shippingFree: record.shippingFree === true || shipping === 0,
    taxRatePercent,
    tax,
    total,
    coupon: coerceCoupon(record.coupon),
  };
}

/**
 * `POST /api/orders/preview` — prices the bag with an optional coupon without
 * placing an order. Used by checkout to show the discount before submitting.
 */
export async function previewOrder(
  input: PreviewOrderInput,
): Promise<PreviewOrderResult> {
  const response = await apiPostBody("/orders/preview", input);
  if (!response) {
    return { ok: false, error: NETWORK_ERROR_MESSAGE, status: 0 };
  }

  const body = await readRouteBody(response, "Failed to check this coupon.");
  if (body.ok !== true) {
    return {
      ok: false,
      error:
        typeof body.error === "string"
          ? body.error
          : "Failed to check this coupon.",
      status: response.status,
      unauthorized: body.unauthorized === true || response.status === 401,
    };
  }

  const preview = coercePreview(body.data);
  if (!preview) {
    return {
      ok: false,
      error: "The coupon check response was incomplete.",
      status: response.status,
    };
  }

  return { ok: true, preview };
}

/** `GET /api/orders/mine` — the signed-in customer's order history. */
export async function getMyOrders(): Promise<OrdersResult> {
  const response = await apiRequest("/orders/mine", { cache: "no-store" });
  if (!response) {
    return { ok: false, error: NETWORK_ERROR_MESSAGE };
  }

  const body = await readRouteBody(response, "Failed to load your orders.");
  if (body.ok !== true) {
    return {
      ok: false,
      error:
        typeof body.error === "string"
          ? body.error
          : "Failed to load your orders.",
      unauthorized: body.unauthorized === true || response.status === 401,
    };
  }

  if (!Array.isArray(body.data)) {
    return {
      ok: false,
      error: "The order history response was incomplete.",
    };
  }

  const orders = body.data
    .map(coerceOrder)
    .filter((order): order is OrderDetail => order !== null);

  return { ok: true, orders };
}

/**
 * `POST /api/orders/checkout` — converts the signed-in customer's server cart
 * into an order. The backend clears only the purchased items from the cart.
 */
export async function placeOrderFromCart(
  input: PlaceOrderInput,
): Promise<PlaceOrderResult> {
  const response = await apiPostBody("/orders/checkout", input);
  if (!response) {
    return { ok: false, error: NETWORK_ERROR_MESSAGE, status: 0 };
  }

  const body = await readRouteBody(response, "Failed to place your order.");
  if (body.ok !== true) {
    return {
      ok: false,
      error:
        typeof body.error === "string"
          ? body.error
          : "Failed to place your order.",
      status: response.status,
      unauthorized: body.unauthorized === true || response.status === 401,
    };
  }

  const order = coerceOrder(body.data);
  if (!order) {
    return {
      ok: false,
      error: "The order was placed, but its confirmation was incomplete.",
      status: response.status,
    };
  }

  return { ok: true, order };
}

/**
 * `POST /api/orders/guest` — places a signed-out shopper's local bag. The
 * backend validates products, stock and the coupon and computes every amount.
 */
export async function placeGuestOrder(
  input: PlaceGuestOrderInput,
): Promise<PlaceOrderResult> {
  const response = await apiPostBody("/orders/guest", input);
  if (!response) {
    return { ok: false, error: NETWORK_ERROR_MESSAGE, status: 0 };
  }

  const body = await readRouteBody(response, "Failed to place your order.");
  if (body.ok !== true) {
    return {
      ok: false,
      error:
        typeof body.error === "string"
          ? body.error
          : "Failed to place your order.",
      status: response.status,
      unauthorized: body.unauthorized === true || response.status === 401,
    };
  }

  const order = coerceOrder(body.data);
  if (!order) {
    return {
      ok: false,
      error: "The order was placed, but its confirmation was incomplete.",
      status: response.status,
    };
  }

  return {
    ok: true,
    order,
    ...(typeof body.lookupToken === "string"
      ? { lookupToken: body.lookupToken }
      : {}),
  };
}

/** `GET /api/orders/:orderNumber` — owner/admin order details. */
export async function getOrder(orderNumber: string): Promise<GetOrderResult> {
  const response = await apiRequest(
    `/orders/${encodeURIComponent(orderNumber)}`,
    { cache: "no-store" },
  );
  if (!response) {
    return { ok: false, error: NETWORK_ERROR_MESSAGE, status: 0 };
  }

  const body = await readRouteBody(response, "Failed to load this order.");
  if (body.ok !== true) {
    return {
      ok: false,
      error:
        typeof body.error === "string"
          ? body.error
          : "Failed to load this order.",
      status: response.status,
      unauthorized: body.unauthorized === true || response.status === 401,
      notFound: response.status === 404,
    };
  }

  const order = coerceOrder(body.data);
  if (!order) {
    return {
      ok: false,
      error: "The order response was incomplete.",
      status: response.status,
    };
  }
  return { ok: true, order };
}

/**
 * `POST /api/orders/lookup` — secure guest lookup by order number + email.
 * The backend returns the same generic 404 for unknown orders and mismatched
 * emails, so the UI cannot be used to enumerate order numbers.
 */
export async function lookupOrder(
  input: LookupOrderInput,
): Promise<GetOrderResult> {
  const response = await apiPostBody("/orders/lookup", input);
  if (!response) {
    return { ok: false, error: NETWORK_ERROR_MESSAGE, status: 0 };
  }

  const body = await readRouteBody(response, "We could not find that order.");
  if (body.ok !== true) {
    return {
      ok: false,
      error:
        typeof body.error === "string"
          ? body.error
          : "We could not find that order.",
      status: response.status,
      notFound: response.status === 404,
    };
  }

  const order = coerceOrder(body.data);
  if (!order) {
    return {
      ok: false,
      error: "The order response was incomplete.",
      status: response.status,
    };
  }
  return {
    ok: true,
    order,
    ...(typeof body.lookupToken === "string"
      ? { lookupToken: body.lookupToken }
      : {}),
  };
}

/**
 * Customers may cancel only orders that have not shipped yet. Admins can also
 * cancel `shipped` orders, but the storefront UI is customer-facing.
 */
export function isOrderCancellable(
  order: Pick<OrderDetail, "status">,
): boolean {
  return ["placed", "confirmed", "processing"].includes(order.status);
}

/**
 * `POST /api/orders/:orderNumber/cancel` — cancels an eligible order. The
 * backend restores stock exactly once and returns the updated order document.
 */
export async function cancelOrder(
  orderNumber: string,
): Promise<CancelOrderResult> {
  const response = await apiRequest(
    `/orders/${encodeURIComponent(orderNumber)}/cancel`,
    { method: "POST" },
  );
  if (!response) {
    return { ok: false, error: NETWORK_ERROR_MESSAGE, status: 0 };
  }

  const body = await readRouteBody(response, "Failed to cancel this order.");
  if (body.ok !== true) {
    return {
      ok: false,
      error:
        typeof body.error === "string"
          ? body.error
          : "Failed to cancel this order.",
      status: response.status,
      unauthorized: body.unauthorized === true || response.status === 401,
    };
  }

  const order = coerceOrder(body.data);
  if (!order) {
    return {
      ok: false,
      error: "The order was cancelled, but its update was incomplete.",
      status: response.status,
    };
  }

  return { ok: true, order };
}
