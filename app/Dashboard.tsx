"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api";
import {
  Button,
  Card,
  FieldShell,
  cn,
  controlClass,
  formatDate,
} from "@/components/ui";
import { buildFormPath, type Prefill } from "@/lib/prefill";
import { filterQuotes, isFiltering } from "@/lib/quoteFilter";
import {
  PRODUCT_TYPES,
  hasErrors,
  validateLinkInput,
  type Errors,
  type LinkInput,
} from "@/lib/quoteSpec";

const EMPTY: LinkInput = {
  customerName: "",
  phone: "",
  email: "",
  productType: "",
  quantity: "",
  notes: "",
};

function convexErrors(error: unknown): { message: string; errors: Errors } {
  if (error instanceof ConvexError) {
    const data = error.data as { message?: string; errors?: Errors };
    return {
      message: data?.message ?? "Something went wrong.",
      errors: data?.errors ?? {},
    };
  }
  return {
    message: "Could not reach the server. Please try again.",
    errors: {},
  };
}

/** location.origin never changes for the life of the page, so nothing to watch. */
const subscribeToNothing = () => () => {};

function CopyButton({
  value,
  label = "Copy",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <Button
      variant="secondary"
      className="min-h-10 px-3 text-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          window.prompt("Copy this link:", value);
        }
      }}
    >
      {copied ? "Copied" : label}
    </Button>
  );
}

