import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import {
  buildAnswerRows,
  hasErrors,
  PRODUCTS,
  validateAnswers,
  validateContact,
  validateLinkInput,
  type Errors,
} from "../lib/quoteSpec";
import { isValidSession, requireAdmin } from "./lib/auth";

/** Ambiguous characters (0/O, 1/I) are left out so tokens survive being read aloud. */
const TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomToken(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => TOKEN_ALPHABET[byte % TOKEN_ALPHABET.length]).join("");
}

async function uniqueToken(ctx: MutationCtx): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const token = randomToken(10);
    const clash = await ctx.db
      .query("quoteLinks")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!clash) return token;
  }
  throw new ConvexError({ message: "Could not allocate a link. Please retry." });
}

/** Throws a ConvexError carrying per-field messages the form can display. */
function rejectOnErrors(errors: Errors): void {
  if (hasErrors(errors)) {
    throw new ConvexError({ message: "Please correct the highlighted fields.", errors });
  }
}

const trim = (value: string | undefined) => (value ?? "").trim();
const optional = (value: string | undefined) => {
  const trimmed = trim(value);
  return trimmed === "" ? undefined : trimmed;
};

/**
 * Mint a shareable link. Staff supply the customer's name, phone number and
 * the product type; everything else on the form is filled in by the customer.
 */
export const createLink = mutation({
  args: {
    sessionToken: v.string(),
    customerName: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    productType: v.string(),
    quantity: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.object({ token: v.string() }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    rejectOnErrors(validateLinkInput(args));

    const token = await uniqueToken(ctx);
    const quantity = optional(args.quantity);

    await ctx.db.insert("quoteLinks", {
      token,
      customerName: trim(args.customerName),
      phone: trim(args.phone),
      email: optional(args.email),
      productType: trim(args.productType),
      quantity: quantity === undefined ? undefined : Number(quantity),
      notes: optional(args.notes),
      createdAt: Date.now(),
      submissionCount: 0,
    });

    return { token };
  },
});

const linkShape = v.object({
  token: v.string(),
  customerName: v.string(),
  phone: v.string(),
  email: v.optional(v.string()),
  productType: v.string(),
  quantity: v.optional(v.number()),
  notes: v.optional(v.string()),
  createdAt: v.number(),
  submissionCount: v.number(),
  lastSubmittedAt: v.optional(v.number()),
  example: v.string(),
});

/** What the public form page loads. Returns null for an unknown token. */
export const getLink = query({
  args: { token: v.string() },
  returns: v.union(linkShape, v.null()),
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("quoteLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token.trim().toUpperCase()))
      .unique();
    if (!link) return null;

    return {
      token: link.token,
      customerName: link.customerName,
      phone: link.phone,
      email: link.email,
      productType: link.productType,
      quantity: link.quantity,
      notes: link.notes,
      createdAt: link.createdAt,
      submissionCount: link.submissionCount,
      lastSubmittedAt: link.lastSubmittedAt,
      example: PRODUCTS[link.productType]?.example ?? "",
    };
  },
});

function referenceFor(createdAt: number): string {
  const date = new Date(createdAt);
  const stamp = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("");
  return `PW-${stamp}-${randomToken(4)}`;
}

/**
 * Save a completed specification. Every answer is re-validated here against
 * the product spec, so the stored row is always well formed.
 */
export const submitQuote = mutation({
  args: {
    token: v.string(),
    customerName: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    answers: v.record(v.string(), v.string()),
  },
  returns: v.object({ reference: v.string() }),
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("quoteLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token.trim().toUpperCase()))
      .unique();
    if (!link) {
      throw new ConvexError({ message: "This quote link is no longer valid." });
    }

    rejectOnErrors({
      ...validateContact(args),
      ...validateAnswers(link.productType, args.answers),
    });

    const createdAt = Date.now();
    const reference = referenceFor(createdAt);

    await ctx.db.insert("quotes", {
      linkId: link._id,
      token: link.token,
      reference,
      customerName: trim(args.customerName),
      phone: trim(args.phone),
      email: optional(args.email),
      productType: link.productType,
      quantity: Number(trim(args.answers.quantity)),
      answers: buildAnswerRows(link.productType, args.answers),
      createdAt,
    });

    await ctx.db.patch(link._id, {
      submissionCount: link.submissionCount + 1,
      lastSubmittedAt: createdAt,
    });

    return { reference };
  },
});

/**
 * Dashboard listing of issued links, newest first.
 * Returns null (rather than throwing) when the session is missing or expired,
 * so the dashboard can render the sign-in screen instead of an error.
 */
export const listLinks = query({
  args: { sessionToken: v.optional(v.string()) },
  returns: v.union(
    v.null(),
    v.array(
    v.object({
      _id: v.id("quoteLinks"),
      token: v.string(),
      customerName: v.string(),
      phone: v.string(),
      email: v.optional(v.string()),
      productType: v.string(),
      quantity: v.optional(v.number()),
      notes: v.optional(v.string()),
      createdAt: v.number(),
      submissionCount: v.number(),
      lastSubmittedAt: v.optional(v.number()),
    }),
    ),
  ),
  handler: async (ctx, args) => {
    if (!(await isValidSession(ctx, args.sessionToken))) return null;
    const links = await ctx.db.query("quoteLinks").order("desc").take(100);
    return links.map((link) => ({
      _id: link._id,
      token: link.token,
      customerName: link.customerName,
      phone: link.phone,
      email: link.email,
      productType: link.productType,
      quantity: link.quantity,
      notes: link.notes,
      createdAt: link.createdAt,
      submissionCount: link.submissionCount,
      lastSubmittedAt: link.lastSubmittedAt,
    }));
  },
});

/** Dashboard listing of saved submissions, newest first. Null when signed out. */
export const listQuotes = query({
  args: { sessionToken: v.optional(v.string()) },
  returns: v.union(
    v.null(),
    v.array(
    v.object({
      _id: v.id("quotes"),
      token: v.string(),
      reference: v.string(),
      customerName: v.string(),
      phone: v.string(),
      email: v.optional(v.string()),
      productType: v.string(),
      quantity: v.number(),
      answers: v.array(
        v.object({ key: v.string(), label: v.string(), value: v.string() }),
      ),
      createdAt: v.number(),
    }),
    ),
  ),
  handler: async (ctx, args) => {
    if (!(await isValidSession(ctx, args.sessionToken))) return null;
    const quotes = await ctx.db.query("quotes").order("desc").take(100);
    return quotes.map((quote) => ({
      _id: quote._id,
      token: quote.token,
      reference: quote.reference,
      customerName: quote.customerName,
      phone: quote.phone,
      email: quote.email,
      productType: quote.productType,
      quantity: quote.quantity,
      answers: quote.answers,
      createdAt: quote.createdAt,
    }));
  },
});

/** Remove a link and every submission made through it. */
export const deleteLink = mutation({
  args: { sessionToken: v.string(), linkId: v.id("quoteLinks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    const submissions = await ctx.db
      .query("quotes")
      .withIndex("by_link", (q) => q.eq("linkId", args.linkId))
      .collect();
    for (const submission of submissions) {
      await ctx.db.delete(submission._id);
    }
    await ctx.db.delete(args.linkId);
    return null;
  },
});
