import { backendApi } from "@/lib/server-api";

/**
 * POST /api/payments/razorpay/verify — verifies a Razorpay payment signature.
 *
 * A 202 response is preserved as `{ ok: true, pending: true }`.
 */

interface VerifyPayload {
  orderNumber?: unknown;
  razorpay_order_id?: unknown;
  razorpay_payment_id?: unknown;
  razorpay_signature?: unknown;
}

export async function POST(request: Request) {
  let payload: VerifyPayload;
  try {
    payload = (await request.json()) as VerifyPayload;
  } catch {
    return Response.json(
      { ok: false, error: "Invalid verification request." },
      { status: 400 },
    );
  }

  if (
    typeof payload.orderNumber !== "string" ||
    !payload.orderNumber.trim() ||
    typeof payload.razorpay_order_id !== "string" ||
    !payload.razorpay_order_id.trim() ||
    typeof payload.razorpay_payment_id !== "string" ||
    !payload.razorpay_payment_id.trim() ||
    typeof payload.razorpay_signature !== "string" ||
    !payload.razorpay_signature.trim()
  ) {
    return Response.json(
      { ok: false, error: "Invalid verification details." },
      { status: 400 },
    );
  }

  const forwarded = {
    orderNumber: payload.orderNumber.trim(),
    razorpay_order_id: payload.razorpay_order_id.trim(),
    razorpay_payment_id: payload.razorpay_payment_id.trim(),
    razorpay_signature: payload.razorpay_signature.trim(),
  };

  const result = await backendApi(
    "/payments/razorpay/verify",
    {
      method: "POST",
      body: JSON.stringify(forwarded),
    },
    "optional",
  );

  if (!result) {
    return Response.json(
      { ok: false, error: "We could not reach the boutique — please try again." },
      { status: 502 },
    );
  }

  const message =
    typeof result.body.message === "string" && result.body.message.trim()
      ? result.body.message
      : "Failed to verify payment.";

  if (result.status === 202) {
    return Response.json({ ok: true, pending: true }, { status: 202 });
  }

  if (result.body.success === true) {
    return Response.json(
      { ok: true, data: result.body.data },
      { status: result.status },
    );
  }

  return Response.json({ ok: false, error: message }, { status: result.status });
}
