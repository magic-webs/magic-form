/**
 * Renders a submitted quote as a ready-to-send WhatsApp message.
 *
 * WhatsApp markup is *bold*, _italic_, ```monospace```. Only bold is used —
 * it degrades to visible asterisks anywhere else, which still reads fine.
 *
 * It is written to the customer: a confirmation that their request arrived,
 * plus a read-back of what they asked for so a mistake is easy to spot. No
 * greeting or sign-off - the sending channel supplies that.
 *
 * Nothing internal appears here: no staff note, no form URL, no token.
 */

export type QuoteSummary = {
  reference: string;
  createdAt: number;
  customerName: string;
  phone: string;
  email?: string;
  productType: string;
  quantity: number;
  answers: Array<{ key: string; label: string; value: string }>;
};

export const DEFAULT_TIMEZONE = "Europe/London";

/** e.g. "01 Sep 2026, 14:30". Falls back to UTC if the zone is unknown. */
export function formatQuoteDate(ms: number, timeZone = DEFAULT_TIMEZONE): string {
  const options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };
  try {
    return new Intl.DateTimeFormat("en-GB", { ...options, timeZone }).format(
      new Date(ms),
    );
  } catch {
    return `${new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(new Date(ms))} UTC`;
  }
}

/** Shown in their own sections rather than in the spec list. */
const SPECIAL_KEYS = new Set(["quantity", "additional"]);

export function buildWhatsAppMessage(
  quote: QuoteSummary,
  timeZone = DEFAULT_TIMEZONE,
): string {
  const lines: string[] = [];

  lines.push(
    "Thanks for your quote request. We have got it and will come back to you shortly with a price.",
  );
  lines.push("");
  lines.push(`*Your reference:* ${quote.reference}`);
  lines.push(`*Received:* ${formatQuoteDate(quote.createdAt, timeZone)}`);
  lines.push("");

  lines.push("*What you asked for*");
  lines.push(`• Product: ${quote.productType}`);
  lines.push(`• Quantity: ${quote.quantity.toLocaleString("en-GB")}`);
  for (const answer of quote.answers) {
    if (SPECIAL_KEYS.has(answer.key)) continue;
    if (!answer.value) continue;
    lines.push(`• ${answer.label}: ${answer.value}`);
  }

  const additional = quote.answers.find((answer) => answer.key === "additional");
  if (additional?.value) {
    lines.push("");
    lines.push("*Your notes*");
    lines.push(additional.value);
  }

  return lines.join("\n");
}
