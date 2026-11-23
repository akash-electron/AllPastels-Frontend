"use client";

import { startPayment } from "@/api/payments/payments.api";
import { openRazorpay } from "@/lib/razorpay";

export type PayOrderResult = {
  status: "paid" | "pending" | "dismissed" | "error";
  message?: string;
};

export async function payOrder(input: {
  orderNumber: string;
  lookupToken?: string;
}): Promise<PayOrderResult> {
  const result = await startPayment(input);
  if (!result.ok) {
    return { status: "error", message: result.error };
  }

  const data = result.data;
  if (data.provider === "razorpay") {
    return openRazorpay({
      key: data.keyId,
      order_id: data.providerOrderId,
      amount: data.amountMinor,
      currency: data.currency,
      orderNumber: data.orderNumber,
      prefill: data.prefill,
    });
  }

  // Only ever send the shopper to Stripe's own hosted checkout.
  let target: URL;
  try {
    target = new URL(data.url);
  } catch {
    return { status: "error", message: "Could not open the payment page." };
  }
  if (target.protocol !== "https:" || target.hostname !== "checkout.stripe.com") {
    return { status: "error", message: "Could not open the payment page." };
  }

  try {
    window.location.assign(target.toString());
  } catch {
    return { status: "error", message: "Could not open the payment page." };
  }

  // Keep the promise pending so the redirect is not raced by client-side
  // navigation; the browser unloads this page on the way to Stripe.
  await new Promise<void>(() => {});
  return { status: "pending" };
}
