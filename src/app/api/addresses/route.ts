import { backendApi, backendProxyResponse } from "@/lib/server-api";

/** GET /api/addresses — the signed-in customer's address book. */
export async function GET() {
  return backendProxyResponse(
    await backendApi("/addresses", { method: "GET" }, "required"),
    "Failed to load your addresses.",
  );
}

/** POST /api/addresses — add an address to the signed-in customer's book. */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "Please complete the address details." },
      { status: 400 },
    );
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return Response.json(
      { ok: false, error: "Please complete the address details." },
      { status: 400 },
    );
  }

  return backendProxyResponse(
    await backendApi(
      "/addresses",
      { method: "POST", body: JSON.stringify(payload) },
      "required",
    ),
    "Failed to save this address.",
  );
}
