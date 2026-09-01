# Magic Form — Printwell quote requests

Staff enter a customer's **name**, **phone number** and **product type**, and get a
shareable link. The customer opens that link, completes the specification for
that product, and the answers are saved to Convex.

## Flow

1. **`/`** — the staff dashboard, behind an admin password. Fill in name + phone
   + product type (quantity, email and an internal note are optional) and press
   **Generate form link**.
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

`buildSteps()` in `lib/quoteSpec.ts` turns a product into screens: contact
details, then one question per visible field, then a review. Steps are rebuilt
as answers change, so `Cover Paper Weight` appears mid-flow the moment
*Cover heavier and inner lighter* is chosen, and the step count updates with it.

**Next** will not advance while the current step has an error, and only that
step's errors are shown, so the customer is never faced with a wall of red.
Selects and radios both render as large tap targets rather than dropdowns,
quantity offers preset chips, and the review screen has an **Edit** button per
answer that jumps to that step and comes straight back.

Mobile specifics: 16px inputs (smaller text makes iOS Safari zoom on focus),
48px minimum tap targets, a bottom action bar pinned above the home indicator
via `env(safe-area-inset-bottom)`, and no horizontal scrolling — long URLs
scroll inside their own box.

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

## Data model (`convex/schema.ts`)

- **`quoteLinks`** — one row per issued link: token, customer name, phone, email,
  product type, optional quantity/note, `submissionCount`, `lastSubmittedAt`.
- **`quotes`** — one row per submission: reference, contact details, product,
  quantity, and `answers` as an ordered `{ key, label, value }` list, so a stored
  quote stays readable even if the field spec later changes.
- **`adminSessions`** / **`adminLoginAttempts`** — sign-in sessions and the
  failed-attempt timestamps behind the throttle. Both are pruned on login.

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
