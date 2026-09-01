import { Suspense } from "react";
import type { Metadata } from "next";
import { QuoteForm } from "./QuoteForm";

export const metadata: Metadata = {
  title: "Request a Print Quote",
  description: "Complete your print specification and we will quote for it.",
};

export default async function QuoteFormPage({
  params,
}: PageProps<"/f/[token]">) {
  const { token } = await params;
  // QuoteForm reads prefill values from the query string via useSearchParams.
  return (
    <Suspense>
      <QuoteForm token={token} />
    </Suspense>
  );
}
