"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api";
import {
  Button,
  Card,
  ExampleBox,
  OptionCard,
  ProgressBar,
  cn,
  controlClass,
} from "@/components/ui";
import { readPrefill } from "@/lib/prefill";
import {
  FIELDS,
  PRODUCTS,
  PRODUCT_TYPES,
  buildSteps,
  hasErrors,
  hasOtherOption,
  isOtherTrigger,
  otherKey,
  validateAnswers,
  validateContact,
  validateProductType,
  validateStep,
  type Answers,
  type Errors,
  type Step,
} from "@/lib/quoteSpec";

type Contact = { customerName: string; phone: string; email: string };

const QUANTITY_PRESETS = ["100", "250", "500", "1000", "2500", "5000"];

function convexErrors(error: unknown): { message: string; errors: Errors } {
  if (error instanceof ConvexError) {
    const data = error.data as { message?: string; errors?: Errors };
    return {
      message: data?.message ?? "Something went wrong.",
      errors: data?.errors ?? {},
    };
  }
  return {
    message: "Could not reach the server. Please try again.",
    errors: {},
  };
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col px-4 pt-4 pb-40 sm:px-6 sm:pt-8 sm:pb-10">
      {children}
    </main>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-2 text-sm font-medium text-red-600">
      {children}
    </p>
  );
}

