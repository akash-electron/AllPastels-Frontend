import { backendApi } from "@/lib/server-api";

/**
 * POST /api/payments/stripe/confirm — confirms a Stripe checkout session.
 *
 * A 202 response is preserved as `{ ok: true, pending: true }`.
 */

interface ConfirmPayload {
  orderNumber?: unknown;
  sessionId?: unknown;
  lookupToken?: unknown;
}

const LOOKUP_TOKEN_REGEX = /^\d{9,11}\.[A-Za-z0-9_-]{43}$/;

export async function POST(request: Request) {
  let payload: ConfirmPayload;
  try {
    payload = (await request.json()) as ConfirmPayload;
  } catch {
    return Response.json(
      { ok: false, error: "Invalid confirmation request." },
      { status: 400 },
    );
  }

  if (
    typeof payload.orderNumber !== "string" ||
    !payload.orderNumber.trim() ||
    typeof payload.sessionId !== "string" ||
    !payload.sessionId.trim()
  ) {
    return Response.json(
      { ok: false, error: "Invalid confirmation details." },
      { status: 400 },
    );
  }

  const forwarded: { orderNumber: string; sessionId: string; lookupToken?: string } = {
    orderNumber: payload.orderNumber.trim(),
    sessionId: payload.sessionId.trim(),
  };

  if (payload.lookupToken !== undefined) {
    if (
      typeof payload.lookupToken !== "string" ||
      !LOOKUP_TOKEN_REGEX.test(payload.lookupToken.trim())
    ) {
      return Response.json(
        { ok: false, error: "Invalid lookup token." },
        { status: 400 },
      );
    }
    forwarded.lookupToken = payload.lookupToken.trim();
  }

  const result = await backendApi(
    "/payments/stripe/confirm",
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
      : "Failed to confirm payment.";

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
