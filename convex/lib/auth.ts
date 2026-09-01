import { ConvexError } from "convex/values";
import type { QueryCtx } from "../_generated/server";

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
export const ATTEMPT_WINDOW_MS = 60 * 1000;
export const MAX_FAILED_ATTEMPTS = 20;

const SESSION_ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function randomSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(
    bytes,
    (byte) => SESSION_ALPHABET[byte % SESSION_ALPHABET.length],
  ).join("");
}

/**
 * Compare without an early exit, so the time taken does not reveal how much of
 * the password was correct. Length is still observable, which is acceptable
 * for a single shared secret.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) {
    difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return difference === 0;
}

export async function isValidSession(
  ctx: QueryCtx,
  sessionToken: string | undefined,
): Promise<boolean> {
  if (!sessionToken) return false;
  const session = await ctx.db
    .query("adminSessions")
    .withIndex("by_token", (q) => q.eq("token", sessionToken))
    .unique();
  return session !== null && session.expiresAt > Date.now();
}

/** For mutations, where an outright failure is the right response. */
export async function requireAdmin(
  ctx: QueryCtx,
  sessionToken: string | undefined,
): Promise<void> {
  if (!(await isValidSession(ctx, sessionToken))) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Your admin session has expired. Please sign in again.",
    });
  }
}
