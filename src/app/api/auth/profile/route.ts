import { backendApi, backendProxyResponse } from "@/lib/server-api";

/**
 * PUT /api/auth/profile — update the signed-in customer's own profile.
 *
 * The Route Handler owns the Bearer token, so the backend can resolve the
 * customer from the JWT and never trusts a client-supplied user id.
 */
export async function PUT(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "Please complete your profile details." },
      { status: 400 },
    );
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return Response.json(
      { ok: false, error: "Please complete your profile details." },
      { status: 400 },
    );
  }

  return backendProxyResponse(
    await backendApi(
      "/auth/profile",
      { method: "PUT", body: JSON.stringify(payload) },
      "required",
    ),
    "Failed to update your profile.",
  );
}
