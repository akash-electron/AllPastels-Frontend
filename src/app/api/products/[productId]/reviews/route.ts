import { backendApi, backendProxyResponse } from "@/lib/server-api";
import { parseReviewInput } from "@/lib/review-input";

/**
 * GET  /api/products/:productId/reviews — public, paginated review listing.
 * POST /api/products/:productId/reviews — authenticated review submission.
 *
 * The backend enforces one review per customer per product and recomputes the
 * product's rating aggregate after every mutation.
 */

type ReviewsContext = { params: Promise<{ productId: string }> };

export async function GET(request: Request, context: ReviewsContext) {
  const { productId } = await context.params;
  const url = new URL(request.url);
  const page = url.searchParams.get("page") ?? "1";
  const limit = url.searchParams.get("limit") ?? "6";
  const sort = url.searchParams.get("sort") ?? "newest";

  const query = new URLSearchParams({ page, limit, sort });

  return backendProxyResponse(
    await backendApi(
      `/products/${encodeURIComponent(productId)}/reviews?${query}`,
      { method: "GET" },
      "optional",
    ),
    "Failed to load reviews.",
  );
}

export async function POST(request: Request, context: ReviewsContext) {
  const { productId } = await context.params;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "Please write a valid review." },
      { status: 400 },
    );
  }

  const input = parseReviewInput(payload);
  if (!input) {
    return Response.json(
      {
        ok: false,
        error:
          "Choose a star rating and add a title and review between 10 and 2000 characters.",
      },
      { status: 400 },
    );
  }

  return backendProxyResponse(
    await backendApi(`/products/${encodeURIComponent(productId)}/reviews`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
    "Failed to submit your review.",
  );
}
