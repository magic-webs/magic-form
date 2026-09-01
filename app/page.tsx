"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui";
import { useAdminSession } from "@/lib/useAdminSession";
import { AdminLogin } from "./AdminLogin";
import { Dashboard } from "./Dashboard";

function Loading() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-20 sm:px-6">
      <Card>
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-1/2 rounded bg-zinc-200" />
          <div className="h-12 rounded-xl bg-zinc-100" />
        </div>
      </Card>
    </main>
  );
}

/**
 * The whole dashboard sits behind the admin password: issuing links, reading
 * submissions and deleting are all gated, on the server as well as here.
 */
export default function AdminPage() {
  const { token, signIn, signOut } = useAdminSession();
  const signedIn = useQuery(
    api.admin.checkSession,
    token === undefined ? "skip" : { sessionToken: token ?? undefined },
  );

  // `undefined` token means localStorage has not been read yet (server render).
  if (token === undefined || signedIn === undefined) return <Loading />;

  if (!signedIn) {
    return <AdminLogin onSignedIn={signIn} expired={token !== null} />;
  }

  return <Dashboard sessionToken={token as string} onSignOut={signOut} />;
}
