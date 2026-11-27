"use client";

import {
  useEffect,
  useId,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  createAddress,
  deleteAddress,
  setDefaultAddress,
  updateAddress,
} from "@/api";
import { AccountPanel } from "@/components/account/AccountPanel";
import { Button } from "@/components/ui/Button";
import {
  CheckIcon,
  CloseIcon,
  EditIcon,
  MapPinIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/ui/icons";
import { cn, pluralize } from "@/lib/utils";
import type { Address, AddressInput } from "@/types/address";

/**
 * Saved addresses — a real address book backed by the customer API.
 *
 * Cards stay read-only until a dialog opens, so editing never changes the
 * page's layout. Deletion is guarded server-side while an order that uses the
 * address is still being processed.
 */

interface AccountAddressesProps {
  addresses: Address[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onChanged?: () => void;
}

type FormValues = {
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

const EMPTY_FORM: FormValues = {
  label: "",
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
};

function toForm(address: Address): FormValues {
  return {
    label: address.label,
    fullName: address.fullName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
  };
}

function validate(values: FormValues): Partial<Record<keyof FormValues, string>> {
  const errors: Partial<Record<keyof FormValues, string>> = {};
  if (values.label.trim().length > 40) errors.label = "Label must be 40 characters or fewer";
  if (!values.fullName.trim()) errors.fullName = "Please enter the recipient's name";
  if (!/^[+]?[0-9()\- ]{6,20}$/.test(values.phone.trim())) {
    errors.phone = "Please enter a valid phone number";
  }
  if (!values.line1.trim()) errors.line1 = "Please enter the address";
  if (!values.city.trim()) errors.city = "Please enter the city";
  if (!values.state.trim()) errors.state = "Please enter the state";
  if (!/^[A-Za-z0-9][A-Za-z0-9\- ]*$/.test(values.postalCode.trim())) {
    errors.postalCode = "Please enter a valid postal code";
  }
  if (!values.country.trim()) errors.country = "Please enter the country";
  return errors;
}

function toInput(values: FormValues, isDefault: boolean): AddressInput {
  return {
    label: values.label.trim(),
    fullName: values.fullName.trim(),
    phone: values.phone.trim(),
    line1: values.line1.trim(),
    line2: values.line2.trim(),
    city: values.city.trim(),
    state: values.state.trim(),
    postalCode: values.postalCode.trim(),
    country: values.country.trim(),
    isDefault,
  };
}

function Field({
  label,
  value,
  error,
  onChange,
  autoComplete,
  inputMode,
  maxLength,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  inputMode?: "text" | "tel" | "numeric";
  maxLength?: number;
  placeholder?: string;
  className?: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="ap-eyebrow mb-2 block text-ink/55">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "w-full border bg-floral px-3.5 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink/30",
          error
            ? "border-burnt"
            : "border-line hover:border-ash-400 focus:border-burnt",
        )}
      />
      {error && (
        <p id={errorId} role="alert" className="ap-body mt-1.5 text-xs text-burnt-400">
          {error}
        </p>
      )}
    </div>
  );
}

function DialogShell({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ash-900/45 p-0 sm:items-center sm:p-6">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="ap-anim-rise relative max-h-[92svh] w-full overflow-y-auto border border-line bg-floral shadow-xl sm:max-w-xl"
      >
        <header className="flex items-start justify-between gap-6 border-b border-line px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-xl sm:text-2xl">
              {title}
            </h2>
            {description && (
              <p className="ap-body mt-2 text-sm text-ink/55">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="grid h-9 w-9 shrink-0 place-items-center border border-line bg-surface text-ink/60 transition-colors hover:border-ash-400 hover:text-ink"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

function AddressFormDialog({
  address,
  onClose,
  onSaved,
}: {
  address: Address | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [values, setValues] = useState<FormValues>(
    address ? toForm(address) : EMPTY_FORM,
  );
  const [isDefault, setIsDefault] = useState(address ? address.isDefault : false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const update = (name: keyof FormValues, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setFormError(null);
    setSaving(true);
    const input = toInput(values, isDefault);
    const result = address
      ? await updateAddress(address.id, input)
      : await createAddress(input);
    setSaving(false);

    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    onSaved(address ? "Address updated." : "Address saved.");
  };

  return (
    <DialogShell
      title={address ? "Edit address" : "Add an address"}
      description="Saved addresses can be picked in one tap at checkout."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="grid gap-5 px-5 py-5 sm:grid-cols-2 sm:px-6 sm:py-6">
          <Field
            label="Label (optional)"
            value={values.label}
            error={errors.label}
            onChange={(value) => update("label", value)}
            placeholder="Home, Studio, Parents"
            maxLength={40}
            className="sm:col-span-2"
          />
          <Field
            label="Full name"
            value={values.fullName}
            error={errors.fullName}
            onChange={(value) => update("fullName", value)}
            autoComplete="name"
            placeholder="Aarav Patel"
          />
          <Field
            label="Phone"
            value={values.phone}
            error={errors.phone}
            onChange={(value) => update("phone", value)}
            autoComplete="tel"
            inputMode="tel"
            placeholder="+91 98450 12345"
            maxLength={20}
          />
          <Field
            label="Address line 1"
            value={values.line1}
            error={errors.line1}
            onChange={(value) => update("line1", value)}
            autoComplete="address-line1"
            placeholder="House / flat, building, street"
            className="sm:col-span-2"
          />
          <Field
            label="Address line 2 (optional)"
            value={values.line2}
            onChange={(value) => update("line2", value)}
            autoComplete="address-line2"
            placeholder="Area, landmark"
            className="sm:col-span-2"
          />
          <Field
            label="City"
            value={values.city}
            error={errors.city}
            onChange={(value) => update("city", value)}
            autoComplete="address-level2"
            placeholder="Mumbai"
          />
          <Field
            label="State"
            value={values.state}
            error={errors.state}
            onChange={(value) => update("state", value)}
            autoComplete="address-level1"
            placeholder="Maharashtra"
          />
          <Field
            label="Postal code"
            value={values.postalCode}
            error={errors.postalCode}
            onChange={(value) => update("postalCode", value)}
            autoComplete="postal-code"
            inputMode="numeric"
            placeholder="400001"
            maxLength={20}
          />
          <Field
            label="Country"
            value={values.country}
            error={errors.country}
            onChange={(value) => update("country", value)}
            autoComplete="country-name"
            placeholder="India"
          />

          <label className="flex items-start gap-3 sm:col-span-2">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(event) => setIsDefault(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-burnt"
            />
            <span className="ap-body text-sm text-ink/65">
              Use this as my default delivery address
            </span>
          </label>

          {formError && (
            <p role="alert" className="ap-body text-sm text-burnt-400 sm:col-span-2">
              {formError}
            </p>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-line px-5 py-4 sm:px-6">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={saving} aria-busy={saving}>
            {saving ? "Saving…" : address ? "Save changes" : "Add address"}
          </Button>
        </footer>
      </form>
    </DialogShell>
  );
}

function DeleteAddressDialog({
  address,
  onClose,
  onDeleted,
}: {
  address: Address;
  onClose: () => void;
  onDeleted: (message: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    const result = await deleteAddress(address.id);
    setDeleting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDeleted("Address deleted.");
  };

  return (
    <DialogShell
      title="Delete this address?"
      description="This removes it from your address book. Orders already placed keep their own delivery details."
      onClose={onClose}
    >
      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <div className="border border-line bg-surface/60 p-4">
          <p className="text-sm text-ink">
            {address.label || "Saved address"}
            {address.isDefault && (
              <span className="ap-eyebrow ml-2 text-burnt">Default</span>
            )}
          </p>
          <p className="ap-body mt-2 text-sm text-ink/60">
            {address.fullName}
            <br />
            {[address.line1, address.line2].filter(Boolean).join(", ")}
            <br />
            {[address.city, address.state, address.postalCode].filter(Boolean).join(", ")}
            <br />
            {address.country}
          </p>
        </div>
        {error && (
          <p role="alert" className="ap-body mt-4 text-sm text-burnt-400">
            {error}
          </p>
        )}
      </div>
      <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-line px-5 py-4 sm:px-6">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Keep address
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleDelete}
          disabled={deleting}
          aria-busy={deleting}
        >
          {deleting ? "Deleting…" : "Delete address"}
        </Button>
      </footer>
    </DialogShell>
  );
}

export function AccountAddresses({
  addresses,
  loading = false,
  error = null,
  onRetry,
  onChanged,
}: AccountAddressesProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Address | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
    setNotice(null);
    setActionError(null);
  };

  const openEdit = (address: Address) => {
    setEditing(address);
    setFormOpen(true);
    setNotice(null);
    setActionError(null);
  };

  const handleSaved = (message: string) => {
    setFormOpen(false);
    setEditing(null);
    setNotice(message);
    setActionError(null);
    onChanged?.();
  };

  const handleDeleted = (message: string) => {
    setDeleteTarget(null);
    setNotice(message);
    setActionError(null);
    onChanged?.();
  };

  const makeDefault = async (address: Address) => {
    if (busyId) return;
    setBusyId(address.id);
    setNotice(null);
    setActionError(null);
    const result = await setDefaultAddress(address.id);
    setBusyId(null);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    setNotice("Default address updated.");
    onChanged?.();
  };

  return (
    <AccountPanel
      id="account-addresses"
      eyebrow="Addresses"
      title="Saved addresses"
      meta={pluralize(addresses.length, "address")}
      action={
        <Button type="button" variant="ghost" size="sm" onClick={openAdd}>
          <PlusIcon className="h-3.5 w-3.5" />
          Add address
        </Button>
      }
    >
      {notice && (
        <p
          role="status"
          className="ap-body mb-5 flex items-center gap-2 border border-line bg-surface/60 px-4 py-3 text-sm text-ink/70"
        >
          <CheckIcon className="h-4 w-4 text-burnt" />
          {notice}
        </p>
      )}

      {actionError && (
        <p
          role="alert"
          className="ap-body mb-5 border border-burnt/40 bg-burnt-900 px-4 py-3 text-sm text-burnt-200"
        >
          {actionError}
        </p>
      )}

      {error && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border border-burnt/40 bg-burnt-900 px-4 py-3">
          <p role="alert" className="ap-body text-sm text-burnt-200">
            {error}
          </p>
          {onRetry && (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      )}

      {loading && addresses.length === 0 ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {[0, 1].map((index) => (
            <div
              key={index}
              className="h-52 animate-pulse border border-line bg-surface/50"
              aria-hidden="true"
            />
          ))}
          <span className="sr-only" role="status">
            Loading saved addresses…
          </span>
        </div>
      ) : addresses.length === 0 ? (
        <div className="flex flex-col items-center gap-5 border border-dashed border-line bg-surface/40 px-6 py-16 text-center">
          <MapPinIcon className="h-9 w-9 text-burnt" />
          <p className="ap-body max-w-sm text-sm text-ink/60">
            No saved addresses yet. Add one and checkout becomes a single step.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={openAdd} withArrow>
            Add an address
          </Button>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2">
          {addresses.map((address) => {
            const busy = busyId === address.id;
            return (
              <li
                key={address.id}
                className="flex flex-col border border-line bg-surface/50 p-5 transition-colors duration-300 hover:border-ash-400 sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center border border-line bg-floral text-ash-300">
                    <MapPinIcon className="h-5 w-5" />
                  </span>
                  {address.isDefault && (
                    <span className="ap-eyebrow rounded-full bg-ash-900 px-3 py-1 text-ash-200">
                      Default
                    </span>
                  )}
                </div>

                <p className="mt-5 text-lg text-ink">
                  {address.label || "Saved address"}
                </p>
                <p className="ap-body mt-2 flex-1 text-sm text-ink/65">
                  {address.fullName}
                  <br />
                  {[address.line1, address.line2].filter(Boolean).join(", ")}
                  <br />
                  {[address.city, address.state, address.postalCode]
                    .filter(Boolean)
                    .join(", ")}
                  <br />
                  {address.country}
                  <br />
                  {address.phone}
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4">
                  {!address.isDefault && (
                    <button
                      type="button"
                      onClick={() => void makeDefault(address)}
                      disabled={Boolean(busyId)}
                      className="ap-eyebrow text-burnt transition-colors hover:text-burnt-400 disabled:opacity-50"
                    >
                      {busy ? "Setting…" : "Make default"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openEdit(address)}
                    className="ap-eyebrow ml-auto inline-flex items-center gap-1.5 text-ink/55 transition-colors hover:text-ink"
                  >
                    <EditIcon className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteTarget(address);
                      setNotice(null);
                      setActionError(null);
                    }}
                    className="ap-eyebrow inline-flex items-center gap-1.5 text-ink/55 transition-colors hover:text-burnt"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {formOpen && (
        <AddressFormDialog
          address={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <DeleteAddressDialog
          address={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
    </AccountPanel>
  );
}
