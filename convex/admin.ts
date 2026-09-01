import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  ATTEMPT_WINDOW_MS,
  MAX_FAILED_ATTEMPTS,
  SESSION_TTL_MS,
  constantTimeEqual,
  isValidSession,
  randomSessionToken,
} from "./lib/auth";

/**
 * Exchange the shared admin password for a session token.
 *
 * The password lives in a Convex environment variable, so it never ships to
 * the browser: `npx convex env set ADMIN_PASSWORD "<password>"`.
 */
export const login = mutation({
  args: { password: v.string() },
  returns: v.object({ token: v.string(), expiresAt: v.number() }),
  handler: async (ctx, args) => {
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) {
      throw new ConvexError({
        message:
          'No admin password is configured. Run: npx convex env set ADMIN_PASSWORD "<password>"',
      });
    }

    const now = Date.now();
    const windowStart = now - ATTEMPT_WINDOW_MS;

    // Drop attempt rows that have aged out, then throttle on what is left.
    const stale = await ctx.db
      .query("adminLoginAttempts")
      .withIndex("by_failedAt", (q) => q.lte("failedAt", windowStart))
      .take(100);
    for (const row of stale) await ctx.db.delete(row._id);

    const recent = await ctx.db
      .query("adminLoginAttempts")
      .withIndex("by_failedAt", (q) => q.gt("failedAt", windowStart))
      .collect();

    if (recent.length >= MAX_FAILED_ATTEMPTS) {
      throw new ConvexError({
        message: "Too many failed attempts. Please wait a minute and retry.",
      });
    }

    if (!constantTimeEqual(args.password, expected)) {
      await ctx.db.insert("adminLoginAttempts", { failedAt: now });
      throw new ConvexError({
        message: "Incorrect password.",
        errors: { password: "Incorrect password." },
      });
    }

    // Opportunistically clear out sessions that have already expired.
    const expired = await ctx.db
      .query("adminSessions")
      .withIndex("by_expiry", (q) => q.lte("expiresAt", now))
      .take(100);
    for (const session of expired) await ctx.db.delete(session._id);

    const token = randomSessionToken();
    const expiresAt = now + SESSION_TTL_MS;
    await ctx.db.insert("adminSessions", { token, createdAt: now, expiresAt });
    return { token, expiresAt };
  },
});

/** Lets the dashboard show the sign-in screen the moment a session lapses. */
export const checkSession = query({
  args: { sessionToken: v.optional(v.string()) },
  returns: v.boolean(),
  handler: async (ctx, args) => isValidSession(ctx, args.sessionToken),
});

export const logout = mutation({
  args: { sessionToken: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("adminSessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();
    if (session) await ctx.db.delete(session._id);
    return null;
  },
});
