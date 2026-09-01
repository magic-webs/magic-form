# Magic Form — Printwell quote requests

Staff enter a customer's **name**, **phone number** and **product type**, and get a
shareable link. The customer opens that link, completes the specification for
that product, and the answers are saved to Convex.

## Flow

1. **`/`** — the staff dashboard, behind an admin password. Fill in name +
   phone and press **Generate form link**. Product type is optional: set it to
   fix the job, or leave it as *Customer chooses* and the form asks for it.
2. You get a URL with the prefill in its query string:
   `http://localhost:3000/f/J36QEMTCYE?name=Jane+Cooper&phone=%2B44+7700+900123&qty=500`
3. **`/f/<token>`** — the customer's form, a one-question-at-a-time wizard with
   **Back** / **Next**, a progress bar and a review screen before sending. It is
   scoped to the chosen product, so it asks only that product's questions.
4. On submit the specification is stored and the customer sees a reference such
   as `PW-20260901-SHDD`. Every submission appears back on the dashboard.

## Prefilled fields come from the query string

`lib/prefill.ts` defines the parameters: `name`, `phone`, `email`, `qty`. They
are a convenience only — the customer can edit every one of them, values are
length-capped on read, and everything is validated again on submit, so editing
the URL cannot put a bad value in the database.

The **product type is deliberately not a parameter**. It comes from the stored
link, so the form's question set and validation rules cannot be swapped by
tampering with the URL. If the query string is stripped, the form falls back to
the values saved with the link.

## The customer wizard

`buildSteps()` in `lib/quoteSpec.ts` turns a product into screens: the product
type (only when the link left it open), contact details, then one question per
visible field, then a review.

When the link has no product type, the customer picks it on the very first
screen — with their name and phone already prefilled behind it — and the rest of
the questions appear once they choose. A product fixed on the link always wins:
`submitQuote` ignores any `productType` sent by the client in that case, so the
question set cannot be swapped by a hand-rolled request. Steps are rebuilt
as answers change, so `Cover Paper Weight` appears mid-flow the moment
*Cover heavier and inner lighter* is chosen, and the step count updates with it.

**Next** will not advance while the current step has an error, and only that
step's errors are shown, so the customer is never faced with a wall of red.
Selects and radios both render as large tap targets rather than dropdowns,
quantity offers preset chips, and the review screen has an **Edit** button per
answer that jumps to that step and comes straight back.

### iOS specifics

Four things are done deliberately to stop mobile Safari zooming:

- **16px inputs.** Safari zooms in on focus when a text field is under 16px.
- **`touch-action: manipulation`** on buttons, labels, links and the option
  radios. Without it, two quick taps count as double-tap-to-zoom and the page
  ends up zoomed after a few option taps. Text inputs are deliberately excluded
  so double-tap still selects a word.
- **Option-card radios are full-size and transparent, not `sr-only`.** Safari
  zooms toward a focused element smaller than the tap area, and a 1×1 clipped
  radio inside a 56px card triggers exactly that.
- **`viewportFit: "cover"`** in the root `viewport` export. `env(safe-area-inset-*)`
  reports 0 without it, which would leave the bottom bar under the home indicator.

Pinch-to-zoom is left enabled on purpose. `maximum-scale=1` / `user-scalable=no`
would also stop the zooming, by making the page inaccessible to anyone who needs
to magnify it.

Also: 48px minimum tap targets, and no horizontal scrolling — long URLs scroll
inside their own box.

## Validation

`lib/quoteSpec.ts` is the single source of truth — product list, per-product
fields, and every rule. The browser imports it for live inline errors, and the
Convex mutations import the same functions and re-check everything, so a request
that skips the UI is rejected the same way.

What is enforced:

- **Required fields** per product, plus allowed-value checks on every select and
  radio (a value not in the option list is refused).
- **Conditional fields** — `Cover Paper Weight` is only asked, and only
  required, when `Booklet / Brochure Type` is *Cover heavier and inner lighter*.
  Hidden fields are neither validated nor stored.
- **"Other please complete" / "Please describe"** open a companion text box that
  becomes required (2–200 chars). The stored answer is the text that was typed.
- **Quantity** — whole number, 1 to 1,000,000.
- **Name** — 2–80 characters, letters/spaces/apostrophes/hyphens.
- **Phone** — 7–15 digits, allowing `+ ( ) -` and spaces.
- **Email** — optional everywhere, format-checked when supplied.
- Length caps on free text (additional info 2000, label size 100, note 1000).

