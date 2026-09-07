"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FieldShell,
  cn,
  controlClass,
  formatDate,
} from "@/components/ui";
import { buildFormPath, type Prefill } from "@/lib/prefill";
import {
  PRODUCT_TYPES,
  hasErrors,
  validateLinkInput,
  type Errors,
  type LinkInput,
} from "@/lib/quoteSpec";
import { Copy, ExternalLink, Trash2 } from "lucide-react";

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

export function CreateLinkPage({
  sessionToken,
}: {
  sessionToken: string;
}) {
  const links = useQuery(api.quotes.listLinks, { sessionToken });
  const createLink = useMutation(api.quotes.createLink);
  const removeLink = useMutation(api.quotes.deleteLink);

  const [form, setForm] = useState<LinkInput>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ token: string; prefill: Prefill } | null>(null);

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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Link</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Generate a shareable quote form link for your customers. Optionally
          prefill with product type and details.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Form Section */}
        <Card className="p-6 lg:col-span-2">
          <h2 className="mb-6 text-lg font-semibold">Link Details</h2>
          <form onSubmit={handleSubmit} noValidate>
            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
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
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <p role="alert" className="text-sm font-medium text-red-800">
                  {formError}
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full"
            >
              {submitting ? "Generating…" : "Generate form link"}
            </Button>
          </form>
        </Card>

        {/* Recently Created */}
        <div className="space-y-4">
          {created && (
            <Card className="border-emerald-200 bg-emerald-50 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-emerald-900">Link Ready!</h3>
                <Badge className="bg-emerald-600">Success</Badge>
              </div>
              <div className="space-y-3">
                <div className="rounded-lg border border-emerald-200 bg-white p-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Share this link:
                  </p>
                  <code className="block overflow-x-auto break-all whitespace-pre-wrap font-mono text-xs text-foreground">
                    {urlFor(created.token, created.prefill)}
                  </code>
                </div>
                <div className="flex gap-2">
                  <CopyButton
                    value={urlFor(created.token, created.prefill)}
                    label="Copy link"
                  />
                  <a
                    href={buildFormPath(created.token, created.prefill)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open form
                  </a>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* All Issued Links */}
      <Card className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">All Links</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {links?.length ?? 0} link{links?.length !== 1 ? "s" : ""} created
            </p>
          </div>
        </div>
        {links === undefined && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
        {links?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No links yet. Create your first link above.
          </p>
        )}
        <div className="space-y-3">
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
              <div
                key={link._id}
                className="rounded-lg border border-border bg-muted/40 p-4"
              >
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-semibold">{link.customerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {link.phone} • {link.productType || "Any product"}
                    </p>
                  </div>
                  <Badge
                    variant={
                      link.submissionCount > 0 ? "default" : "secondary"
                    }
                  >
                    {link.submissionCount > 0
                      ? `${link.submissionCount} received`
                      : "Awaiting"}
                  </Badge>
                </div>

                <div className="mb-3 rounded-md border border-border bg-background p-2">
                  <code className="break-all text-xs text-muted-foreground">
                    {url}
                  </code>
                </div>

                <div className="flex flex-wrap gap-2">
                  <CopyButton value={url} />
                  <a
                    href={buildFormPath(link.token, prefill)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium transition hover:bg-muted"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const warning =
                        link.submissionCount > 0
                          ? `Delete this link and its ${link.submissionCount} submission(s)?`
                          : "Delete this link?";
                      if (window.confirm(warning)) {
                        void removeLink({ sessionToken, linkId: link._id });
                      }
                    }}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDate(link.createdAt)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