export function Dashboard({
  sessionToken,
  onSignOut,
}: {
  sessionToken: string;
  onSignOut: () => void;
}) {
  const links = useQuery(api.quotes.listLinks, { sessionToken });
  const quotes = useQuery(api.quotes.listQuotes, { sessionToken });
  const createLink = useMutation(api.quotes.createLink);
  const removeLink = useMutation(api.quotes.deleteLink);
  const logout = useMutation(api.admin.logout);

  const [form, setForm] = useState<LinkInput>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ token: string; prefill: Prefill } | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("");

  const origin = useSyncExternalStore(
    subscribeToNothing,
    () => window.location.origin,
    () => "",
  );

  const urlFor = useMemo(
    () => (token: string, prefill: Prefill) =>
      `${origin}${buildFormPath(token, prefill)}`,
    [origin],
  );

  /** Only offer products that actually have submissions to filter by. */
  const productsWithQuotes = useMemo(() => {
    if (!quotes) return [];
    return PRODUCT_TYPES.filter((product) =>
      quotes.some((quote) => quote.productType === product),
    );
  }, [quotes]);

  const filter = useMemo(
    () => ({ search, productType: productFilter }),
    [search, productFilter],
  );
  const filtering = isFiltering(filter);

  const visibleQuotes = useMemo(
    () => (quotes ? filterQuotes(quotes, filter) : undefined),
    [quotes, filter],
  );

  const liveErrors = useMemo(() => validateLinkInput(form), [form]);
  const shownError = (key: keyof LinkInput) =>
    errors[key] ?? (touched[key] ? liveErrors[key] : undefined);

  const update = (key: keyof LinkInput, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const blur = (key: keyof LinkInput) =>
    setTouched((current) => ({ ...current, [key]: true }));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setCreated(null);

    const found = validateLinkInput(form);
    setTouched(Object.fromEntries(Object.keys(EMPTY).map((key) => [key, true])));
    if (hasErrors(found)) {
      setErrors(found);
      setFormError("Please correct the highlighted fields.");
      return;
    }

    setSubmitting(true);
    try {
      const { token } = await createLink({ sessionToken, ...form });
      setCreated({
        token,
        prefill: {
          customerName: form.customerName,
          phone: form.phone,
          email: form.email,
          quantity: form.quantity,
        },
      });
      setForm(EMPTY);
      setTouched({});
      setErrors({});
    } catch (error) {
      const { message, errors: fieldErrors } = convexErrors(error);
      setErrors(fieldErrors);
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Quote request links
          </h1>
          <p className="mt-1.5 text-zinc-600">
            Name and phone number make a link you can send. Add a product type
            to fix the job, or leave it blank and the customer picks it.
          </p>
        </div>
        <Button
          variant="secondary"
          className="min-h-10 px-4 text-sm"
          onClick={async () => {
            await logout({ sessionToken }).catch(() => {});
            onSignOut();
          }}
        >
          Sign out
        </Button>
      </header>

      <Card className="mb-6">
        <h2 className="mb-5 text-lg font-semibold">Create a link</h2>
        <form onSubmit={handleSubmit} noValidate>
          <div className="grid gap-x-5 sm:grid-cols-2">
            <FieldShell
              id="customerName"
              label="Customer name"
              required
              error={shownError("customerName")}
            >
              <input
                id="customerName"
                value={form.customerName}
                onChange={(event) => update("customerName", event.target.value)}
                onBlur={() => blur("customerName")}
                aria-invalid={Boolean(shownError("customerName"))}
                className={controlClass(Boolean(shownError("customerName")))}
                placeholder="Jane Cooper"
                maxLength={80}
              />
            </FieldShell>

            <FieldShell
              id="phone"
              label="Phone number"
              required
              error={shownError("phone")}
              hint="7–15 digits. + ( ) - and spaces are allowed."
            >
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(event) => update("phone", event.target.value)}
                onBlur={() => blur("phone")}
                aria-invalid={Boolean(shownError("phone"))}
                className={controlClass(Boolean(shownError("phone")))}
                placeholder="+44 7700 900123"
                maxLength={25}
              />
            </FieldShell>

            <FieldShell
              id="productType"
              label="Product type"
              error={shownError("productType")}
              hint="Leave blank and the customer picks it on the form."
            >
              <select
                id="productType"
                value={form.productType}
                onChange={(event) => update("productType", event.target.value)}
                onBlur={() => blur("productType")}
                aria-invalid={Boolean(shownError("productType"))}
                className={controlClass(Boolean(shownError("productType")))}
              >
                <option value="">Customer chooses</option>
                {PRODUCT_TYPES.map((product) => (
                  <option key={product} value={product}>
                    {product}
                  </option>
                ))}
              </select>
            </FieldShell>

            <FieldShell
              id="quantity"
              label="Quantity"
              error={shownError("quantity")}
              hint="Optional — prefills the form."
            >
              <input
                id="quantity"
                inputMode="numeric"
                value={form.quantity ?? ""}
                onChange={(event) => update("quantity", event.target.value)}
                onBlur={() => blur("quantity")}
                aria-invalid={Boolean(shownError("quantity"))}
                className={controlClass(Boolean(shownError("quantity")))}
                placeholder="500"
              />
            </FieldShell>

            <FieldShell
              id="email"
              label="Email"
              error={shownError("email")}
              hint="Optional."
            >
              <input
                id="email"
                type="email"
                value={form.email ?? ""}
                onChange={(event) => update("email", event.target.value)}
                onBlur={() => blur("email")}
                aria-invalid={Boolean(shownError("email"))}
                className={controlClass(Boolean(shownError("email")))}
                placeholder="jane@example.com"
              />
            </FieldShell>

            <FieldShell
              id="notes"
              label="Internal note"
              error={shownError("notes")}
              hint="Optional — your team only."
            >
              <input
                id="notes"
                value={form.notes ?? ""}
                onChange={(event) => update("notes", event.target.value)}
                onBlur={() => blur("notes")}
                aria-invalid={Boolean(shownError("notes"))}
                className={controlClass(Boolean(shownError("notes")))}
                placeholder="Called about a reprint"
                maxLength={1000}
              />
            </FieldShell>
          </div>

          {formError && (
            <p role="alert" className="mb-4 text-sm font-medium text-red-600">
              {formError}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="w-full sm:w-auto sm:px-8">
            {submitting ? "Generating…" : "Generate form link"}
          </Button>
        </form>

        {created && (
          <div className="mt-6 rounded-xl border border-emerald-300 bg-emerald-50 p-4">
            <p className="mb-2 text-sm font-semibold text-emerald-900">
              Link ready — send this to the customer
            </p>
            <code className="mb-3 block overflow-x-auto whitespace-nowrap rounded-lg border border-emerald-200 bg-white px-3 py-2.5 font-mono text-xs">
              {urlFor(created.token, created.prefill)}
            </code>
            <div className="flex flex-wrap gap-2">
              <CopyButton
                value={urlFor(created.token, created.prefill)}
                label="Copy link"
              />
              <a
                href={buildFormPath(created.token, created.prefill)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                Open form
              </a>
            </div>
          </div>
        )}
      </Card>

      <Card className="mb-6">
        <h2 className="mb-4 text-lg font-semibold">
          Issued links{" "}
          {links && (
            <span className="font-normal text-zinc-500">({links.length})</span>
          )}
        </h2>
        {links === undefined && <p className="text-sm text-zinc-500">Loading…</p>}
        {links?.length === 0 && (
          <p className="text-sm text-zinc-500">No links yet.</p>
        )}
        <ul className="space-y-3">
          {links?.map((link) => {
            const prefill: Prefill = {
              customerName: link.customerName,
              phone: link.phone,
              email: link.email,
              quantity:
                link.quantity === undefined ? undefined : String(link.quantity),
            };
            const url = urlFor(link.token, prefill);
            return (
              <li
                key={link._id}
                className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold break-words">
                      {link.customerName}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {link.phone} ·{" "}
                      {link.productType ?? (
                        <span className="italic">customer chooses</span>
                      )}
                    </p>
                  </div>
                  <span
                    className={
                      link.submissionCount > 0
                        ? "shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800"
                        : "shrink-0 rounded-full bg-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-600"
                    }
                  >
                    {link.submissionCount > 0
                      ? `${link.submissionCount} received`
                      : "Awaiting"}
                  </span>
                </div>

                <code className="mt-3 block overflow-x-auto whitespace-nowrap rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-xs text-zinc-600">
                  {url}
                </code>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <CopyButton value={url} />
                  <a
                    href={buildFormPath(link.token, prefill)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                  >
                    Open
                  </a>
                  <Button
                    variant="danger"
                    className="min-h-10 px-3 text-sm"
                    onClick={() => {
                      const warning =
                        link.submissionCount > 0
                          ? `Delete this link and its ${link.submissionCount} submission(s)?`
                          : "Delete this link?";
                      if (window.confirm(warning)) {
                        void removeLink({ sessionToken, linkId: link._id });
                      }
                    }}
                  >
                    Delete
                  </Button>
                  <span className="ml-auto text-xs text-zinc-500">
                    {formatDate(link.createdAt)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">
          Submitted specifications{" "}
          {quotes && visibleQuotes && (
            <span className="font-normal text-zinc-500">
              {filtering
                ? `(${visibleQuotes.length} of ${quotes.length})`
                : `(${quotes.length})`}
            </span>
          )}
        </h2>

        {quotes && quotes.length > 0 && (
          <div className="mb-5 flex flex-col gap-3 sm:flex-row">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, phone, reference or answer"
              aria-label="Search submissions"
              className={cn(controlClass(false), "sm:flex-1")}
            />
            <select
              value={productFilter}
              onChange={(event) => setProductFilter(event.target.value)}
              aria-label="Filter by product"
              className={cn(controlClass(false), "sm:w-56")}
            >
              <option value="">All products</option>
              {productsWithQuotes.map((product) => (
                <option key={product} value={product}>
                  {product}
                </option>
              ))}
            </select>
            {filtering && (
              <Button
                variant="secondary"
                className="sm:px-5"
                onClick={() => {
                  setSearch("");
                  setProductFilter("");
                }}
              >
                Clear
              </Button>
            )}
          </div>
        )}

        {quotes === undefined && (
          <p className="text-sm text-zinc-500">Loading…</p>
        )}
        {quotes?.length === 0 && (
          <p className="text-sm text-zinc-500">
            Nothing submitted yet. Saved specifications will appear here.
          </p>
        )}
        {visibleQuotes?.length === 0 && quotes && quotes.length > 0 && (
          <p className="text-sm text-zinc-500">
            No submissions match that filter.
          </p>
        )}
        <div className="space-y-3">
          {visibleQuotes?.map((quote) => (
            <details
              key={quote._id}
              className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4"
            >
              <summary className="cursor-pointer list-none">
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="font-semibold">{quote.customerName}</span>
                  <span className="text-zinc-600">{quote.productType}</span>
                  <span className="text-zinc-600">
                    Qty {quote.quantity.toLocaleString("en-GB")}
                  </span>
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                  <span className="font-mono">{quote.reference}</span>
                  <span>{formatDate(quote.createdAt)}</span>
                  {quote.webhookStatus === "failed" && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700">
                      Webhook failed
                    </span>
                  )}
                  {quote.webhookStatus === "pending" && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">
                      Webhook sending
                    </span>
                  )}
                </span>
              </summary>
              <dl className="mt-4 space-y-2 border-t border-zinc-200 pt-4 text-sm sm:grid sm:grid-cols-2 sm:gap-x-6 sm:space-y-0 sm:gap-y-2">
                <div className="flex gap-2">
                  <dt className="shrink-0 text-zinc-500">Phone</dt>
                  <dd className="font-medium break-words">{quote.phone}</dd>
                </div>
                {quote.email && (
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-zinc-500">Email</dt>
                    <dd className="font-medium break-all">{quote.email}</dd>
                  </div>
                )}
                {quote.answers.map((answer) => (
                  <div key={answer.key} className="flex gap-2">
                    <dt className="shrink-0 text-zinc-500">{answer.label}</dt>
                    <dd className="font-medium break-words">{answer.value}</dd>
                  </div>
                ))}
                {quote.webhookStatus === "failed" && quote.webhookError && (
                  <div className="flex gap-2 sm:col-span-2">
                    <dt className="shrink-0 text-red-600">Webhook error</dt>
                    <dd className="font-medium break-words text-red-700">
                      {quote.webhookError}
                    </dd>
                  </div>
                )}
              </dl>
            </details>
          ))}
        </div>
      </Card>
    </main>
  );
}
