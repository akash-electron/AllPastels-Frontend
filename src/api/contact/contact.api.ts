import {
  NETWORK_ERROR_MESSAGE,
  apiPostBody,
  readRouteBody,
} from "@/lib/api-client";

export interface ContactMessageInput {
  name: string;
  email: string;
  topic: string;
  message: string;
  orderNumber?: string;
  website?: string;
}

function coerceFieldErrors(
  value: unknown,
): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const result: Record<string, string> = {};
  let has = false;
  for (const [key, entry] of Object.entries(record)) {
    if (typeof entry === "string") {
      result[key] = entry;
      has = true;
    }
  }
  return has ? result : undefined;
}

export async function sendContactMessage(
  input: ContactMessageInput,
): Promise<
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
> {
  const response = await apiPostBody("/contact", input);
  if (!response) {
    return { ok: false, error: NETWORK_ERROR_MESSAGE };
  }

  const body = await readRouteBody(response, "We couldn't send your message. Please try again.");
  if (body.ok === true) {
    return { ok: true };
  }

  const fieldErrors = coerceFieldErrors(body.fieldErrors);
  return {
    ok: false,
    error:
      typeof body.error === "string"
        ? body.error
        : "We couldn't send your message. Please try again.",
    ...(fieldErrors ? { fieldErrors } : {}),
  };
}