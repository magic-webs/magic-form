"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api";
import { Button, Card, controlClass } from "@/components/ui";

function messageFor(error: unknown): string {
  if (error instanceof ConvexError) {
    const data = error.data as { message?: string };
    return data?.message ?? "Sign in failed.";
  }
  return "Could not reach the server. Please try again.";
}

export function AdminLogin({
  onSignedIn,
  expired,
}: {
  onSignedIn: (token: string) => void;
  expired: boolean;
}) {
  const login = useMutation(api.admin.login);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!password) {
      setError("Enter the admin password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { token } = await login({ password });
      setPassword("");
      onSignedIn(token);
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col justify-center px-4 py-12 sm:px-6 sm:py-20">
      <Card>
        <h1 className="text-2xl font-semibold tracking-tight">Admin sign in</h1>
        <p className="mt-1.5 mb-6 text-zinc-600">
          {expired
            ? "Your session has expired. Please sign in again."
            : "Enter the admin password to issue links and view submissions."}
        </p>

        <form onSubmit={handleSubmit}>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-semibold text-zinc-800"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError(null);
            }}
            aria-invalid={Boolean(error)}
            className={controlClass(Boolean(error))}
          />
          {error && (
            <p role="alert" className="mt-2 text-sm font-medium text-red-600">
              {error}
            </p>
          )}

          <Button type="submit" disabled={busy} className="mt-5 w-full">
            {busy ? "Checking…" : "Sign in"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
