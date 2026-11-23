import { backendApi } from "@/lib/server-api";

interface ContactPayload {
  name?: unknown;
  email?: unknown;
  topic?: unknown;
  message?: unknown;
  orderNumber?: unknown;
  website?: unknown;
}

const CONTACT_KEYS = [
  "name",
  "email",
  "topic",
  "message",
  "orderNumber",
  "website",
] as const;

const FALLBACK_ERROR = "We couldn't send your message. Please try again.";

export async function POST(request: Request) {
  let payload: ContactPayload;
  try {
    payload = (await request.json()) as ContactPayload;
  } catch {
    return Response.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const body: Record<string, string> = {};
  for (const key of CONTACT_KEYS) {
    const value = payload[key];
    if (typeof value === "string") {
      body[key] = value;
    }
  }

  const result = await backendApi(
    "/contact",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    "none",
  );

  if (!result) {
    return Response.json({ ok: false, error: FALLBACK_ERROR }, { status: 502 });
  }

  const backendMessage =
    typeof result.body.message === "string" && result.body.message.trim()
      ? result.body.message
      : FALLBACK_ERROR;

  if (result.status === 202) {
    const message =
      typeof result.body.message === "string" ? result.body.message : "";
    return Response.json({ ok: true, message }, { status: 200 });
  }

  if (result.status === 400) {
    const rawErrors = result.body.errors;
    const fieldErrors =
      rawErrors && typeof rawErrors === "object" && !Array.isArray(rawErrors)
        ? (rawErrors as Record<string, string>)
        : {};
    return Response.json(
      { ok: false, error: backendMessage, fieldErrors },
      { status: 400 },
    );
  }

  if (result.status === 429) {
    return Response.json({ ok: false, error: backendMessage }, { status: 429 });
  }

  if (result.status >= 500) {
    return Response.json({ ok: false, error: FALLBACK_ERROR }, { status: 502 });
  }

  return Response.json({ ok: false, error: FALLBACK_ERROR }, { status: 502 });
}