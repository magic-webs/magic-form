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
        <header className="border-b border-border bg-background px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight">Printwell Quotes</h1>
            <Button
              variant="secondary"
              className="min-h-10 px-4 text-sm"
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
          <Sidebar>
            <SidebarHeader>Navigation</SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Navigation</SidebarGroupLabel>
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

          <main className="flex-1 overflow-auto">
            <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
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
        </div>
      </div>
    </SidebarProvider>
  );
}
