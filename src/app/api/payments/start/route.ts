import { backendApi, backendProxyResponse } from "@/lib/server-api";

/**
 * POST /api/payments/start — begins an online payment for an existing order.
 */

interface StartPayload {
  orderNumber?: unknown;
  lookupToken?: unknown;
}

const LOOKUP_TOKEN_REGEX = /^\d{9,11}\.[A-Za-z0-9_-]{43}$/;

export async function POST(request: Request) {
  let payload: StartPayload;
  try {
    payload = (await request.json()) as StartPayload;
  } catch {
    return Response.json(
      { ok: false, error: "Invalid payment request." },
      { status: 400 },
    );
  }

  if (typeof payload.orderNumber !== "string" || !payload.orderNumber.trim()) {
    return Response.json(
      { ok: false, error: "Invalid order number." },
      { status: 400 },
    );
  }

  const forwarded: { orderNumber: string; lookupToken?: string } = {
    orderNumber: payload.orderNumber.trim(),
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

  return backendProxyResponse(
    await backendApi(
      "/payments/start",
      {
        method: "POST",
        body: JSON.stringify(forwarded),
      },
      "optional",
    ),
    "Failed to start payment.",
  );
}
