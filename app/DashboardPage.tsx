"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Link2,
  CheckCircle2,
  TrendingUp,
  Clock,
  AlertCircle,
} from "lucide-react";

export function DashboardPage({
  sessionToken,
}: {
  sessionToken: string;
}) {
  const links = useQuery(api.quotes.listLinks, { sessionToken });
  const quotes = useQuery(api.quotes.listQuotes, { sessionToken });

  const stats = [
    {
      title: "Total Links",
      value: links?.length ?? 0,
      icon: Link2,
      color: "bg-blue-50 text-blue-700",
      iconColor: "text-blue-600",
      description: "Active quote links",
    },
    {
      title: "Submissions",
      value: quotes?.length ?? 0,
      icon: CheckCircle2,
      color: "bg-emerald-50 text-emerald-700",
      iconColor: "text-emerald-600",
      description: "Received specifications",
    },
    {
      title: "Pending",
      value: links?.filter((l) => l.submissionCount === 0).length ?? 0,
      icon: Clock,
      color: "bg-amber-50 text-amber-700",
      iconColor: "text-amber-600",
      description: "Awaiting response",
    },
    {
      title: "Failed Webhooks",
      value: quotes?.filter((q) => q.webhookStatus === "failed").length ?? 0,
      icon: AlertCircle,
      color: "bg-red-50 text-red-700",
      iconColor: "text-red-600",
      description: "Need attention",
    },
  ];

  const recentSubmissions = quotes?.slice(0, 5).reverse() ?? [];
  const recentLinks = links?.slice(0, 5).reverse() ?? [];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:mt-2 sm:text-sm">
          Welcome back. Here's an overview of your quote requests.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="p-3 sm:p-6">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground sm:text-sm">
                    {stat.title}
                  </p>
                  <p className="mt-1 text-2xl font-bold sm:mt-2 sm:text-3xl">{stat.value}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1 sm:mt-1 sm:line-clamp-none">
                    {stat.description}
                  </p>
                </div>
                <div className={`shrink-0 rounded-lg p-1.5 sm:p-2 ${stat.color}`}>
                  <Icon className={`h-4 w-4 sm:h-6 sm:w-6 ${stat.iconColor}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 sm:gap-6 md:gap-8 grid-cols-1 md:grid-cols-2">
        {/* Recent Links */}
        <Card className="p-4 sm:p-6">
          <h2 className="mb-3 text-base font-semibold sm:mb-4 sm:text-lg">Recent Links</h2>
          <div className="space-y-3">
            {recentLinks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No links yet</p>
            ) : (
              recentLinks.map((link) => (
                <div
                  key={link._id}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {link.customerName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {link.productType || "Customer chooses"}
                    </p>
                  </div>
                  <Badge
                    variant={
                      link.submissionCount > 0 ? "default" : "secondary"
                    }
                    className="ml-2 shrink-0"
                  >
                    {link.submissionCount > 0
                      ? `${link.submissionCount} received`
                      : "Awaiting"}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent Submissions */}
        <Card className="p-4 sm:p-6">
          <h2 className="mb-3 text-base font-semibold sm:mb-4 sm:text-lg">Recent Submissions</h2>
          <div className="space-y-3">
            {recentSubmissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No submissions yet
              </p>
            ) : (
              recentSubmissions.map((quote) => (
                <div
                  key={quote._id}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {quote.customerName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {quote.productType}
                    </p>
                  </div>
                  {quote.webhookStatus === "failed" && (
                    <Badge variant="destructive" className="ml-2 shrink-0">
                      Failed
                    </Badge>
                  )}
                  {quote.webhookStatus === "pending" && (
                    <Badge variant="outline" className="ml-2 shrink-0">
                      Pending
                    </Badge>
                  )}
                  {quote.webhookStatus === "sent" && (
                    <Badge className="ml-2 shrink-0">Sent</Badge>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-dashed p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Get Started</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a new link or view all submissions
            </p>
          </div>
          <TrendingUp className="h-8 w-8 text-muted-foreground" />
        </div>
      </Card>
    </div>
  );
}
