/**
 * Payments service — online payment orchestration.
 *
 * Talks to this app's same-origin payment Route Handlers, which proxy to the
 * backend `/api/payments/*` endpoints.
 */

import {
  NETWORK_ERROR_MESSAGE,
  apiPostBody,
  apiRequest,
  readRouteBody,
} from "@/lib/api-client";

export type PaymentProvider = "razorpay" | "stripe";
export type PaymentMethodOption = "cod" | "razorpay" | "stripe";

export interface PaymentOptions {
  methods: PaymentMethodOption[];
  defaultOnline: PaymentProvider | null;
  razorpayKeyId: string | null;
}

export type PaymentOptionsResult =
  | { ok: true; options: PaymentOptions }
  | { ok: false; error: string };

export interface RazorpayStartData {
  provider: "razorpay";
  keyId: string;
  providerOrderId: string;
  amountMinor: number;
  currency: string;
  orderNumber: string;
  prefill: { name?: string; email?: string; contact?: string };
}

export interface StripeStartData {
  provider: "stripe";
  url: string;
  orderNumber: string;
}

export type StartPaymentData = RazorpayStartData | StripeStartData;

export type StartPaymentResult =
  | { ok: true; data: StartPaymentData }
  | { ok: false; error: string; status: number };

export interface VerifyRazorpayInput {
  orderNumber: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export type VerifyRazorpayResult =
  | { ok: true; pending: true }
  | {
      ok: true;
      data: { orderNumber: string; status: string; paymentStatus: string };
    }
  | { ok: false; error: string; status: number };

export interface ConfirmStripeInput {
  orderNumber: string;
  sessionId: string;
  lookupToken?: string;
}

export type ConfirmStripeResult =
  | { ok: true; pending?: true }
  | { ok: false; error: string; status: number };

function isPaymentMethodOption(value: unknown): value is PaymentMethodOption {
  return value === "cod" || value === "razorpay" || value === "stripe";
}

function coerceOptions(value: unknown): PaymentOptions | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.methods)) return null;
  const methods = record.methods.filter(isPaymentMethodOption);
  if (methods.length === 0) return null;

  const defaultOnline =
    record.defaultOnline === "razorpay" || record.defaultOnline === "stripe"
      ? record.defaultOnline
      : null;

  const razorpayKeyId =
    typeof record.razorpayKeyId === "string" ? record.razorpayKeyId : null;

  return { methods, defaultOnline, razorpayKeyId };
}

/** `GET /api/payments/options` — available payment methods. */
export async function getPaymentOptions(): Promise<PaymentOptionsResult> {
  const response = await apiRequest("/payments/options", { cache: "no-store" });
  if (!response) {
    return { ok: false, error: NETWORK_ERROR_MESSAGE };
  }

  const body = await readRouteBody(response, "Failed to load payment options.");
  if (body.ok !== true) {
    return {
      ok: false,
      error:
        typeof body.error === "string"
          ? body.error
          : "Failed to load payment options.",
    };
  }

  const options = coerceOptions(body.data);
  if (!options) {
    return {
      ok: false,
      error: "The payment options response was incomplete.",
    };
  }

  return { ok: true, options };
}

