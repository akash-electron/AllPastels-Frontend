"use client";

import { useCallback, useEffect, useState } from "react";
import { PdpModal } from "@/components/product/PdpModal";
import { Rating } from "@/components/ui/Rating";
import { Button } from "@/components/ui/Button";
import { CheckIcon, StarIcon } from "@/components/ui/icons";
import { useAuth } from "@/components/store/AuthProvider";
import {
  createProductReview,
  deleteProductReview,
  getMyProductReview,
  getProductReviews,
  updateProductReview,
} from "@/api/reviews/reviews.api";
import { pluralize } from "@/lib/utils";
import type { Product } from "@/lib/types";
import type {
  ApiReview,
  ReviewInput,
  ReviewListPayload,
} from "@/types/review";

const PAGE_SIZE = 6;

type SubmitResult = { ok: true } | { ok: false; error: string };

/**
 * ProductReviews — real, database-backed ratings and reviews.
 *
 * The summary renders from the product's denormalised aggregate immediately,
 * then upgrades to the exact server summary once the listing resolves. Signed-in
 * customers get one review per product, enforced by the backend; the form
 * switches between "write" and "edit" based on their existing review.
 */
export function ProductReviews({ product }: { product: Product }) {
  const { session, hydrated } = useAuth();
  const [list, setList] = useState<ReviewListPayload | null>(null);
  const [mine, setMine] = useState<{
    owner: string;
    review: ApiReview | null;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadPage = useCallback(
    async (targetPage: number) => {
      const result = await getProductReviews(product.id, targetPage, PAGE_SIZE);
      if (result.ok) {
        setList(result.data);
        setError(null);
        return result.data;
      }
      setError(result.error);
      return null;
    },
    [product.id],
  );

  const owner = session?.email ?? null;
  const currentReview =
    owner && mine && mine.owner === owner ? mine.review : null;

  useEffect(() => {
    let active = true;
    void getProductReviews(product.id, page, PAGE_SIZE).then((result) => {
      if (!active) return;
      if (result.ok) {
        setList(result.data);
        setError(null);
      } else {
        setError(result.error);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [product.id, page]);

  useEffect(() => {
    if (!hydrated || !owner) return;
    let active = true;
    void getMyProductReview(product.id).then((result) => {
      if (active && result.ok) {
        setMine({ owner, review: result.data.review });
      }
    });
    return () => {
      active = false;
    };
  }, [hydrated, owner, product.id]);

  const handleSubmit = async (input: ReviewInput): Promise<SubmitResult> => {
    const existing = currentReview;
    const result = existing
      ? await updateProductReview(product.id, existing.id, input)
      : await createProductReview(product.id, input);

    if (!result.ok) return { ok: false, error: result.error };

    setMine({ owner: owner ?? "", review: result.data.review });
    setActionError(null);
    setNotice(existing ? "Your review has been updated." : "Thank you — your review is live.");
    const targetPage = existing ? page : 1;
    if (page !== targetPage) setPage(targetPage);
    else void loadPage(targetPage);
    return { ok: true };
  };

  const handleDelete = async () => {
    const existing = currentReview;
    if (!existing) return;
    setDeleting(true);
    const result = await deleteProductReview(product.id, existing.id);
    setDeleting(false);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    setActionError(null);
    setMine(owner ? { owner, review: null } : null);
    setNotice("Your review has been removed.");
    if (page !== 1) setPage(1);
    else void loadPage(1);
  };

  const summary = list ?? {
    average: product.rating,
    total: product.reviewCount,
    breakdown: [],
    recommended: 0,
    reviews: [],
    page: 1,
    limit: PAGE_SIZE,
    pageCount: 1,
  };

  return (
    <section className="border-t border-line" id="reviews">
      <div className="grid gap-10 py-14 lg:grid-cols-12 lg:gap-8 lg:py-20">
        <Summary
          average={summary.average}
          total={summary.total}
          breakdown={summary.breakdown}
          recommended={summary.recommended}
          signedIn={Boolean(session)}
          hydrated={hydrated}
          hasMine={currentReview !== null}
          onWrite={() => {
            setNotice(null);
            setFormOpen(true);
          }}
        />
        <ReviewList
          reviews={list?.reviews ?? []}
          loading={loading && !list}
          error={!list ? error : null}
          mineId={currentReview?.id ?? null}
          signedIn={Boolean(session)}
          hydrated={hydrated}
          deleting={deleting}
          notice={notice}
          actionError={actionError}
          onRetry={() => {
            setLoading(true);
            void loadPage(page).finally(() => setLoading(false));
          }}
          onWrite={() => {
            setNotice(null);
            setFormOpen(true);
          }}
          onEdit={() => {
            setNotice(null);
            setFormOpen(true);
          }}
          onDelete={handleDelete}
        />
      </div>

      {list && list.pageCount > 1 && (
        <div className="flex items-center justify-between gap-4 border-t border-line py-6">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          <p className="ap-eyebrow tabular-nums text-ink/60">
            Page {list.page} of {list.pageCount}
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= list.pageCount}
            onClick={() => setPage((current) => Math.min(list.pageCount, current + 1))}
          >
            Next
          </Button>
        </div>
      )}

      {formOpen && (
        <WriteReviewForm
          product={product}
          existing={currentReview}
          onClose={() => setFormOpen(false)}
          onSubmit={handleSubmit}
        />
      )}
    </section>
  );
}

/* ========================================================================== *
 * Summary — score, stars, count and distribution
 * ========================================================================== */

function Summary({
  average,
  total,
  breakdown,
  recommended,
  signedIn,
  hydrated,
  hasMine,
  onWrite,
}: {
  average: number;
  total: number;
  breakdown: { stars: number; percent: number }[];
  recommended: number;
  signedIn: boolean;
  hydrated: boolean;
  hasMine: boolean;
  onWrite: () => void;
}) {
  const hasReviews = total > 0;

  return (
    <div className="lg:col-span-4">
      <p className="ap-eyebrow mb-4 flex items-center gap-3 text-burnt-300">
        <span aria-hidden="true" className="h-px w-8 bg-burnt-400/50" />
        Customer reviews
      </p>

      <div className="flex items-baseline gap-3">
        <span className="font-display text-5xl text-ink">{average.toFixed(1)}</span>
        <span className="text-sm text-ink/65">out of 5</span>
      </div>

      <Rating value={average} size="md" className="mt-3" />

      <p className="ap-body mt-3 text-sm text-ink/70">
        {hasReviews ? `Based on ${pluralize(total, "review")}` : "No reviews yet"}
      </p>

      {hasReviews && breakdown.length > 0 && (
        <div className="mt-7 flex flex-col gap-2.5">
          {breakdown.map((row) => (
            <div key={row.stars} className="flex items-center gap-3">
              <span className="ap-eyebrow w-8 shrink-0 tabular-nums text-ink/65">
                {row.stars} ★
              </span>
              <span
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"
                role="img"
                aria-label={`${row.percent}% of reviews are ${row.stars} star`}
              >
                <span
                  className="block h-full rounded-full bg-burnt-400"
                  style={{ width: `${row.percent}%` }}
                />
              </span>
              <span className="ap-eyebrow w-10 shrink-0 text-right tabular-nums text-ink/55">
                {row.percent}%
              </span>
            </div>
          ))}
        </div>
      )}

      {hasReviews && (
        <p className="ap-body mt-6 text-sm text-ink/70">
          <span className="font-medium text-ink">{recommended}%</span> of shoppers would
          recommend this piece.
        </p>
      )}

      <div className="mt-6">
        {!hydrated ? null : signedIn ? (
          <Button onClick={onWrite} variant="outline" size="md" className="w-full sm:w-auto">
            {hasMine ? "Edit your review" : "Write a review"}
          </Button>
        ) : (
          <Button href="/login" variant="outline" size="md" className="w-full sm:w-auto">
            Sign in to write a review
          </Button>
        )}
      </div>
    </div>
  );
}

/* ========================================================================== *
 * Review cards
 * ========================================================================== */

function ReviewList({
  reviews,
  loading,
  error,
  mineId,
  signedIn,
  hydrated,
  deleting,
  notice,
  actionError,
  onRetry,
  onWrite,
  onEdit,
  onDelete,
}: {
  reviews: ApiReview[];
  loading: boolean;
  error: string | null;
  mineId: string | null;
  signedIn: boolean;
  hydrated: boolean;
  deleting: boolean;
  notice: string | null;
  actionError: string | null;
  onRetry: () => void;
  onWrite: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (loading) {
    return (
      <div className="lg:col-span-7 lg:col-start-6" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <div key={index} className="border-t border-line py-7 first:border-t-0 first:pt-0">
            <div className="h-3 w-32 bg-surface" />
            <div className="mt-4 h-3 w-full bg-surface" />
            <div className="mt-2 h-3 w-4/5 bg-surface" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="lg:col-span-7 lg:col-start-6">
        <div className="border border-line bg-surface px-8 py-12">
          <h3 className="font-display text-2xl text-ink">Reviews couldn&apos;t load</h3>
          <p className="ap-body mt-3 text-ink/70">{error}</p>
          <Button onClick={onRetry} variant="outline" size="md" className="mt-6">
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="lg:col-span-7 lg:col-start-6">
        <div className="flex h-full flex-col justify-center border border-line bg-surface px-8 py-12 sm:px-12 sm:py-16">
          <div className="flex items-center gap-1" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((star) => (
              <StarIcon key={star} filled={false} className="h-4 w-4 text-ink/20" />
            ))}
          </div>
          <h3 className="ap-balance mt-5 font-display text-2xl leading-snug text-ink">
            No reviews yet
          </h3>
          <p className="ap-body mt-3 max-w-sm text-ink/70">
            Be the first to share how this piece fits and wears. Your words help the next
            shopper choose with confidence.
          </p>
          {hydrated && signedIn && (
            <Button onClick={onWrite} variant="outline" size="md" className="mt-7 w-full sm:w-auto">
              Write the first review
            </Button>
          )}
          {hydrated && !signedIn && (
            <Button href="/login" variant="outline" size="md" className="mt-7 w-full sm:w-auto">
              Sign in to write a review
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="lg:col-span-7 lg:col-start-6">
      {notice && (
        <p
          role="status"
          className="ap-body mb-6 border-l-2 border-burnt-400 bg-surface px-4 py-3 text-sm text-ink/70"
        >
          {notice}
        </p>
      )}

      {actionError && (
        <p
          role="alert"
          className="ap-body mb-6 border-l-2 border-burnt bg-surface px-4 py-3 text-sm text-ink/70"
        >
          {actionError}
        </p>
      )}

      <ul className="flex flex-col">
        {reviews.map((review) => {
          const isMine = review.id === mineId;
          return (
            <li
              key={review.id}
              className="border-t border-line py-7 first:border-t-0 first:pt-0"
            >
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <Rating value={review.rating} />
                <time dateTime={review.date} className="ap-eyebrow tabular-nums text-ink/65">
                  {new Date(review.date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </time>
              </div>

              <h3 className="ap-balance mt-4 font-display text-xl leading-snug text-ink">
                {review.title}
              </h3>
              <p className="ap-body mt-2.5 text-ink/75">{review.body}</p>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink/60">
                <span className="font-medium text-ink">{review.author}</span>
                {review.sizePurchased && (
                  <span className="ap-eyebrow text-ink/60">Size {review.sizePurchased}</span>
                )}
                {review.verifiedPurchase && (
                  <span className="flex items-center gap-1.5 text-burnt-300">
                    <CheckIcon className="h-3.5 w-3.5" />
                    Verified purchase
                  </span>
                )}
                {isMine && <span className="ap-eyebrow text-burnt-300">Your review</span>}
                {review.edited && <span className="text-ink/45">Edited</span>}
              </div>

              {isMine && (
                <div className="mt-4 flex items-center gap-2">
                  <Button onClick={onEdit} variant="ghost" size="sm">
                    Edit
                  </Button>
                  <Button
                    onClick={onDelete}
                    variant="ghost"
                    size="sm"
                    disabled={deleting}
                    className="text-burnt-300 hover:text-burnt"
                  >
                    {deleting ? "Deleting…" : "Delete"}
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ========================================================================== *
 * Write / edit form
 * ========================================================================== */

function emptyInput(existing: ApiReview | null, sizes: string[]): ReviewInput {
  return {
    rating: existing?.rating ?? 5,
    title: existing?.title ?? "",
    body: existing?.body ?? "",
    sizePurchased: existing?.sizePurchased || sizes[0] || "",
  };
}

function WriteReviewForm({
  product,
  existing,
  onClose,
  onSubmit,
}: {
  product: Product;
  existing: ApiReview | null;
  onClose: () => void;
  onSubmit: (input: ReviewInput) => Promise<SubmitResult>;
}) {
  const [values, setValues] = useState<ReviewInput>(() => emptyInput(existing, product.sizes));
  const [errors, setErrors] = useState<Partial<Record<keyof ReviewInput, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (name: keyof ReviewInput, value: string | number) => {
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const found: Partial<Record<keyof ReviewInput, string>> = {};
    if (values.title.trim().length < 3) found.title = "Give your review a short title";
    if (values.body.trim().length < 10) found.body = "Tell us a little more (10+ characters)";

    setErrors(found);
    setServerError(null);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    const result = await onSubmit({
      rating: values.rating,
      title: values.title.trim(),
      body: values.body.trim(),
      sizePurchased: values.sizePurchased.trim(),
    });
    setSubmitting(false);

    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    onClose();
  };

  const field = (name: keyof ReviewInput) =>
    `w-full border bg-floral-900 px-4 py-3 text-sm text-ink placeholder:text-ink/30 focus:outline-none ${
      errors[name] ? "border-burnt" : "border-line focus:border-ink"
    }`;
  const label = "ap-body mb-2 block text-sm text-ink";

  return (
    <PdpModal
      open
      onClose={onClose}
      labelledBy="ap-write-review-title"
      eyebrow={product.name}
      title={existing ? "Edit your review" : "Write a review"}
    >
      <p className="ap-body text-ink/65">
        {existing
          ? "Update your rating or words. Your review stays tied to your account."
          : "Share how it fits and how it wears. Your review is saved to your account and shown on this page."}
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-7">
        <fieldset>
          <legend className={label}>Your rating</legend>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => update("rating", star)}
                aria-pressed={values.rating === star}
                aria-label={`${star} star${star > 1 ? "s" : ""}`}
                className="flex h-11 w-11 items-center justify-center transition-transform hover:scale-110"
              >
                <StarIcon
                  filled={star <= values.rating}
                  className={`h-6 w-6 ${star <= values.rating ? "text-burnt" : "text-ink/15"}`}
                />
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-5">
          <label htmlFor="ap-review-title" className={label}>
            Review title
          </label>
          <input
            id="ap-review-title"
            value={values.title}
            onChange={(event) => update("title", event.target.value)}
            aria-invalid={errors.title ? true : undefined}
            maxLength={120}
            className={field("title")}
            placeholder="Sums up your experience"
          />
          {errors.title && (
            <p role="alert" className="ap-body mt-2 text-xs text-burnt">
              {errors.title}
            </p>
          )}
        </div>

        <div className="mt-5">
          <label htmlFor="ap-review-size" className={label}>
            Size you purchased
          </label>
          <select
            id="ap-review-size"
            value={values.sizePurchased}
            onChange={(event) => update("sizePurchased", event.target.value)}
            className="w-full border border-line bg-floral-900 px-4 py-3 text-sm text-ink focus:border-ink focus:outline-none"
          >
            <option value="">Not specified</option>
            {product.sizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5">
          <label htmlFor="ap-review-body" className={label}>
            Your review
          </label>
          <textarea
            id="ap-review-body"
            rows={4}
            value={values.body}
            onChange={(event) => update("body", event.target.value)}
            aria-invalid={errors.body ? true : undefined}
            maxLength={2000}
            className={`${field("body")} resize-y`}
            placeholder="How does it fit? How is the fabric?"
          />
          {errors.body && (
            <p role="alert" className="ap-body mt-2 text-xs text-burnt">
              {errors.body}
            </p>
          )}
        </div>

        {serverError && (
          <p role="alert" className="ap-body mt-5 border-l-2 border-burnt-400 bg-surface px-4 py-3 text-sm text-ink/70">
            {serverError}
          </p>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onClose} variant="ghost" size="md" disabled={submitting}>
            Cancel
          </Button>
          <button
            type="submit"
            disabled={submitting}
            className="ap-eyebrow bg-ink px-8 py-4 text-floral-900 transition-colors duration-500 hover:bg-burnt disabled:pointer-events-none disabled:opacity-50"
          >
            {submitting ? "Saving…" : existing ? "Save changes" : "Post review"}
          </button>
        </div>
      </form>
    </PdpModal>
  );
}
