import { backendApi, backendProxyResponse } from "@/lib/server-api";

/**
 * POST /api/orders/guest — places a signed-out shopper's local bag through the
 * backend's public order endpoint. Items and the coupon are validated and
 * priced server-side; any client-supplied totals are ignored.
 */

interface GuestOrderPayload {
  items?: unknown;
  shippingAddress?: unknown;
  couponCode?: unknown;
  customerEmail?: unknown;
  paymentMethod?: unknown;
  paymentProvider?: unknown;
  idempotencyKey?: unknown;
}

const MAX_GUEST_ITEMS = 100;

export async function POST(request: Request) {
  let payload: GuestOrderPayload;
  try {
    payload = (await request.json()) as GuestOrderPayload;
  } catch {
    return Response.json(
      { ok: false, error: "Your bag could not be read. Please try again." },
      { status: 400 },
    );
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    return Response.json(
      { ok: false, error: "Your bag is empty." },
      { status: 400 },
    );
  }

  if (payload.items.length > MAX_GUEST_ITEMS) {
    return Response.json(
      { ok: false, error: "Your bag has too many different items." },
      { status: 400 },
    );
  }

  const items: { productId: string; qty: number; size?: string }[] = [];
  for (const value of payload.items) {
    if (!value || typeof value !== "object") {
      return Response.json(
        { ok: false, error: "One of the items in your bag is invalid." },
        { status: 400 },
      );
    }

    const item = value as Record<string, unknown>;
    if (
      typeof item.productId !== "string" ||
      !item.productId ||
      typeof item.qty !== "number" ||
      !Number.isInteger(item.qty) ||
      item.qty <= 0
    ) {
      return Response.json(
        { ok: false, error: "One of the items in your bag is invalid." },
        { status: 400 },
      );
    }

    if (
      item.size !== undefined &&
      (typeof item.size !== "string" || item.size.length > 40)
    ) {
      return Response.json(
        { ok: false, error: "One of the item sizes is invalid." },
        { status: 400 },
      );
    }

    const line: { productId: string; qty: number; size?: string } = {
      productId: item.productId,
      qty: item.qty,
    };
    if (typeof item.size === "string" && item.size.trim()) {
      line.size = item.size.trim();
    }
    items.push(line);
  }

  const forwarded: {
    items: { productId: string; qty: number; size?: string }[];
    shippingAddress?: unknown;
    couponCode?: string;
    customerEmail?: string;
    paymentMethod?: "cod" | "online";
    paymentProvider?: "razorpay" | "stripe";
    idempotencyKey?: string;
  } = { items };

  if (
    payload.shippingAddress &&
    typeof payload.shippingAddress === "object" &&
    !Array.isArray(payload.shippingAddress)
  ) {
    forwarded.shippingAddress = payload.shippingAddress;
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

  if (payload.customerEmail !== undefined) {
    if (typeof payload.customerEmail !== "string") {
      return Response.json(
        { ok: false, error: "Invalid email address." },
        { status: 400 },
      );
    }
    if (payload.customerEmail.trim()) {
      forwarded.customerEmail = payload.customerEmail.trim();
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
      "/orders",
      {
        method: "POST",
        body: JSON.stringify(forwarded),
      },
      "optional",
    ),
    "Failed to place your order.",
  );
}
