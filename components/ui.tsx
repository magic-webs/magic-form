import type { ReactNode } from "react";

export const cn = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

// 16px text is deliberate: anything smaller makes iOS Safari zoom on focus.
const controlBase =
  "w-full min-h-12 rounded-xl border bg-white px-4 py-3 text-base text-zinc-900 outline-none transition placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500";

const controlOk =
  "border-zinc-300 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/10";

const controlBad =
  "border-red-500 bg-red-50/40 focus:border-red-500 focus:ring-4 focus:ring-red-500/15";

/** Shared input/select/textarea styling, switched by validation state. */
export const controlClass = (invalid?: boolean) =>
  cn(controlBase, invalid ? controlBad : controlOk);

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function FieldShell({
  id,
  label,
  required,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-5">
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold text-zinc-800"
      >
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-zinc-500">{hint}</p>}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 text-xs font-medium text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}

type ButtonProps = {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  type?: "submit" | "button";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
};

const VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-zinc-900 text-white hover:bg-zinc-800 disabled:bg-zinc-300 disabled:text-zinc-500",
  secondary:
    "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 disabled:text-zinc-400",
  ghost: "text-zinc-600 hover:bg-zinc-100 disabled:text-zinc-400",
  danger: "text-red-600 hover:bg-red-50",
};

export function Button({
  children,
  variant = "primary",
  type = "button",
  disabled,
  onClick,
  className,
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold transition select-none",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900",
        "disabled:cursor-not-allowed active:scale-[0.99]",
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

/** A large tap target used in place of radios and dropdowns on the wizard. */
export function OptionCard({
  label,
  selected,
  invalid,
  onSelect,
  name,
}: {
  label: string;
  selected: boolean;
  invalid?: boolean;
  onSelect: () => void;
  name: string;
}) {
  return (
    <label
      className={cn(
        "relative flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-base transition active:scale-[0.995]",
        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-zinc-900 has-[:focus-visible]:ring-offset-2",
        selected
          ? "border-zinc-900 bg-zinc-900/[0.04] ring-2 ring-zinc-900"
          : invalid
            ? "border-red-400 hover:bg-zinc-50"
            : "border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50",
      )}
    >
      {/*
        Transparent but full size, rather than visually hidden at 1x1: iOS
        zooms toward a focused element that is smaller than the tap area.
      */}
      <input
        type="radio"
        name={name}
        value={label}
        checked={selected}
        onChange={onSelect}
        className="absolute inset-0 m-0 size-full cursor-pointer touch-manipulation appearance-none rounded-xl opacity-0 outline-none"
      />
      <span
        aria-hidden
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition",
          selected ? "border-zinc-900" : "border-zinc-300",
        )}
      >
        {selected && <span className="size-2.5 rounded-full bg-zinc-900" />}
      </span>
      <span className="flex-1">{label}</span>
    </label>
  );
}

export function ProgressBar({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const percent = Math.round(((current + 1) / total) * 100);
  return (
    <div
      role="progressbar"
      aria-valuenow={current + 1}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={`Step ${current + 1} of ${total}`}
      className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200"
    >
      <div
        className="h-full rounded-full bg-zinc-900 transition-[width] duration-300 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export function ExampleBox({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
        Example specification
      </p>
      <p className="text-sm leading-relaxed text-zinc-700">{text}</p>
    </div>
  );
}

export const formatDate = (ms: number) =>
  new Date(ms).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
