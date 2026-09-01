import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  /**
   * One row per shareable form link. Staff create these from the dashboard by
   * giving a customer name, phone number and product type.
   */
  quoteLinks: defineTable({
    token: v.string(),
    customerName: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    /** Left unset when the customer is the one who picks the product. */
    productType: v.optional(v.string()),
    quantity: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    submissionCount: v.number(),
    lastSubmittedAt: v.optional(v.number()),
  }).index("by_token", ["token"]),

  /** One row per completed specification submitted through a link. */
  quotes: defineTable({
    linkId: v.id("quoteLinks"),
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
  })
    .index("by_token", ["token"])
    .index("by_link", ["linkId"])
    .index("by_reference", ["reference"]),

  /** Issued after a correct admin password; expires on its own. */
  adminSessions: defineTable({
    token: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_expiry", ["expiresAt"]),

  /** Failed sign-in timestamps, used to throttle password guessing. */
  adminLoginAttempts: defineTable({
    failedAt: v.number(),
  }).index("by_failedAt", ["failedAt"]),
});