export function QuoteForm({ token }: { token: string }) {
  const searchParams = useSearchParams();
  const link = useQuery(api.quotes.getLink, { token });
  const submitQuote = useMutation(api.quotes.submitQuote);

  // Prefills ride in the query string; the stored link is the fallback.
  const prefill = useMemo(() => readPrefill(searchParams), [searchParams]);

  // Only set when the link left the product open for the customer to pick.
  const [chosenProduct, setChosenProduct] = useState("");
  const [contactEdits, setContactEdits] = useState<Partial<Contact>>({});
  const [answerEdits, setAnswerEdits] = useState<Answers>({});
  const [serverErrors, setServerErrors] = useState<Errors>({});
  const [revealErrors, setRevealErrors] = useState(false);
  // Empty means "the first step", whichever that is — the product picker when
  // the link left the product open, otherwise contact details.
  const [stepId, setStepId] = useState<string>("");
  const [returnToReview, setReturnToReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  const contact = useMemo<Contact>(
    () => ({
      customerName:
        contactEdits.customerName ??
        prefill.customerName ??
        link?.customerName ??
        "",
      phone: contactEdits.phone ?? prefill.phone ?? link?.phone ?? "",
      email: contactEdits.email ?? prefill.email ?? link?.email ?? "",
    }),
    [contactEdits, prefill, link],
  );

  const linkQuantity = link?.quantity;
  const answers = useMemo<Answers>(() => {
    const seededQuantity =
      prefill.quantity ??
      (linkQuantity === undefined ? undefined : String(linkQuantity));
    const seeded: Answers =
      seededQuantity === undefined ? {} : { quantity: seededQuantity };
    return { ...seeded, ...answerEdits };
  }, [prefill.quantity, linkQuantity, answerEdits]);

  const askProduct = link !== undefined && link !== null && !link.productType;
  const productType = link?.productType ?? chosenProduct;
  const example = PRODUCTS[productType]?.example ?? "";
  const steps = useMemo(
    () => buildSteps(productType, answers, askProduct),
    [productType, answers, askProduct],
  );

  const foundIndex = steps.findIndex((entry) => entry.id === stepId);
  const index = foundIndex === -1 ? 0 : foundIndex;
  const step: Step = steps[index];

  const stepErrors = useMemo(
    () => validateStep(step, productType, contact, answers),
    [step, productType, contact, answers],
  );

  const errorFor = (key: string) =>
    serverErrors[key] ?? (revealErrors ? stepErrors[key] : undefined);

  const clearServerError = (key: string) =>
    setServerErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });

  const setAnswer = (key: string, value: string) => {
    setAnswerEdits((current) => {
      const next = { ...current, [key]: value };
      // Dropping the "other" choice discards whatever was typed alongside it.
      if (FIELDS[key] && hasOtherOption(FIELDS[key]) && !isOtherTrigger(value)) {
        delete next[otherKey(key)];
      }
      return next;
    });
    clearServerError(key);
  };

  const setContactField = (key: keyof Contact, value: string) => {
    setContactEdits((current) => ({ ...current, [key]: value }));
    clearServerError(key);
  };

  const goTo = (nextId: string) => {
    setStepId(nextId);
    setRevealErrors(false);
    setFormError(null);
    window.scrollTo({ top: 0 });
  };

  function goNext() {
    if (hasErrors(stepErrors)) {
      setRevealErrors(true);
      return;
    }
    if (returnToReview) {
      setReturnToReview(false);
      goTo("review");
      return;
    }
    const next = steps[index + 1];
    if (next) goTo(next.id);
  }

  function goBack() {
    if (returnToReview) {
      setReturnToReview(false);
      goTo("review");
      return;
    }
    const previous = steps[index - 1];
    if (previous) goTo(previous.id);
  }

  function editFromReview(targetId: string) {
    setReturnToReview(true);
    goTo(targetId);
  }

  async function handleSubmit() {
    if (!link) return;
    const productError = validateProductType(productType);
    const everything = {
      ...validateAnswers(productType, answers),
      ...validateContact(contact),
      ...(productError ? { productType: productError } : {}),
    };
    if (hasErrors(everything)) {
      setServerErrors(everything);
      setFormError("Some answers still need attention.");
      const firstBad = steps.find(
        (entry) => entry.id in everything || otherKey(entry.id) in everything,
      );
      if (firstBad) editFromReview(firstBad.id);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const result = await submitQuote({
        token: link.token,
        customerName: contact.customerName,
        phone: contact.phone,
        email: contact.email,
        productType,
        answers,
      });
      setReference(result.reference);
      window.scrollTo({ top: 0 });
    } catch (error) {
      const { message, errors: fieldErrors } = convexErrors(error);
      setServerErrors(fieldErrors);
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (link === undefined) {
    return (
      <Screen>
        <Card>
          <div className="animate-pulse space-y-3">
            <div className="h-3 w-1/3 rounded bg-zinc-200" />
            <div className="h-8 w-2/3 rounded bg-zinc-200" />
            <div className="h-14 rounded-xl bg-zinc-100" />
            <div className="h-14 rounded-xl bg-zinc-100" />
          </div>
        </Card>
      </Screen>
    );
  }

  if (link === null) {
    return (
      <Screen>
        <Card>
          <h1 className="mb-2 text-2xl font-semibold">Link not found</h1>
          <p className="text-zinc-600">
            This quote link is invalid or has been removed. Please ask your
            Printwell contact to send you a new one.
          </p>
        </Card>
      </Screen>
    );
  }

  if (reference) {
    return (
      <Screen>
        <Card className="text-center">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-emerald-100">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-8 text-emerald-700"
              aria-hidden
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h1 className="mb-2 text-2xl font-semibold">
            Thanks, {contact.customerName.split(" ")[0]}
          </h1>
          <p className="mb-6 text-zinc-600">
            Your {productType.toLowerCase()} specification has been saved.
            We&apos;ll be in touch on {contact.phone} with your quote.
          </p>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Your reference
            </p>
            <p className="font-mono text-lg font-semibold">{reference}</p>
          </div>
        </Card>
      </Screen>
    );
  }

  /** The control for a single spec field, chosen by its type. */
  function renderControl(key: string) {
    const field = FIELDS[key];
    const error = errorFor(key);
    const invalid = Boolean(error);
    const value = answers[key] ?? "";
    const otherName = otherKey(key);
    const otherError = errorFor(otherName);
    const showOther = hasOtherOption(field) && isOtherTrigger(value);

    return (
      <>
        {(field.type === "select" || field.type === "radio") && (
          <div
            role="radiogroup"
            aria-label={field.label}
            className="space-y-2.5"
          >
            {field.options?.map((option) => (
              <OptionCard
                key={option}
                name={key}
                label={option}
                selected={value === option}
                invalid={invalid}
                onSelect={() => setAnswer(key, option)}
              />
            ))}
          </div>
        )}

        {field.type === "textarea" && (
          <>
            <textarea
              id={key}
              value={value}
              onChange={(event) => setAnswer(key, event.target.value)}
              maxLength={field.maxLength}
              placeholder={field.placeholder}
              className={cn(controlClass(invalid), "min-h-36 resize-y")}
            />
            <p className="mt-1.5 text-right text-xs text-zinc-400">
              {value.length}/{field.maxLength}
            </p>
          </>
        )}

        {field.type === "text" && (
          <input
            id={key}
            value={value}
            onChange={(event) => setAnswer(key, event.target.value)}
            maxLength={field.maxLength ?? 200}
            placeholder={field.placeholder}
            className={controlClass(invalid)}
          />
        )}

        {field.type === "number" && (
          <>
            <input
              id={key}
              value={value}
              inputMode="numeric"
              pattern="[0-9]*"
              onChange={(event) => setAnswer(key, event.target.value)}
              maxLength={7}
              placeholder={field.placeholder}
              className={controlClass(invalid)}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {QUANTITY_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAnswer(key, preset)}
                  className={cn(
                    "min-h-10 rounded-full border px-4 text-sm font-medium transition",
                    value === preset
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50",
                  )}
                >
                  {Number(preset).toLocaleString("en-GB")}
                </button>
              ))}
            </div>
          </>
        )}

        {error && <ErrorText>{error}</ErrorText>}

        {showOther && (
          <div className="mt-3">
            <input
              id={otherName}
              value={answers[otherName] ?? ""}
              onChange={(event) => setAnswer(otherName, event.target.value)}
              aria-label={`${field.label} — please specify`}
              maxLength={200}
              placeholder="Please specify"
              className={controlClass(Boolean(otherError))}
            />
            {otherError && <ErrorText>{otherError}</ErrorText>}
          </div>
        )}
      </>
    );
  }

  const contactRows = [
    { label: "Name", value: contact.customerName },
    { label: "Phone", value: contact.phone },
    ...(contact.email ? [{ label: "Email", value: contact.email }] : []),
  ];

  const isReview = step.kind === "review";
  const isLastQuestion = index === steps.length - 2;

  return (
    <Screen>
      <div className="mb-4">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <p className="truncate text-sm font-semibold text-zinc-900">
            {productType || "New quote request"}
          </p>
          <p className="shrink-0 text-xs font-medium text-zinc-500">
            Step {index + 1} of {steps.length}
          </p>
        </div>
        <ProgressBar current={index} total={steps.length} />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (isReview) void handleSubmit();
          else goNext();
        }}
      >
        <Card>
          {step.kind === "contact" && (
            <>
              <h1 className="text-2xl font-semibold tracking-tight">
                Your details
              </h1>
              <p className="mt-1.5 mb-5 text-zinc-600">
                Confirm how we should reach you about this quote.
              </p>
              {example && (
                <div className="mb-6">
                  <ExampleBox text={example} />
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="customerName"
                    className="mb-2 block text-sm font-semibold text-zinc-800"
                  >
                    Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="customerName"
                    value={contact.customerName}
                    onChange={(event) =>
                      setContactField("customerName", event.target.value)
                    }
                    maxLength={80}
                    autoComplete="name"
                    className={controlClass(Boolean(errorFor("customerName")))}
                  />
                  {errorFor("customerName") && (
                    <ErrorText>{errorFor("customerName")}</ErrorText>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 block text-sm font-semibold text-zinc-800"
                  >
                    Phone number <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={contact.phone}
                    onChange={(event) =>
                      setContactField("phone", event.target.value)
                    }
                    maxLength={25}
                    className={controlClass(Boolean(errorFor("phone")))}
                  />
                  {errorFor("phone") && (
                    <ErrorText>{errorFor("phone")}</ErrorText>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-zinc-800"
                  >
                    Email{" "}
                    <span className="font-normal text-zinc-400">Optional</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={contact.email}
                    onChange={(event) =>
                      setContactField("email", event.target.value)
                    }
                    className={controlClass(Boolean(errorFor("email")))}
                  />
                  {errorFor("email") && (
                    <ErrorText>{errorFor("email")}</ErrorText>
                  )}
                </div>
              </div>
            </>
          )}

          {step.kind === "product" && (
            <>
              <h1 className="text-2xl font-semibold tracking-tight">
                What would you like printed?
              </h1>
              <p className="mt-1.5 mb-5 text-zinc-600">
                Pick a product and we&apos;ll ask only what that job needs.
              </p>
              <div
                role="radiogroup"
                aria-label="Product type"
                className="space-y-2.5"
              >
                {PRODUCT_TYPES.map((product) => (
                  <OptionCard
                    key={product}
                    name="productType"
                    label={product}
                    selected={chosenProduct === product}
                    invalid={Boolean(errorFor("productType"))}
                    onSelect={() => {
                      setChosenProduct(product);
                      clearServerError("productType");
                    }}
                  />
                ))}
              </div>
              {errorFor("productType") && (
                <ErrorText>{errorFor("productType")}</ErrorText>
              )}
              {example && (
                <div className="mt-5">
                  <ExampleBox text={example} />
                </div>
              )}
            </>
          )}

          {step.kind === "field" && (
            <>
              <div className="mb-5">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {FIELDS[step.id].label}
                </h1>
                {!FIELDS[step.id].required && (
                  <span className="mt-2 inline-block rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500">
                    Optional
                  </span>
                )}
              </div>
              {renderControl(step.id)}
            </>
          )}

          {isReview && (
            <>
              <h1 className="text-2xl font-semibold tracking-tight">
                Review your request
              </h1>
              <p className="mt-1.5 mb-5 text-zinc-600">
                Check everything below, then send it to us.
              </p>

              <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200">
                {askProduct && (
                  <div className="flex items-start gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Product
                      </p>
                      <p className="mt-1 text-sm break-words">{productType}</p>
                    </div>
                    <Button
                      variant="ghost"
                      className="min-h-9 px-3 text-sm"
                      onClick={() => editFromReview("product")}
                    >
                      Edit
                    </Button>
                  </div>
                )}
                <div className="flex items-start gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Your details
                    </p>
                    {contactRows.map((row) => (
                      <p key={row.label} className="mt-1 text-sm break-words">
                        <span className="text-zinc-500">{row.label}: </span>
                        {row.value}
                      </p>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    className="min-h-9 px-3 text-sm"
                    onClick={() => editFromReview("contact")}
                  >
                    Edit
                  </Button>
                </div>

                {steps
                  .filter((entry) => entry.kind === "field")
                  .map((entry) => {
                    const raw = answers[entry.id] ?? "";
                    const shown = isOtherTrigger(raw)
                      ? (answers[otherKey(entry.id)] ?? "")
                      : raw;
                    return (
                      <div key={entry.id} className="flex items-start gap-3 p-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            {entry.label}
                          </p>
                          <p
                            className={cn(
                              "mt-1 text-sm break-words",
                              shown || "text-zinc-400 italic",
                            )}
                          >
                            {shown || "Not provided"}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          className="min-h-9 px-3 text-sm"
                          onClick={() => editFromReview(entry.id)}
                        >
                          Edit
                        </Button>
                      </div>
                    );
                  })}
              </div>
            </>
          )}

          {formError && <ErrorText>{formError}</ErrorText>}
        </Card>

        <nav
          className={cn(
            "fixed inset-x-0 bottom-0 z-10 flex gap-3 border-t border-zinc-200 bg-white/95 py-3 backdrop-blur",
            // Safe-area insets keep the bar clear of the home indicator, and
            // of the notch when the phone is held sideways.
            "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
            "pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]",
            "sm:static sm:mt-5 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none",
          )}
        >
          <Button
            variant="secondary"
            onClick={goBack}
            disabled={index === 0 && !returnToReview}
            className="flex-1 sm:flex-none sm:px-8"
          >
            Back
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="flex-[2] sm:flex-none sm:px-8"
          >
            {isReview
              ? submitting
                ? "Sending…"
                : "Submit quote request"
              : returnToReview
                ? "Done"
                : isLastQuestion
                  ? "Review"
                  : "Next"}
          </Button>
        </nav>
      </form>
    </Screen>
  );
}
