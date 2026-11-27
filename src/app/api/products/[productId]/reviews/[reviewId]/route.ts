import { backendApi, backendProxyResponse } from "@/lib/server-api";
import { parseReviewInput } from "@/lib/review-input";

/** PUT /api/products/:productId/reviews/:reviewId — edit an owned review. */
export async function PUT(request: Request, context: ReviewContext) {
  const { productId, reviewId } = await context.params;

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
    await backendApi(
      `/products/${encodeURIComponent(productId)}/reviews/${encodeURIComponent(reviewId)}`,
      { method: "PUT", body: JSON.stringify(input) },
    ),
    "Failed to update your review.",
  );
}

/** DELETE /api/products/:productId/reviews/:reviewId — remove an owned review. */
export async function DELETE(_request: Request, context: ReviewContext) {
  const { productId, reviewId } = await context.params;

  return backendProxyResponse(
    await backendApi(
      `/products/${encodeURIComponent(productId)}/reviews/${encodeURIComponent(reviewId)}`,
      { method: "DELETE" },
    ),
    "Failed to delete your review.",
  );
}

type ReviewContext = { params: Promise<{ productId: string; reviewId: string }> };