On the customer wizard, errors appear when **Next** is pressed and block the
step until fixed. On the staff dashboard they appear per field on blur. In both
cases server-side failures come back as a `ConvexError` carrying per-field
messages, which the UI maps onto the same inputs.

## Reading submissions

Submitted specifications are visible only on the password-gated dashboard, and
`listQuotes` refuses to return anything without a valid session — the gate is
server-side, not just a hidden UI section.

The list has a free-text search (name, phone, email, reference, product and any
answer value) plus a product dropdown that only offers products that actually
have submissions. Matching lives in `lib/quoteFilter.ts` so it can be tested on
its own. Filtering happens in the browser over the 100 most recent rows that
`listQuotes` returns; past that it would need to move into the query.

## Admin password

The dashboard is gated by a single shared password held in a Convex environment
variable, so it never reaches the browser:

```bash
npx convex env set ADMIN_PASSWORD "your-password"
```

Signing in exchanges the password for a session token (valid 12 hours, kept in
`localStorage`). `createLink`, `listLinks`, `listQuotes` and `deleteLink` all
verify that token **server-side** — the gate is not just the UI. The listing
queries return `null` when the session is missing or expired so the dashboard
can show the sign-in screen; the mutations reject outright.

The password is compared without an early exit so the response time does not
reveal how much of it was right, and more than 20 failed attempts in a minute
are refused. That throttle is global rather than per-IP, which means a
determined attacker could keep the admin locked out in one-minute stretches —
an acceptable trade against unlimited password guessing, but worth replacing
with real auth if this becomes business-critical.

## HTTP API — create a link

For other systems (a CRM, a website form, a WhatsApp bot) to issue links
without a browser session. Defined in `convex/http.ts`.

**Base URL** is the Convex *site* domain — `.convex.site`, not `.convex.cloud`.
It is in `.env.local` as `NEXT_PUBLIC_CONVEX_SITE_URL`.

### Setup

```bash
npx convex env set QUOTE_API_KEY "<a long random key>"
npx convex env set APP_BASE_URL "https://quotes.example.com"
```

`APP_BASE_URL` is what the API prefixes onto the returned path; without it the
response still gives you `path` and `url` comes back `null`.

### `POST /api/links`

| Field | Required | Notes |
| --- | --- | --- |
| `customerName` | yes | 2–80 characters |
| `phone` | yes | 7–15 digits, `+ ( ) -` and spaces allowed |
| `productType` | yes | must match a product name exactly |
| `quantity` | no | whole number 1–1,000,000; accepts a JSON number or string |
| `email` | no | format-checked when supplied |
| `notes` | no | internal only, never shown to the customer |

Authenticate with `Authorization: Bearer <key>` or `x-api-key: <key>`.

```bash
curl -X POST "$CONVEX_SITE_URL/api/links"   -H "authorization: Bearer $QUOTE_API_KEY"   -H "content-type: application/json"   -d '{
        "customerName": "Jane Cooper",
        "phone": "+44 7700 900123",
        "productType": "Booklet",
        "quantity": 500,
        "email": "jane@example.com"
      }'
```

`201 Created`:

```json
{
  "token": "BJ3GHGS8UC",
  "path": "/f/BJ3GHGS8UC?name=Jane+Cooper&phone=%2B44+7700+900123&email=jane%40example.com&qty=500",
  "url": "https://quotes.example.com/f/BJ3GHGS8UC?name=Jane+Cooper&...",
  "productType": "Booklet",
  "customerName": "Jane Cooper"
}
```

Send `url` to the customer.

### Errors

| Status | `error` | When |
| --- | --- | --- |
| 400 | `invalid_body` | body is not a JSON object |
| 400 | `validation_failed` | a field failed validation — see `fields` |
| 401 | `unauthorized` | missing or wrong API key |
| 503 | `not_configured` | `QUOTE_API_KEY` is not set on the deployment |

`validation_failed` names each bad field, using the same rules as the UI:

```json
{
  "error": "validation_failed",
  "message": "Please correct the highlighted fields.",
  "fields": {
    "phone": "Phone number is too short.",
    "productType": "Choose a product type from the list."
  }
}
```

### Notes

- **Server-to-server only.** There are no CORS headers, deliberately: an API key
  in browser JavaScript is public. Call this from your backend.
