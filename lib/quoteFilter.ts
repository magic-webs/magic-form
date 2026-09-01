/**
 * Filtering for the admin submissions list. Kept out of the component so the
 * matching rules can be tested directly.
 */

export type FilterableQuote = {
  customerName: string;
  phone: string;
  email?: string;
  reference: string;
  productType: string;
  answers: Array<{ value: string }>;
};

export type QuoteFilter = {
  /** Free text, matched case-insensitively against contact, reference and answers. */
  search: string;
  /** Exact product name, or "" for all products. */
  productType: string;
};

export const EMPTY_FILTER: QuoteFilter = { search: "", productType: "" };

export const isFiltering = (filter: QuoteFilter): boolean =>
  filter.search.trim() !== "" || filter.productType !== "";

export function matchesQuoteFilter(
  quote: FilterableQuote,
  filter: QuoteFilter,
): boolean {
  if (filter.productType && quote.productType !== filter.productType) {
    return false;
  }

  const needle = filter.search.trim().toLowerCase();
  if (!needle) return true;

  const haystack = [
    quote.customerName,
    quote.phone,
    quote.email ?? "",
    quote.reference,
    quote.productType,
    ...quote.answers.map((answer) => answer.value),
  ];
  return haystack.some((field) => field.toLowerCase().includes(needle));
}

export function filterQuotes<T extends FilterableQuote>(
  quotes: T[],
  filter: QuoteFilter,
): T[] {
  return quotes.filter((quote) => matchesQuoteFilter(quote, filter));
}
