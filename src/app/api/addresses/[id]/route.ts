import { backendApi, backendProxyResponse } from "@/lib/server-api";

type AddressContext = { params: Promise<{ id: string }> };

const OBJECT_ID = /^[a-f0-9]{24}$/i;

/** PUT /api/addresses/:id — update an owned address. */
export async function PUT(request: Request, context: AddressContext) {
  const { id } = await context.params;
  if (!OBJECT_ID.test(id)) {
    return Response.json({ ok: false, error: "Invalid address." }, { status: 400 });
  }

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
      `/addresses/${encodeURIComponent(id)}`,
      { method: "PUT", body: JSON.stringify(payload) },
      "required",
    ),
    "Failed to update this address.",
  );
}

/** DELETE /api/addresses/:id — remove an owned address. */
export async function DELETE(_request: Request, context: AddressContext) {
  const { id } = await context.params;
  if (!OBJECT_ID.test(id)) {
    return Response.json({ ok: false, error: "Invalid address." }, { status: 400 });
  }

  return backendProxyResponse(
    await backendApi(
      `/addresses/${encodeURIComponent(id)}`,
      { method: "DELETE" },
      "required",
    ),
    "Failed to delete this address.",
  );
}
