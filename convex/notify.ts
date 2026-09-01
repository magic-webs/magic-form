import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { buildFormPath } from "../lib/prefill";
import { DEFAULT_TIMEZONE, buildWhatsAppMessage } from "../lib/quoteMessage";

/**
 * Outbound webhook fired when a customer submits a specification.
 *
 * A Convex mutation cannot make network calls, so `submitQuote` schedules this
 * action instead. That also means the customer's submit never waits on — or
 * fails because of — the receiving system.
 *
 *   npx convex env set QUOTE_WEBHOOK_URL "https://..."
 *   npx convex env set QUOTE_WEBHOOK_SECRET "..."   # optional
 *   npx convex env set QUOTE_TIMEZONE "Asia/Kolkata"  # optional, dates in the message
 *
 * With no URL configured the delivery is marked "skipped" rather than failing.
 */

const MAX_ATTEMPTS = 3;
/** Backoff before attempt 2 and attempt 3. */
const RETRY_DELAYS_MS = [10_000, 60_000];
const REQUEST_TIMEOUT_MS = 10_000;

export const quoteForWebhook = internalQuery({
  args: { quoteId: v.id("quotes") },
  handler: async (ctx, args) => {
    const quote = await ctx.db.get(args.quoteId);
    if (!quote) return null;
    const link = await ctx.db.get(quote.linkId);
    return { quote, notes: link?.notes };
  },
});

export const markWebhookResult = internalMutation({
  args: {
    quoteId: v.id("quotes"),
    status: v.union(
      v.literal("sent"),
      v.literal("failed"),
      v.literal("skipped"),
    ),
    attempts: v.number(),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const quote = await ctx.db.get(args.quoteId);
    if (!quote) return null;
    await ctx.db.patch(args.quoteId, {
      webhookStatus: args.status,
      webhookAttempts: args.attempts,
      webhookError: args.error,
      webhookSentAt: args.status === "sent" ? Date.now() : quote.webhookSentAt,
    });
    return null;
  },
});

export const deliverQuoteWebhook = internalAction({
  args: { quoteId: v.id("quotes"), attempt: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const url = process.env.QUOTE_WEBHOOK_URL;
    if (!url) {
      await ctx.runMutation(internal.notify.markWebhookResult, {
        quoteId: args.quoteId,
        status: "skipped",
        attempts: args.attempt,
        error: "QUOTE_WEBHOOK_URL is not set.",
      });
      return null;
    }

    const loaded = await ctx.runQuery(internal.notify.quoteForWebhook, {
      quoteId: args.quoteId,
    });
    if (!loaded) return null; // Submission was deleted before we got to it.
    const { quote, notes } = loaded;

    const base = process.env.APP_BASE_URL?.replace(/\/+$/, "");
    const path = buildFormPath(quote.token, {
      customerName: quote.customerName,
      phone: quote.phone,
      email: quote.email,
      quantity: String(quote.quantity),
    });

    const payload = {
      event: "quote.submitted",
      // Ready to forward straight to WhatsApp — the structured fields below
      // are kept for anything that needs to read individual values.
      message: buildWhatsAppMessage(
        quote,
        process.env.QUOTE_TIMEZONE || DEFAULT_TIMEZONE,
      ),
      reference: quote.reference,
      submittedAt: new Date(quote.createdAt).toISOString(),
      customer: {
        name: quote.customerName,
        phone: quote.phone,
        email: quote.email ?? null,
      },
      productType: quote.productType,
      quantity: quote.quantity,
      answers: quote.answers,
      // Flat label -> value map, easier to bind to in no-code tools.
      answersByLabel: Object.fromEntries(
        quote.answers.map((answer) => [answer.label, answer.value]),
      ),
      link: {
        token: quote.token,
        url: base ? `${base}${path}` : null,
        internalNote: notes ?? null,
      },
    };

    const headers: Record<string, string> = {
      "content-type": "application/json",
      "user-agent": "printwell-quotes/1.0",
    };
    const secret = process.env.QUOTE_WEBHOOK_SECRET;
    if (secret) headers["x-webhook-secret"] = secret;

    let failure: string | null = null;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) {
        const body = (await response.text().catch(() => "")).slice(0, 300);
        failure = `HTTP ${response.status}${body ? `: ${body}` : ""}`;
      }
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
    }

    if (!failure) {
      await ctx.runMutation(internal.notify.markWebhookResult, {
        quoteId: args.quoteId,
        status: "sent",
        attempts: args.attempt,
      });
      return null;
    }

    const nextDelay = RETRY_DELAYS_MS[args.attempt - 1];
    if (args.attempt < MAX_ATTEMPTS && nextDelay !== undefined) {
      await ctx.scheduler.runAfter(
        nextDelay,
        internal.notify.deliverQuoteWebhook,
        { quoteId: args.quoteId, attempt: args.attempt + 1 },
      );
      return null;
    }

    await ctx.runMutation(internal.notify.markWebhookResult, {
      quoteId: args.quoteId,
      status: "failed",
      attempts: args.attempt,
      error: failure.slice(0, 500),
    });
    return null;
  },
});
