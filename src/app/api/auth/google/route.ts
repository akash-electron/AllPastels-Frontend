import {
  backendMessage,
  backendPost,
  coerceUser,
  setSessionCookie,
} from "@/lib/server-auth";

export async function POST(request: Request) {
  let payload: { idToken?: unknown };
  try {
    payload = (await request.json()) as { idToken?: unknown };
  } catch {
    return Response.json({ ok: false, error: "Please try again." }, { status: 400 });
  }
  if (
    typeof payload.idToken !== "string" ||
    payload.idToken.length < 20 ||
    payload.idToken.length > 4096
  ) {
    return Response.json(
      { ok: false, error: "Google sign-in token is missing or invalid." },
      { status: 400 },
    );
  }

  const backend = await backendPost("/google", { idToken: payload.idToken });

  if (!backend) {
    return Response.json(
      { ok: false, error: "We could not reach the boutique — please try again." },
      { status: 502 },
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
      { ok: false, error: backendMessage(backend.body, "Google sign-in did not complete.") },
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

  return Response.json({ ok: true, user });
}