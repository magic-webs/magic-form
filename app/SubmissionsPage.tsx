"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, controlClass, formatDate } from "@/components/ui";
import { filterQuotes, isFiltering } from "@/lib/quoteFilter";
import { PRODUCT_TYPES } from "@/lib/quoteSpec";
import { Search, AlertCircle, Clock, CheckCircle2 } from "lucide-react";

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
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Submissions</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:mt-2 sm:text-sm">
          Review all customer quote specifications and their webhook status.
        </p>
      </div>

      {/* Stats Cards */}
      {quotes && (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
          <Card className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground sm:text-sm">Total</p>
                <p className="text-xl font-bold sm:text-2xl">{quotes.length}</p>
              </div>
              <CheckCircle2 className="h-6 w-6 shrink-0 text-muted-foreground sm:h-8 sm:w-8" />
            </div>
          </Card>
          <Card className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground sm:text-sm">Pending</p>
                <p className="text-xl font-bold sm:text-2xl">
                  {
                    quotes.filter((q) => q.webhookStatus === "pending").length
                  }
                </p>
              </div>
              <Clock className="h-6 w-6 shrink-0 text-amber-600 sm:h-8 sm:w-8" />
            </div>
          </Card>
          <Card className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground sm:text-sm">Failed</p>
                <p className="text-xl font-bold sm:text-2xl">
                  {
                    quotes.filter((q) => q.webhookStatus === "failed").length
                  }
                </p>
              </div>
              <AlertCircle className="h-6 w-6 shrink-0 text-red-600 sm:h-8 sm:w-8" />
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4 sm:p-6">
        {quotes && quotes.length > 0 && (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search…"
                  aria-label="Search submissions"
                  className={cn(controlClass(false), "pl-10 text-sm")}
                />
              </div>
              <select
                value={productFilter}
                onChange={(event) => setProductFilter(event.target.value)}
                aria-label="Filter by product"
                className={cn(controlClass(false), "w-full sm:w-56 text-sm")}
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
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setProductFilter("");
                  }}
                  className="w-full sm:w-auto"
                >
                  Clear
                </Button>
              )}
            </div>

            {filtering && (
              <p className="text-xs text-muted-foreground">
                Showing {visibleQuotes?.length} of {quotes.length} submissions
              </p>
            )}
          </div>
        )}

        {/* Submissions List */}
        <div className="mt-6 space-y-3">
          {quotes === undefined && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
          {quotes?.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No submissions yet. Saved specifications will appear here.
              </p>
            </div>
          )}
          {visibleQuotes?.length === 0 && quotes && quotes.length > 0 && (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No submissions match that filter.
              </p>
            </div>
          )}
          {visibleQuotes?.map((quote) => (
            <details
              key={quote._id}
              className="group rounded-lg border border-border bg-muted/40 p-3 sm:p-4 transition-colors hover:bg-muted/60"
            >
              <summary className="flex cursor-pointer flex-col gap-2 sm:gap-3 list-none">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate sm:text-base">{quote.customerName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {quote.productType} • Qty{" "}
                      {quote.quantity.toLocaleString("en-GB")}
                    </p>
                  </div>
                  <div className="flex gap-1 sm:gap-2 shrink-0">
                    {quote.webhookStatus === "failed" && (
                      <Badge variant="destructive" className="text-xs">Failed</Badge>
                    )}
                    {quote.webhookStatus === "pending" && (
                      <Badge variant="outline" className="text-xs">Pending</Badge>
                    )}
                    {quote.webhookStatus === "sent" && (
                      <Badge className="text-xs">Sent</Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono truncate">{quote.reference}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="truncate">{formatDate(quote.createdAt)}</span>
                </div>
              </summary>

              <div className="mt-4 border-t border-border pt-4">
                <dl className="space-y-3">
                  <div className="grid gap-1">
                    <dt className="text-xs font-medium text-muted-foreground">
                      Phone
                    </dt>
                    <dd className="text-sm">{quote.phone}</dd>
                  </div>
                  {quote.email && (
                    <div className="grid gap-1">
                      <dt className="text-xs font-medium text-muted-foreground">
                        Email
                      </dt>
                      <dd className="text-sm break-all">{quote.email}</dd>
                    </div>
                  )}
                  {quote.answers.map((answer) => (
                    <div key={answer.key} className="grid gap-1">
                      <dt className="text-xs font-medium text-muted-foreground">
                        {answer.label}
                      </dt>
                      <dd className="text-sm">{answer.value}</dd>
                    </div>
                  ))}
                  {quote.webhookStatus === "failed" && quote.webhookError && (
                    <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
                      <dt className="text-xs font-medium text-red-900">
                        Webhook Error
                      </dt>
                      <dd className="mt-1 text-xs text-red-800">
                        {quote.webhookError}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </details>
          ))}
        </div>
      </Card>
    </div>
  );
}
