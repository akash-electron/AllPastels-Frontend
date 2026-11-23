import { backendMessage, backendPost } from "@/lib/server-auth";

export async function POST(request: Request) {
  let payload: { phone?: unknown };
  try {
    payload = (await request.json()) as { phone?: unknown };
  } catch {
    return Response.json({ ok: false, error: "Please try again." }, { status: 400 });
  }
  if (typeof payload.phone !== "string" || !payload.phone.trim()) {
    return Response.json(
      { ok: false, error: "Mobile number is required." },
      { status: 400 },
    );
  }

  const backend = await backendPost("/otp/request", { phone: payload.phone.trim() });

  if (!backend) {
    return Response.json(
      { ok: false, error: "We could not reach the boutique — please try again." },
      { status: 502 },
    );
  }

  if (!backend.body.success) {
    const status =
      backend.status === 429
        ? 429
        : backend.status >= 500 && backend.status !== 503
          ? 502
          : backend.status;
    const retryAfter =
      typeof (backend.body as { retryAfter?: unknown }).retryAfter === "number"
        ? (backend.body as { retryAfter: number }).retryAfter
        : undefined;
    return Response.json(
      {
        ok: false,
        error: backendMessage(backend.body, "Could not send the code."),
        ...(retryAfter !== undefined ? { retryAfter } : {}),
      },
      { status },
    );
  }

  const body = backend.body as {
    message?: unknown;
    expiresIn?: unknown;
    resendIn?: unknown;
  };
  return Response.json({
    ok: true,
    message: typeof body.message === "string" ? body.message : "Code sent.",
    expiresIn: typeof body.expiresIn === "number" ? body.expiresIn : 300,
    resendIn: typeof body.resendIn === "number" ? body.resendIn : 60,
  });
}