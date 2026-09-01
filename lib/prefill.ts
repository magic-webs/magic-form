/**
 * Prefilled values travel in the form link's query string, e.g.
 * `/f/T9UNUNUFJS?name=Jane%20Cooper&phone=%2B447700900123&qty=500`.
 *
 * They are a convenience only: the customer can edit every prefilled field,
 * and everything is validated again on submit, so a tampered query string can
 * never put a bad value in the database. The product type deliberately is NOT
 * a parameter — it comes from the stored link, so the form's field set and
 * validation rules cannot be swapped by editing the URL.
 */

export const PREFILL_PARAMS = {
  customerName: "name",
  phone: "phone",
  email: "email",
  quantity: "qty",
} as const;

export type Prefill = {
  customerName?: string;
  phone?: string;
  email?: string;
  quantity?: string;
};

/** Generous caps: enough for any real value, short enough to bound the URL. */
const LIMITS: Record<keyof Prefill, number> = {
  customerName: 80,
  phone: 25,
  email: 200,
  quantity: 7,
};

type ParamReader = { get(name: string): string | null };

export function readPrefill(params: ParamReader): Prefill {
  const prefill: Prefill = {};
  for (const [field, param] of Object.entries(PREFILL_PARAMS)) {
    const key = field as keyof Prefill;
    const raw = params.get(param);
    if (raw === null) continue;
    const value = raw.trim().slice(0, LIMITS[key]);
    if (value) prefill[key] = value;
  }
  return prefill;
}

/** Build the shareable path for a link, carrying its prefill in the query. */
export function buildFormPath(token: string, prefill: Prefill): string {
  const params = new URLSearchParams();
  for (const [field, param] of Object.entries(PREFILL_PARAMS)) {
    const value = prefill[field as keyof Prefill];
    if (value) params.set(param, value);
  }
  const query = params.toString();
  return query ? `/f/${token}?${query}` : `/f/${token}`;
}
