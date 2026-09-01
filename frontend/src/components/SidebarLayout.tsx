import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3, FileText, Globe, Zap, Code, MousePointer2,
  Megaphone, Download, ChevronLeft, ChevronRight, ArrowLeft,
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
  { key: "overview",  label: "Overview",        icon: BarChart3,     path: "" },
  { key: "pages",     label: "Pages",            icon: FileText,      path: "/pages" },
  { key: "sources",   label: "Sources",          icon: Globe,         path: "/sources" },
  { key: "campaigns", label: "Campaigns",        icon: Megaphone,     path: "/campaigns" },
  { key: "events",    label: "Events & Goals",   icon: Zap,           path: "/events" },
  { key: "replays",   label: "Session Replays",  icon: MousePointer2, path: "/replays" },
  { key: "snippet",   label: "Snippet",          icon: Code,          path: "/snippet" },
  { key: "export",    label: "Export",           icon: Download,      path: "/export" },
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
  const navigate = useNavigate();
  const { pathname } = useLocation();
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
      {/* ── SIDEBAR ─────────────────────────────────── */}
      <aside
        className={`flex flex-col border-r border-card-border bg-card/40 backdrop-blur-sm transition-all duration-200 ${
          collapsed ? "w-[60px]" : "w-[220px]"
        }`}
      >
        {/* Sidebar Header — Logo + site name + collapse toggle on the right */}
        <div className={`flex items-center border-b border-card-border min-h-[56px] ${collapsed ? "justify-between px-3 py-3" : "gap-3 px-4 py-3"}`}>
          <button
            onClick={() => navigate("/")}
            className="flex-shrink-0 cursor-pointer"
            title="Go to Luminary Home"
          >
            <Logo className="h-8 w-8 rounded-xl" />
          </button>

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-foreground truncate leading-tight">
                {siteName || siteId}
              </p>
              <p className="text-[11px] text-muted truncate leading-none mt-0.5">
                {siteDomain}
              </p>
            </div>
          )}

          {/* Collapse toggle — icon only, always visible in header */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex-shrink-0 h-6 w-6 rounded-md flex items-center justify-center text-muted hover:text-foreground hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = activeKey === item.key;
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => navigate(`${basePath}${item.path}`)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 cursor-pointer ${
                  isActive
                    ? "bg-foreground/[0.09] text-foreground"
                    : "text-muted hover:bg-white/[0.04] hover:text-foreground"
                } ${collapsed ? "justify-center px-0" : ""}`}
              >
                <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-foreground" : "text-muted"}`} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer — only All Sites back link */}
        <div className="border-t border-card-border px-2 py-2">
          <button
            onClick={() => navigate("/sites")}
            title="All Sites"
            className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] font-medium text-muted hover:bg-white/[0.04] hover:text-foreground transition-colors cursor-pointer ${collapsed ? "justify-center" : ""}`}
          >
            <ArrowLeft className="h-3.5 w-3.5 flex-shrink-0" />
            {!collapsed && <span>All Sites</span>}
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar — single, clean row: left=site breadcrumb, right=controls */}
        <header className="flex items-center justify-between px-6 border-b border-card-border min-h-[56px] bg-background/80 backdrop-blur-sm">
          {/* LEFT: Home ← / SiteName breadcrumb — no logo repeat */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate("/sites")}
              className="flex items-center gap-1.5 text-muted hover:text-foreground transition-colors cursor-pointer group"
            >
              <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-sm font-medium">Home</span>
            </button>
            <span className="text-muted/30 text-sm">/</span>
            <button
              onClick={() => navigate(basePath)}
              className="text-foreground font-semibold text-sm cursor-pointer hover:text-accent transition-colors truncate max-w-[200px]"
            >
              {siteName || siteId}
            </button>
          </div>

          {/* RIGHT: Theme toggle + user dropdown — always vertically centered */}
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
