"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button, Card, cn, controlClass, formatDate } from "@/components/ui";
import { filterQuotes, isFiltering } from "@/lib/quoteFilter";
import { PRODUCT_TYPES } from "@/lib/quoteSpec";

export function SubmissionsPage({
  sessionToken,
}: {
  sessionToken: string;
}) {
  const quotes = useQuery(api.quotes.listQuotes, { sessionToken });
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("");

  const filter = useMemo(
    () => ({ search, productType: productFilter }),
    [search, productFilter],
  );
  const filtering = isFiltering(filter);

  const productsWithQuotes = useMemo(() => {
    if (!quotes) return [];
    return PRODUCT_TYPES.filter((product) =>
      quotes.some((quote) => quote.productType === product),
    );
  }, [quotes]);

  const visibleQuotes = useMemo(
    () => (quotes ? filterQuotes(quotes, filter) : undefined),
    [quotes, filter],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Submitted specifications</h2>
        <p className="mt-1 text-sm text-zinc-600">
          View and manage all customer quote submissions.
        </p>
      </div>

      <Card>
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

        <div className="space-y-3">
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

        {quotes && visibleQuotes && (
          <div className="mt-4 text-xs text-zinc-500">
            {filtering
              ? `${visibleQuotes.length} of ${quotes.length} submissions`
              : `${quotes.length} total submission${quotes.length !== 1 ? "s" : ""}`}
          </div>
        )}
      </Card>
    </div>
  );
}
