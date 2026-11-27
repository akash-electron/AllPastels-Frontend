/**
 * Customer address-book domain types.
 *
 * These mirror the backend `Address` document. Orders still store their own
 * immutable shipping-address snapshot; an address-book id is only a pointer
 * used to prefill checkout and guard deletion while an order is active.
 */

export interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AddressInput {
  label?: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

export type AddressesResult =
  | { ok: true; addresses: Address[] }
  | { ok: false; error: string; unauthorized?: boolean };

export type AddressResult =
  | { ok: true; address: Address }
  | { ok: false; error: string; unauthorized?: boolean };

export type DeleteAddressResult =
  | { ok: true }
  | { ok: false; error: string; unauthorized?: boolean };
