import {
  backendMessage,
  backendPost,
  coerceUser,
  setSessionCookie,
} from "@/lib/server-auth";

export async function POST(request: Request) {
  let payload: { phone?: unknown; code?: unknown; name?: unknown };
  try {
    payload = (await request.json()) as {
      phone?: unknown;
      code?: unknown;
      name?: unknown;
    };
  } catch {
    return Response.json({ ok: false, error: "Please try again." }, { status: 400 });
  }
  if (typeof payload.phone !== "string" || !payload.phone.trim()) {
    return Response.json(
      { ok: false, error: "Mobile number is required." },
      { status: 400 },
    );
  }
  if (typeof payload.code !== "string" || !payload.code.trim()) {
    return Response.json(
      { ok: false, error: "Code is required." },
      { status: 400 },
    );
  }

  const body: Record<string, unknown> = {
    phone: payload.phone.trim(),
    code: payload.code.trim(),
  };
  if (typeof payload.name === "string" && payload.name.trim()) {
    body.name = payload.name.trim();
  }

  const backend = await backendPost("/otp/verify", body);

  if (!backend) {
    return Response.json(
      { ok: false, error: "We could not reach the boutique — please try again." },
      { status: 502 },
    );
  }

  const backendCode = (backend.body as { code?: unknown }).code;

  // NAME_REQUIRED — the backend wants a name for this new phone user.
  if (backend.status === 400 && backendCode === "NAME_REQUIRED") {
    return Response.json(
      {
        ok: false,
        nameRequired: true,
        error: backendMessage(backend.body, "Please tell us your name."),
      },
      { status: 400 },
    );
  }

  if (!backend.body.success || typeof backend.body.token !== "string") {
    const status =
      backend.status === 429
        ? 429
        : backend.status >= 500 && backend.status !== 503
          ? 502
          : backend.status;
    return Response.json(
      { ok: false, error: backendMessage(backend.body, "Verification did not complete.") },
      { status },
    );
  }

  await setSessionCookie(backend.body.token);

  const user = coerceUser(backend.body.data) ?? {
    id: "",
    name: "",
    email: null,
    isEmailVerified: false,
  };
  const isNewUser = (backend.body as { isNewUser?: unknown }).isNewUser === true;

  return Response.json({ ok: true, user, isNewUser });
}