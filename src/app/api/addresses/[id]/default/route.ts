import { backendApi, backendProxyResponse } from "@/lib/server-api";

type AddressContext = { params: Promise<{ id: string }> };

const OBJECT_ID = /^[a-f0-9]{24}$/i;

/** POST /api/addresses/:id/default — make an owned address the default. */
export async function POST(_request: Request, context: AddressContext) {
  const { id } = await context.params;
  if (!OBJECT_ID.test(id)) {
    return Response.json({ ok: false, error: "Invalid address." }, { status: 400 });
  }

  return backendProxyResponse(
    await backendApi(
      `/addresses/${encodeURIComponent(id)}/default`,
      { method: "POST" },
      "required",
    ),
    "Failed to set the default address.",
  );
}
