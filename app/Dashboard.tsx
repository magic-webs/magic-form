"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { DashboardPage } from "./DashboardPage";
import { CreateLinkPage } from "./CreateLinkPage";
import { SubmissionsPage } from "./SubmissionsPage";
import { LayoutDashboard, Link as LinkIcon, FileText } from "lucide-react";

export function Dashboard({
  sessionToken,
  onSignOut,
}: {
  sessionToken: string;
  onSignOut: () => void;
}) {
  const logout = useMutation(api.admin.logout);
  const [activePage, setActivePage] = useState<"dashboard" | "create" | "submissions">("dashboard");

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
        <header className="border-b border-border bg-background px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
              Printwell Quotes
            </h1>
            <Button
              variant="secondary"
              className="min-h-9 px-3 text-xs sm:min-h-10 sm:px-4 sm:text-sm"
              onClick={async () => {
                await logout({ sessionToken }).catch(() => {});
                onSignOut();
              }}
            >
              Sign out
            </Button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <Sidebar className="hidden sm:flex">
            <SidebarHeader className="border-b">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5 shrink-0" />
                <span className="truncate font-semibold">Printwell</span>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActivePage("dashboard")}
                        isActive={activePage === "dashboard"}
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Dashboard</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActivePage("create")}
                        isActive={activePage === "create"}
                      >
                        <LinkIcon className="h-4 w-4" />
                        <span>Create Link</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActivePage("submissions")}
                        isActive={activePage === "submissions"}
                      >
                        <FileText className="h-4 w-4" />
                        <span>Submissions</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>

          <div className="flex w-full flex-col sm:flex-1 sm:overflow-hidden">
            <main className="flex-1 overflow-auto pb-20 sm:pb-0">
              <div className="mx-auto w-full max-w-6xl px-3 py-6 sm:px-4 sm:py-8 md:px-6 md:py-10">
                {activePage === "dashboard" && (
                  <DashboardPage sessionToken={sessionToken} />
                )}
                {activePage === "create" && (
                  <CreateLinkPage sessionToken={sessionToken} />
                )}
                {activePage === "submissions" && (
                  <SubmissionsPage sessionToken={sessionToken} />
                )}
              </div>
            </main>

            {/* Mobile Bottom Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 flex h-16 items-center justify-around border-t border-border bg-background sm:hidden">
              <button
                onClick={() => setActivePage("dashboard")}
                className={`flex flex-1 flex-col items-center justify-center gap-1 transition-colors ${
                  activePage === "dashboard"
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutDashboard className="h-6 w-6" />
                <span className="text-xs font-medium">Dashboard</span>
              </button>
              <button
                onClick={() => setActivePage("create")}
                className={`flex flex-1 flex-col items-center justify-center gap-1 transition-colors ${
                  activePage === "create"
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LinkIcon className="h-6 w-6" />
                <span className="text-xs font-medium">Create</span>
              </button>
              <button
                onClick={() => setActivePage("submissions")}
                className={`flex flex-1 flex-col items-center justify-center gap-1 transition-colors ${
                  activePage === "submissions"
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText className="h-6 w-6" />
                <span className="text-xs font-medium">Subs</span>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
