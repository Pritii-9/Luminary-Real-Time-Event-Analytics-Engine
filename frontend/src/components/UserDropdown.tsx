import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, CreditCard, Settings, LogOut, CheckCircle } from "lucide-react";

interface UserDropdownProps {
  email: string;
  plan: string;
  limit: number;
  usage?: number;
  onManageBilling?: () => void;
  onAccountSettings?: () => void;
  onLogout?: () => void;
}

const formatNameFromEmail = (email: string): string => {
  if (!email) return "Pritii Jadhav";
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(`luminary_display_name_${email}`);
    if (stored) return stored;
  }
  const normalized = email.toLowerCase();
  if (normalized.startsWith("pritiijadhav") || normalized.startsWith("pritii")) {
    return "Pritii Jadhav";
  }
  if (normalized.startsWith("test-otp") || normalized.startsWith("test")) {
    return "Test Developer";
  }
  const prefix = email.split("@")[0];
  const clean = prefix.replace(/[0-9\-_.]+/g, " ").trim();
  return (
    clean
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ") || "Pritii Jadhav"
  );
};

export default function UserDropdown({
  email,
  plan,
  limit,
  usage = 0,
  onManageBilling,
  onAccountSettings,
  onLogout,
}: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleManageBilling = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen(false);
    if (onManageBilling) {
      onManageBilling();
    } else {
      try {
        const { createPortalSession } = await import("@/lib/api");
        const res = await createPortalSession();
        if (res?.portal_url) {
          window.location.href = res.portal_url;
        }
      } catch (err) {
        console.error("Billing portal error:", err);
      }
    }
  };

  const handleSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen(false);
    if (onAccountSettings) {
      onAccountSettings();
    }
  };

  const handleSignOut = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen(false);
    if (onLogout) {
      onLogout();
    } else {
      try {
        const { logout } = await import("@/lib/api");
        await logout();
      } catch (err) {
        console.error("Logout error:", err);
      } finally {
        navigate("/login");
      }
    }
  };

  const percentage = Math.min(100, Math.round((usage / limit) * 100)) || 0;
  const planDisplayName = plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : "Free";
  const userDisplayName = formatNameFromEmail(email);
  const initials = userDisplayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "PJ";

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button — Fully Theme-Aware */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className="flex items-center gap-2 rounded-lg border border-card-border bg-card hover:bg-card/80 px-2.5 py-1.5 text-xs font-medium text-foreground transition-all duration-150 cursor-pointer shadow-xs"
      >
        <div className="h-5 w-5 rounded-md bg-foreground text-background flex items-center justify-center text-[10px] font-bold shadow-xs">
          {initials}
        </div>
        <span className="max-w-[110px] truncate font-medium text-foreground">{userDisplayName}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Solid Theme-Aware Elevated Dropdown Menu */}
      {isOpen && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute right-0 mt-2 w-72 origin-top-right rounded-xl border border-card-border bg-card p-3 shadow-2xl shadow-black/10 dark:shadow-black/70 z-50 animate-fade-in"
        >
          {/* User Profile Header */}
          <div className="flex items-center gap-3 border-b border-card-border pb-3 mb-3">
            <div className="h-9 w-9 rounded-xl bg-foreground text-background flex items-center justify-center text-xs font-bold shadow-inner flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-xs text-foreground truncate">{userDisplayName}</p>
              <p className="text-[11px] text-muted truncate mt-0.5 font-mono">{email}</p>
            </div>
          </div>

          {/* Plan & Ingestion Usage */}
          <div className="rounded-lg border border-card-border bg-background/50 p-2.5 mb-3">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-xs font-semibold text-foreground">
                {planDisplayName} Plan
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-success bg-success/10 border border-success/20 rounded px-1.5 py-0.5">
                <CheckCircle className="h-2.5 w-2.5" /> Active
              </span>
            </div>

            <div className="flex items-end justify-between text-[10px] text-muted mb-1.5">
              <span>{usage.toLocaleString()} / {limit.toLocaleString()} views</span>
              <span className="font-semibold text-foreground">{percentage}%</span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-card-border rounded-full h-1 overflow-hidden">
              <div
                className="bg-success h-1 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(4, percentage)}%` }}
              />
            </div>
          </div>

          {/* Action Links */}
          <div className="space-y-1 border-b border-card-border pb-2 mb-2">
            <button
              type="button"
              onClick={handleSettings}
              className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground hover:bg-foreground/[0.06] transition-colors cursor-pointer text-left group"
            >
              <Settings className="h-3.5 w-3.5 text-muted group-hover:text-foreground transition-colors" />
              <span>Account & Profile Settings</span>
            </button>

            <button
              type="button"
              onClick={handleManageBilling}
              className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground hover:bg-foreground/[0.06] transition-colors cursor-pointer text-left group"
            >
              <CreditCard className="h-3.5 w-3.5 text-muted group-hover:text-foreground transition-colors" />
              <span>Manage Billing & Quota</span>
            </button>
          </div>

          {/* Sign Out */}
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-danger hover:bg-danger/10 transition-colors cursor-pointer text-left"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
