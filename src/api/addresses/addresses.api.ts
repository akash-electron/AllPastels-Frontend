/**
 * Address-book service.
 *
 * Every call goes through this app's same-origin Route Handlers, which attach
 * the HttpOnly session JWT server-side. The backend enforces ownership and
 * default-address invariants.
 */

import {
  NETWORK_ERROR_MESSAGE,
  apiPostBody,
  apiRequest,
  readRouteBody,
} from "@/lib/api-client";
import type {
  Address,
  AddressInput,
  AddressesResult,
  AddressResult,
  DeleteAddressResult,
} from "@/types/address";

function optionalString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function coerceAddress(value: unknown): Address | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || !record.id) return null;

  const required = [
    "fullName",
    "phone",
    "line1",
    "city",
    "state",
    "postalCode",
    "country",
  ] as const;
  for (const key of required) {
    if (typeof record[key] !== "string" || !record[key]) return null;
  }

  return {
    id: record.id,
    label: optionalString(record.label),
    fullName: record.fullName as string,
    phone: record.phone as string,
    line1: record.line1 as string,
    line2: optionalString(record.line2),
    city: record.city as string,
    state: record.state as string,
    postalCode: record.postalCode as string,
    country: record.country as string,
    isDefault: record.isDefault === true,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : undefined,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : undefined,
  };
}

async function sendJson(
  path: string,
  method: "POST" | "PUT",
  body: unknown,
): Promise<Response | null> {
  return apiRequest(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function unauthorizedFrom(response: Response, body: { unauthorized?: unknown }): boolean {
  return body.unauthorized === true || response.status === 401;
}

/** `GET /api/addresses` — the signed-in customer's address book. */
export async function getAddresses(): Promise<AddressesResult> {
  const response = await apiRequest("/addresses", { cache: "no-store" });
  if (!response) return { ok: false, error: NETWORK_ERROR_MESSAGE };

  const body = await readRouteBody(response, "Failed to load your addresses.");
  if (body.ok !== true) {
    return {
      ok: false,
      error: typeof body.error === "string" ? body.error : "Failed to load your addresses.",
      unauthorized: unauthorizedFrom(response, body),
    };
  }
  if (!Array.isArray(body.data)) {
    return { ok: false, error: "The address book response was incomplete." };
  }

  const addresses = body.data
    .map(coerceAddress)
    .filter((address): address is Address => address !== null);
  return { ok: true, addresses };
}

/** `POST /api/addresses` — add a saved address. */
export async function createAddress(input: AddressInput): Promise<AddressResult> {
  const response = await sendJson("/addresses", "POST", input);
  if (!response) return { ok: false, error: NETWORK_ERROR_MESSAGE };

  const body = await readRouteBody(response, "Failed to save this address.");
  if (body.ok !== true) {
    return {
      ok: false,
      error: typeof body.error === "string" ? body.error : "Failed to save this address.",
      unauthorized: unauthorizedFrom(response, body),
    };
  }

  const address = coerceAddress(body.data);
  if (!address) return { ok: false, error: "The saved address response was incomplete." };
  return { ok: true, address };
}

/** `PUT /api/addresses/:id` — update an owned address. */
export async function updateAddress(
  id: string,
  input: AddressInput,
): Promise<AddressResult> {
  const response = await sendJson(`/addresses/${encodeURIComponent(id)}`, "PUT", input);
  if (!response) return { ok: false, error: NETWORK_ERROR_MESSAGE };

  const body = await readRouteBody(response, "Failed to update this address.");
  if (body.ok !== true) {
    return {
      ok: false,
      error: typeof body.error === "string" ? body.error : "Failed to update this address.",
      unauthorized: unauthorizedFrom(response, body),
    };
  }

  const address = coerceAddress(body.data);
  if (!address) return { ok: false, error: "The updated address response was incomplete." };
  return { ok: true, address };
}

/** `POST /api/addresses/:id/default` — make an owned address the default. */
export async function setDefaultAddress(id: string): Promise<AddressResult> {
  const response = await apiPostBody(
    `/addresses/${encodeURIComponent(id)}/default`,
    {},
  );
  if (!response) return { ok: false, error: NETWORK_ERROR_MESSAGE };

  const body = await readRouteBody(response, "Failed to set the default address.");
  if (body.ok !== true) {
    return {
      ok: false,
      error:
        typeof body.error === "string" ? body.error : "Failed to set the default address.",
      unauthorized: unauthorizedFrom(response, body),
    };
  }

  const address = coerceAddress(body.data);
  if (!address) return { ok: false, error: "The default address response was incomplete." };
  return { ok: true, address };
}

/** `DELETE /api/addresses/:id` — remove an owned address. */
export async function deleteAddress(id: string): Promise<DeleteAddressResult> {
  const response = await apiRequest(`/addresses/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!response) return { ok: false, error: NETWORK_ERROR_MESSAGE };

  const body = await readRouteBody(response, "Failed to delete this address.");
  if (body.ok !== true) {
    return {
      ok: false,
      error: typeof body.error === "string" ? body.error : "Failed to delete this address.",
      unauthorized: unauthorizedFrom(response, body),
    };
  }
  return { ok: true };
}
