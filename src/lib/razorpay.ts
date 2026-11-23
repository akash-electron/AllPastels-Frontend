"use client";

import { verifyRazorpay } from "@/api/payments/payments.api";

export interface RazorpayPrefill {
  name?: string;
  email?: string;
  contact?: string;
}

export interface OpenRazorpayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  orderNumber: string;
  prefill?: RazorpayPrefill;
}

export type RazorpayResult = {
  status: "paid" | "pending" | "dismissed" | "error";
  message?: string;
};

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open(): void;
  on(event: string, handler: (response: unknown) => void): void;
}

interface RazorpayConstructor {
  new (options: Record<string, unknown>): RazorpayInstance;
}

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

let loadPromise: Promise<boolean> | null = null;

export function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (typeof window.Razorpay === "function") return Promise.resolve(true);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      resolve(typeof window.Razorpay === "function");
    };
    script.onerror = () => {
      loadPromise = null;
      resolve(false);
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

export async function openRazorpay(
  opts: OpenRazorpayOptions,
): Promise<RazorpayResult> {
  const loaded = await loadRazorpay();
  const RazorpayCtor = window.Razorpay;
  if (!loaded || typeof RazorpayCtor !== "function") {
    return { status: "error", message: "Could not load Razorpay checkout." };
  }

  return new Promise<RazorpayResult>((resolve) => {
    let settled = false;
    const finish = (result: RazorpayResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const instance = new RazorpayCtor({
      key: opts.key,
      order_id: opts.order_id,
      amount: opts.amount,
      currency: opts.currency,
      name: "AllPastels",
      description: opts.orderNumber,
      prefill: opts.prefill,
      theme: { color: "#dc7954" },
      handler: async (response: RazorpayResponse) => {
        try {
          const result = await verifyRazorpay({
            orderNumber: opts.orderNumber,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          if (!result.ok) {
            finish({ status: "error", message: result.error });
            return;
          }
          if ("pending" in result && result.pending) {
            finish({ status: "pending" });
            return;
          }
          finish({ status: "paid" });
        } catch {
          finish({ status: "error", message: "Payment verification failed." });
        }
      },
      modal: {
        ondismiss: () => finish({ status: "dismissed" }),
      },
    });

    try {
      instance.on("payment.failed", (response: unknown) => {
        let message = "Payment failed.";
        if (response && typeof response === "object") {
          const error = (response as { error?: { description?: unknown } }).error;
          if (error && typeof error.description === "string") {
            message = error.description;
          }
        }
        finish({ status: "error", message });
      });
    } catch {
      // ignore
    }

    instance.open();
  });
}
