import { backendApi, backendProxyResponse } from "@/lib/server-api";

/**
 * POST /api/orders/checkout — places the signed-in customer's cart as an
 * order. The body is forwarded to the backend, which validates the address,
 * coupon and stock and computes every amount.
 */

interface CheckoutPayload {
  shippingAddress?: unknown;
  shippingAddressId?: unknown;
  couponCode?: unknown;
  paymentMethod?: unknown;
  paymentProvider?: unknown;
  idempotencyKey?: unknown;
}

const OBJECT_ID = /^[a-f0-9]{24}$/i;

export async function POST(request: Request) {
  let payload: CheckoutPayload;
  try {
    payload = (await request.json()) as CheckoutPayload;
  } catch {
    return Response.json(
      { ok: false, error: "Please complete your delivery details." },
      { status: 400 },
    );
  }

  const hasSavedAddressId =
    typeof payload.shippingAddressId === "string" &&
    OBJECT_ID.test(payload.shippingAddressId);

  if (
    !hasSavedAddressId &&
    (!payload.shippingAddress ||
      typeof payload.shippingAddress !== "object" ||
      Array.isArray(payload.shippingAddress))
  ) {
    return Response.json(
      { ok: false, error: "A delivery address is required." },
      { status: 400 },
    );
  }

  if (payload.shippingAddressId !== undefined && !hasSavedAddressId) {
    return Response.json(
      { ok: false, error: "Invalid saved address." },
      { status: 400 },
    );
  }

  const forwarded: {
    shippingAddress?: unknown;
    shippingAddressId?: string;
    couponCode?: string;
    paymentMethod?: "cod" | "online";
    paymentProvider?: "razorpay" | "stripe";
    idempotencyKey?: string;
  } = {};

  if (payload.shippingAddress && typeof payload.shippingAddress === "object") {
    forwarded.shippingAddress = payload.shippingAddress;
  }
  if (hasSavedAddressId) {
    forwarded.shippingAddressId = payload.shippingAddressId as string;
  }

  if (payload.couponCode !== undefined) {
    if (typeof payload.couponCode !== "string") {
      return Response.json(
        { ok: false, error: "Invalid coupon code." },
        { status: 400 },
      );
    }
    if (payload.couponCode.trim()) {
      forwarded.couponCode = payload.couponCode;
    }
  }

  if (payload.paymentMethod !== undefined) {
    if (payload.paymentMethod !== "cod" && payload.paymentMethod !== "online") {
      return Response.json(
        { ok: false, error: "Invalid payment method." },
        { status: 400 },
      );
    }
    forwarded.paymentMethod = payload.paymentMethod;
  }

  if (payload.paymentProvider !== undefined) {
    if (
      payload.paymentProvider !== "razorpay" &&
      payload.paymentProvider !== "stripe"
    ) {
      return Response.json(
        { ok: false, error: "Invalid payment provider." },
        { status: 400 },
      );
    }
    forwarded.paymentProvider = payload.paymentProvider;
  }

  if (payload.idempotencyKey !== undefined) {
    if (
      typeof payload.idempotencyKey !== "string" ||
      payload.idempotencyKey.trim().length < 8 ||
      payload.idempotencyKey.trim().length > 120
    ) {
      return Response.json(
        { ok: false, error: "Invalid checkout attempt." },
        { status: 400 },
      );
    }
    forwarded.idempotencyKey = payload.idempotencyKey.trim();
  }

  return backendProxyResponse(
    await backendApi(
      "/orders/checkout",
      {
        method: "POST",
        body: JSON.stringify(forwarded),
      },
      "required",
    ),
    "Failed to place your order.",
  );
}
