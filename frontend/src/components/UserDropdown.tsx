"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, User, CreditCard, Settings, LogOut, Sparkles } from "lucide-react";

interface UserDropdownProps {
  email: string;
  plan: string;
  limit: number;
  usage?: number; // Optional current monthly pageview usage
  onManageBilling?: () => void;
  onAccountSettings?: () => void;
  onLogout?: () => void;
}

const formatNameFromEmail = (email: string): string => {
  if (!email) return "User";
  const normalized = email.toLowerCase();
  if (normalized.startsWith("pritiijadhav") || normalized.startsWith("pritii")) {
    return "Pritii Jadhav";
  }
  if (normalized.startsWith("test-otp") || normalized.startsWith("test")) {
    return "Test Developer";
  }
  
  // Dynamic fallback: capitalize name components from the email prefix
  const prefix = email.split("@")[0];
  const clean = prefix.replace(/[0-9\-_.]+/g, " ").trim();
  return clean
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || "User";
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
  const router = useRouter();

  // Close the dropdown when clicking outside
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

  // Action Handlers
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
        router.push("/login");
      }
    }
  };

  const percentage = Math.min(100, Math.round((usage / limit) * 100)) || 0;
  const planDisplayName = plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : "Free";
  const userDisplayName = formatNameFromEmail(email);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className="flex items-center gap-2 rounded-xl bg-card border border-card-border hover:border-accent/40 px-3.5 py-2 text-sm font-semibold text-foreground transition-all duration-200 shadow-sm hover:bg-card/90 active:scale-[0.98] cursor-pointer"
      >
        <div className="h-6 w-6 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
          <User className="h-3.5 w-3.5 text-accent" />
        </div>
        <span className="max-w-[120px] truncate text-xs text-foreground font-semibold">{userDisplayName}</span>
        <ChevronDown
          className={`h-4 w-4 text-muted transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute right-0 mt-2.5 w-72 origin-top-right rounded-2xl border border-card-border bg-modal-bg p-4 shadow-2xl animate-fade-in z-50"
        >
          {/* Header section */}
          <div className="border-b border-border-subtle pb-3.5 mb-3.5">
            <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Account</p>
            <p className="font-bold text-sm text-foreground truncate mt-1">{userDisplayName}</p>
            <p className="text-xs text-muted truncate mt-0.5">{email}</p>
          </div>

          {/* Subscription plan details & usage progress bar */}
          <div className="rounded-xl border border-card-border bg-card/60 p-3.5 mb-3.5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                {planDisplayName} Plan
              </span>
              <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-md px-1.5 py-0.5">
                Active
              </span>
            </div>
            
            <div className="flex items-end justify-between text-[10px] text-muted mb-1.5 font-semibold">
              <span>{usage.toLocaleString()} / {limit.toLocaleString()} views</span>
              <span>{percentage}%</span>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-accent h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Action List items */}
          <div className="space-y-1 border-b border-border-subtle pb-3 mb-3">
            <button
              type="button"
              onClick={handleManageBilling}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold text-foreground hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-accent transition-colors cursor-pointer text-left"
            >
              <CreditCard className="h-4 w-4 text-muted" />
              <span>Manage Billing</span>
            </button>
            
            <button
              type="button"
              onClick={handleSettings}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold text-foreground hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-accent transition-colors cursor-pointer text-left"
            >
              <Settings className="h-4 w-4 text-muted" />
              <span>Account Settings</span>
            </button>
          </div>

          {/* Separated Sign Out button */}
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold text-danger hover:bg-danger/10 transition-colors cursor-pointer text-left"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      )}

    </div>
  );
}