- The key is compared without an early exit, but unlike the admin password it is
  **not** rate limited — it is expected to be long and random.
- Valid product names are the keys of `PRODUCTS` in `lib/quoteSpec.ts`.

## Webhook on submit

Every submitted specification is POSTed to an external endpoint — set it with:

```bash
npx convex env set QUOTE_WEBHOOK_URL "https://..."
npx convex env set QUOTE_WEBHOOK_SECRET "..."      # optional, sent as x-webhook-secret
npx convex env set QUOTE_TIMEZONE "Asia/Kolkata"   # optional, dates in the message
```

A Convex mutation cannot make network calls, so `submitQuote` schedules the
action in `convex/notify.ts` instead. That is also the right behaviour for the
customer: their submit never waits on, or fails because of, the receiving
system. Scheduled work only runs if the mutation commits, so a rejected
submission never fires a webhook.

### Payload

The customer's number plus the summary. The text is written *to the customer* -
a receipt-style confirmation with a read-back of their spec, built by
`lib/quoteMessage.ts` using `*bold*` markup:

```json
{
  "phone": "+44 7700 900123",
  "phoneDigits": "447700900123",
  "message": "Thanks for your quote request. We have got it and will come back to you shortly with a price.

*Your reference:* PW-20260901-MLLB
*Received:* 01 Sept 2026, 14:30

*What you asked for*
..."
}
```

`phone` is exactly what the customer typed. `phoneDigits` is the same number
stripped of spaces and punctuation, for APIs that want bare digits.

**`phoneDigits` carries a country code only if the customer typed one.** The
form accepts local formats, so `07700900456` stays `07700900456` and
`(0044) 7700-900123` becomes `00447700900123` - neither will dial on WhatsApp.
Either prefix a default country code in the receiving automation, or make the
form require a leading `+`.

`content-type` is `application/json`, and `x-webhook-secret` is added when
`QUOTE_WEBHOOK_SECRET` is set. Nothing internal appears in the message: no
staff note, no form URL, no token, and the customer's own phone and email are
not read back at them inside the text.

Dates in the message follow `QUOTE_TIMEZONE`, defaulting to `Europe/London`.

### Delivery and retries

Up to 3 attempts, backing off 10s then 60s, each with a 10s timeout. Anything
outside 2xx counts as a failure. The outcome is recorded on the quote
(`webhookStatus`, `webhookAttempts`, `webhookError`), and the dashboard shows a
**Webhook failed** badge with the error, so a lost notification is visible
rather than silent. With no URL configured, delivery is marked `skipped`.

## Data model (`convex/schema.ts`)

- **`quoteLinks`** — one row per issued link: token, customer name, phone, email,
  product type, optional quantity/note, `submissionCount`, `lastSubmittedAt`.
- **`quotes`** — one row per submission: reference, contact details, product,
  quantity, and `answers` as an ordered `{ key, label, value }` list, so a stored
  quote stays readable even if the field spec later changes.
- **`adminSessions`** / **`adminLoginAttempts`** — sign-in sessions and the
  failed-attempt timestamps behind the throttle. Both are pruned on login.

Quotes also carry `webhookStatus` / `webhookAttempts` / `webhookError` /
`webhookSentAt`, all optional so rows created before the webhook stay valid.

Tokens are 10 characters from an alphabet with `0/O` and `1/I` removed, so they
survive being read over the phone.

## Running it

```bash
npx convex dev   # keep running: pushes functions and watches for changes
npm run dev      # http://localhost:3000
```

`.env.local` already holds `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL`.

## Before this goes public

- **Change the admin password.** A placeholder is currently set on the dev
  deployment; replace it with `npx convex env set ADMIN_PASSWORD "..."`, and set
  it separately on prod (`--prod`) — Convex environment variables do not carry
  across deployments.
- One shared password means no per-user accounts and no audit trail of who
  issued or deleted a link. Move to Convex Auth if you need either.
- The `/f/<token>` form is public by design; the 10-character token is the only
  thing protecting it, which is appropriate for a quote request but not for
  anything confidential.
- **Set `APP_BASE_URL`, `QUOTE_API_KEY` and `QUOTE_WEBHOOK_URL` on prod too** (`npx convex env set
  --prod ...`). Convex environment variables do not carry between deployments,
  and on prod `APP_BASE_URL` must be your real domain or the API will hand out
  localhost links.
