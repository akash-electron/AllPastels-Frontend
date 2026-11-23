import { backendApi, backendProxyResponse } from "@/lib/server-api";

/**
 * POST /api/orders/lookup — secure guest order lookup.
 *
 * Guests prove ownership with the order number and the email used at checkout,
 * or with a signed lookup token. The backend applies rate limiting and returns
 * a generic 404 for both unknown orders and mismatched credentials, preventing
 * order-number enumeration.
 */

const LOOKUP_TOKEN_REGEX = /^\d{9,11}\.[A-Za-z0-9_-]{43}$/;

interface LookupPayload {
  orderNumber?: unknown;
  email?: unknown;
  token?: unknown;
}

export async function POST(request: Request) {
  let payload: LookupPayload;
  try {
    payload = (await request.json()) as LookupPayload;
  } catch {
    return Response.json(
      { ok: false, error: "Please enter your order number and email." },
      { status: 400 },
    );
  }

  const hasValidEmail =
    typeof payload.email === "string" && payload.email.trim().length > 0;
  const hasValidToken =
    typeof payload.token === "string" &&
    LOOKUP_TOKEN_REGEX.test(payload.token.trim());

  if (
    typeof payload.orderNumber !== "string" ||
    !/^AP-\d{5}$/.test(payload.orderNumber.trim()) ||
    (!hasValidEmail && !hasValidToken)
  ) {
    return Response.json(
      { ok: false, error: "Please enter a valid order number and email." },
      { status: 400 },
    );
  }

  const body: { orderNumber: string; email?: string; token?: string } = {
    orderNumber: payload.orderNumber.trim(),
  };
  if (hasValidToken) {
    body.token = (payload.token as string).trim();
  } else {
    body.email = (payload.email as string).trim();
  }

  return backendProxyResponse(
    await backendApi(
      "/orders/lookup",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      "none",
    ),
    "We could not find that order.",
  );
}