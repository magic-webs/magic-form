import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError } from "convex/values";
import { buildFormPath } from "../lib/prefill";
import { constantTimeEqual } from "./lib/auth";

/**
 * Server-to-server API for creating quote links.
 *
 * Base URL is the Convex *site* domain (`.convex.site`, not `.convex.cloud`),
 * which is already in `.env.local` as NEXT_PUBLIC_CONVEX_SITE_URL.
 *
 * Auth is a bearer API key held in a Convex environment variable:
 *   npx convex env set QUOTE_API_KEY "<key>"
 *
 * Set APP_BASE_URL too (e.g. https://quotes.example.com) so responses can
 * include a ready-to-send absolute URL rather than just a path.
 */

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

/** Reads `Authorization: Bearer <key>`; also accepts `x-api-key`. */
function presentedKey(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
  }
  return request.headers.get("x-api-key");
}

function authorize(request: Request): Response | null {
  const expected = process.env.QUOTE_API_KEY;
  if (!expected) {
    return json(503, {
      error: "not_configured",
      message:
        'No API key is configured. Run: npx convex env set QUOTE_API_KEY "<key>"',
    });
  }
  const presented = presentedKey(request);
  if (!presented || !constantTimeEqual(presented, expected)) {
    return json(401, {
      error: "unauthorized",
      message: "Missing or invalid API key.",
    });
  }
  return null;
}

const asText = (value: unknown): string | undefined =>
  typeof value === "string"
    ? value
    : typeof value === "number"
      ? String(value)
      : undefined;

const createLink = httpAction(async (ctx, request) => {
  const denied = authorize(request);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("not an object");
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return json(400, {
      error: "invalid_body",
      message: "Request body must be a JSON object.",
    });
  }

  try {
    const { token } = await ctx.runMutation(internal.quotes.createLinkViaApi, {
      customerName: asText(body.customerName) ?? "",
      phone: asText(body.phone) ?? "",
      productType: asText(body.productType),
      email: asText(body.email),
      quantity: asText(body.quantity),
      notes: asText(body.notes),
    });

    const path = buildFormPath(token, {
      customerName: asText(body.customerName),
      phone: asText(body.phone),
      email: asText(body.email),
      quantity: asText(body.quantity),
    });
    const base = process.env.APP_BASE_URL?.replace(/\/+$/, "");

    return json(201, {
      token,
      path,
      url: base ? `${base}${path}` : null,
      productType: asText(body.productType),
      customerName: asText(body.customerName),
    });
  } catch (error) {
    if (error instanceof ConvexError) {
      const data = error.data as { message?: string; errors?: Record<string, string> };
      return json(400, {
        error: "validation_failed",
        message: data?.message ?? "Invalid request.",
        fields: data?.errors ?? {},
      });
    }
    return json(500, {
      error: "server_error",
      message: "Could not create the link.",
    });
  }
});

const http = httpRouter();

http.route({ path: "/api/links", method: "POST", handler: createLink });

export default http;
