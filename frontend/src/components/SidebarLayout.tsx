"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  BarChart3, FileText, Globe, Zap, Code, MousePointer2,
  Megaphone, Download, ChevronLeft, ChevronRight,
} from "lucide-react";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import UserDropdown from "@/components/UserDropdown";

interface SidebarLayoutProps {
  siteId: string;
  siteName?: string;
  siteDomain?: string;
  userEmail: string;
  plan: string;
  limit: number;
  usage?: number;
  onManageBilling: () => void;
  onAccountSettings: () => void;
  onLogout: () => void;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { key: "overview", label: "Overview", icon: BarChart3, path: "" },
  { key: "pages", label: "Pages", icon: FileText, path: "/pages" },
  { key: "sources", label: "Sources", icon: Globe, path: "/sources" },
  { key: "campaigns", label: "Campaigns", icon: Megaphone, path: "/campaigns" },
  { key: "events", label: "Events & Goals", icon: Zap, path: "/events" },
  { key: "replays", label: "Session Replays", icon: MousePointer2, path: "/replays" },
  { key: "snippet", label: "Snippet", icon: Code, path: "/snippet" },
  { key: "export", label: "Export", icon: Download, path: "/export" },
];

export default function SidebarLayout({
  siteId,
  siteName,
  siteDomain,
  userEmail,
  plan,
  limit,
  usage = 0,
  onManageBilling,
  onAccountSettings,
  onLogout,
  children,
}: SidebarLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const basePath = `/dashboard/${siteId}`;

  const getActiveKey = () => {
    const sub = pathname.replace(basePath, "");
    const match = NAV_ITEMS.find((item) => item.path && sub.startsWith(item.path));
    return match?.key || "overview";
  };

  const activeKey = getActiveKey();

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-card-border bg-card/50 transition-all duration-200 ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-card-border min-h-[60px]">
          <button
            onClick={() => router.push("/sites")}
            className="flex-shrink-0 cursor-pointer"
            title="Back to sites"
          >
            <Logo className="h-8 w-8" />
          </button>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{siteName || siteId}</p>
              <p className="text-xs text-muted truncate">{siteDomain}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = activeKey === item.key;
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => router.push(`${basePath}${item.path}`)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? "bg-white/[0.08] text-foreground font-semibold"
                    : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
                } ${collapsed ? "justify-center px-0" : ""}`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-card-border px-3 py-3">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted hover:bg-white/[0.04] hover:text-foreground transition-colors cursor-pointer"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {!collapsed && <span>Collapse Sidebar</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-card-border min-h-[56px] bg-background">
          <div>
            <h1 className="text-sm font-semibold text-foreground">
              {NAV_ITEMS.find((n) => n.key === activeKey)?.label || "Overview"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserDropdown
              email={userEmail}
              plan={plan}
              limit={limit}
              usage={usage}
              onManageBilling={onManageBilling}
              onAccountSettings={onAccountSettings}
              onLogout={onLogout}
            />
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