/** `POST /api/payments/start` — begins an online payment. */
export async function startPayment(input: {
  orderNumber: string;
  lookupToken?: string;
}): Promise<StartPaymentResult> {
  const response = await apiPostBody("/payments/start", input);
  if (!response) {
    return { ok: false, error: NETWORK_ERROR_MESSAGE, status: 0 };
  }

  const body = await readRouteBody(response, "Failed to start payment.");
  if (body.ok !== true) {
    return {
      ok: false,
      error:
        typeof body.error === "string" ? body.error : "Failed to start payment.",
      status: response.status,
    };
  }

  const data = body.data;
  if (!data || typeof data !== "object") {
    return {
      ok: false,
      error: "The payment start response was incomplete.",
      status: response.status,
    };
  }
  const record = data as Record<string, unknown>;

  if (record.provider === "razorpay") {
    const keyId = typeof record.keyId === "string" ? record.keyId : null;
    const providerOrderId =
      typeof record.providerOrderId === "string" ? record.providerOrderId : null;
    const amountMinor =
      typeof record.amountMinor === "number" && Number.isFinite(record.amountMinor)
        ? record.amountMinor
        : null;
    const currency = typeof record.currency === "string" ? record.currency : null;
    const orderNumber =
      typeof record.orderNumber === "string" ? record.orderNumber : null;
    if (!keyId || !providerOrderId || amountMinor === null || !currency || !orderNumber) {
      return {
        ok: false,
        error: "The payment start response was incomplete.",
        status: response.status,
      };
    }
    const prefillRaw = record.prefill;
    const prefillRecord =
      prefillRaw && typeof prefillRaw === "object"
        ? (prefillRaw as Record<string, unknown>)
        : {};
    const prefill = {
      name: typeof prefillRecord.name === "string" ? prefillRecord.name : undefined,
      email: typeof prefillRecord.email === "string" ? prefillRecord.email : undefined,
      contact:
        typeof prefillRecord.contact === "string" ? prefillRecord.contact : undefined,
    };
    return {
      ok: true,
      data: {
        provider: "razorpay",
        keyId,
        providerOrderId,
        amountMinor,
        currency,
        orderNumber,
        prefill,
      },
    };
  }

  if (record.provider === "stripe") {
    const url = typeof record.url === "string" ? record.url : null;
    const orderNumber =
      typeof record.orderNumber === "string" ? record.orderNumber : null;
    if (!url || !orderNumber) {
      return {
        ok: false,
        error: "The payment start response was incomplete.",
        status: response.status,
      };
    }
    return {
      ok: true,
      data: { provider: "stripe", url, orderNumber },
    };
  }

  return {
    ok: false,
    error: "The payment start response was incomplete.",
    status: response.status,
  };
}

/** `POST /api/payments/razorpay/verify` — verifies a Razorpay payment. */
export async function verifyRazorpay(
  input: VerifyRazorpayInput,
): Promise<VerifyRazorpayResult> {
  const response = await apiPostBody("/payments/razorpay/verify", input);
  if (!response) {
    return { ok: false, error: NETWORK_ERROR_MESSAGE, status: 0 };
  }

  if (response.status === 202) {
    return { ok: true, pending: true };
  }

  const body = await readRouteBody(response, "Failed to verify payment.");
  if (body.ok !== true) {
    return {
      ok: false,
      error:
        typeof body.error === "string" ? body.error : "Failed to verify payment.",
      status: response.status,
    };
  }

  const data = body.data;
  if (!data || typeof data !== "object") {
    return { ok: true, data: { orderNumber: input.orderNumber, status: "placed", paymentStatus: "pending" } };
  }
  const record = data as Record<string, unknown>;
  return {
    ok: true,
    data: {
      orderNumber:
        typeof record.orderNumber === "string" ? record.orderNumber : input.orderNumber,
      status: typeof record.status === "string" ? record.status : "placed",
      paymentStatus:
        typeof record.paymentStatus === "string" ? record.paymentStatus : "pending",
    },
  };
}

/** `POST /api/payments/stripe/confirm` — confirms a Stripe session. */
export async function confirmStripe(
  input: ConfirmStripeInput,
): Promise<ConfirmStripeResult> {
  const response = await apiPostBody("/payments/stripe/confirm", input);
  if (!response) {
    return { ok: false, error: NETWORK_ERROR_MESSAGE, status: 0 };
  }

  if (response.status === 202) {
    return { ok: true, pending: true };
  }

  const body = await readRouteBody(response, "Failed to confirm payment.");
  if (body.ok !== true) {
    return {
      ok: false,
      error:
        typeof body.error === "string" ? body.error : "Failed to confirm payment.",
      status: response.status,
    };
  }

  return { ok: true };
}
