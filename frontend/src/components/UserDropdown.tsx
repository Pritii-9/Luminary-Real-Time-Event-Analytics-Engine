"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, User, CreditCard, Settings, LogOut } from "lucide-react";

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
  if (!email) return "User";
  const normalized = email.toLowerCase();
  if (normalized.startsWith("pritiijadhav") || normalized.startsWith("pritii")) {
    return "Pritii Jadhav";
  }
  if (normalized.startsWith("test-otp") || normalized.startsWith("test")) {
    return "Test Developer";
  }
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
        router.push("/login");
      }
    }
  };

  const percentage = Math.min(100, Math.round((usage / limit) * 100)) || 0;
  const planDisplayName = plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : "Free";
  const userDisplayName = formatNameFromEmail(email);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className="flex items-center gap-2 rounded-md border border-card-border bg-transparent px-3 py-1.5 text-sm font-medium text-foreground hover:bg-white/5 transition-colors cursor-pointer"
      >
        <div className="h-5 w-5 rounded-md bg-white/5 border border-white/10 flex items-center justify-center">
          <User className="h-3 w-3 text-muted" />
        </div>
        <span className="max-w-[100px] truncate text-xs text-zinc-400">{userDisplayName}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted transition-transform duration-150 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute right-0 mt-2 w-64 origin-top-right rounded-lg border border-card-border bg-card p-3 animate-fade-in z-50"
        >
          {/* Header */}
          <div className="border-b border-border-subtle pb-3 mb-3">
            <p className="font-medium text-sm text-foreground truncate">{userDisplayName}</p>
            <p className="text-xs text-muted truncate mt-0.5">{email}</p>
          </div>

          {/* Plan & Usage */}
          <div className="rounded-md border border-card-border bg-white/[0.02] p-3 mb-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-medium text-foreground">
                {planDisplayName} Plan
              </span>
              <span className="text-[10px] font-medium text-success border border-success/20 rounded px-1.5 py-0.5">
                Active
              </span>
            </div>

            <div className="flex items-end justify-between text-[10px] text-muted mb-1.5">
              <span>{usage.toLocaleString()} / {limit.toLocaleString()} views</span>
              <span>{percentage}%</span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
              <div
                className="bg-zinc-400 h-1 rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-0.5 border-b border-border-subtle pb-2.5 mb-2.5">
            <button
              type="button"
              onClick={handleManageBilling}
              className="w-full flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:bg-white/5 hover:text-foreground transition-colors cursor-pointer text-left"
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>Manage Billing</span>
            </button>

            <button
              type="button"
              onClick={handleSettings}
              className="w-full flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:bg-white/5 hover:text-foreground transition-colors cursor-pointer text-left"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Account Settings</span>
            </button>
          </div>

          {/* Sign Out */}
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-danger hover:bg-danger/5 transition-colors cursor-pointer text-left"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      )}

    </div>
  );
}
