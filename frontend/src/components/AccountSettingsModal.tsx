import { useState, useEffect } from "react";
import { User, CreditCard, CheckCircle2, X, Key, Copy, Check, Save } from "lucide-react";

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  plan: string;
  limit: number;
  onManageBilling?: () => void;
  siteId?: string;
}

export default function AccountSettingsModal({
  isOpen,
  onClose,
  email,
  plan,
  limit,
  onManageBilling,
  siteId,
}: AccountSettingsModalProps) {
  const [displayName, setDisplayName] = useState("Pritii Jadhav");
  const [copiedToken, setCopiedToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (email) {
      const storedName = localStorage.getItem(`luminary_display_name_${email}`);
      if (storedName) {
        setDisplayName(storedName);
      } else if (email.toLowerCase().includes("priti")) {
        setDisplayName("Pritii Jadhav");
      } else {
        const prefix = email.split("@")[0].replace(/[0-9\-_.]+/g, " ").trim();
        const formatted = prefix
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        setDisplayName(formatted || "Developer");
      }
    }
  }, [email, isOpen]);

  if (!isOpen) return null;

  const planDisplayName = plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : "Free";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "PJ";

  const handleSave = () => {
    setSaving(true);
    if (email) {
      localStorage.setItem(`luminary_display_name_${email}`, displayName);
    }
    setTimeout(() => {
      setSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }, 400);
  };

  const handleCopyToken = () => {
    const dummyToken = siteId || `lmn_${Math.random().toString(36).substring(2, 14)}`;
    navigator.clipboard.writeText(dummyToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-card-border bg-card p-6 shadow-2xl shadow-black/20 dark:shadow-black/90 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted hover:bg-foreground/5 hover:text-foreground transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="h-11 w-11 rounded-xl bg-foreground text-background flex items-center justify-center text-sm font-bold shadow-xs">
            {initials}
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Account & Profile Settings</h2>
            <p className="text-xs text-muted">Manage your identity, security credentials, and workspace tier</p>
          </div>
        </div>

        {/* Feedback Alert */}
        {saveSuccess && (
          <div className="mb-4 p-3 rounded-lg border border-success/30 bg-success/10 text-xs text-success flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <span>Profile settings saved successfully!</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Identity Section */}
          <div className="rounded-xl border border-card-border bg-background/50 p-4">
            <h3 className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3.5 flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted" />
              Profile Details
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-lg border border-card-border bg-card px-3 py-2 text-xs text-foreground placeholder-muted focus:border-foreground/50 focus:outline-none transition-colors"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-foreground">Email Address</label>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-success bg-success/10 border border-success/20 px-1.5 py-0.5 rounded">
                    <CheckCircle2 className="h-2.5 w-2.5" /> Verified
                  </span>
                </div>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full rounded-lg border border-card-border bg-card/40 px-3 py-2 text-xs text-muted cursor-not-allowed font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Workspace Role</label>
                <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-card-border bg-card/60 text-xs text-foreground">
                  <span>Workspace Owner & Lead Engineer</span>
                  <span className="text-[10px] text-muted font-mono">Full Access</span>
                </div>
              </div>
            </div>
          </div>

          {/* Security & Credentials */}
          <div className="rounded-xl border border-card-border bg-background/50 p-4">
            <h3 className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <Key className="h-3.5 w-3.5 text-muted" />
              API & Telemetry Token
            </h3>
            <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-card-border bg-card">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-muted truncate font-mono">
                  {siteId ? `site_${siteId}` : `lmn_pub_live_${email.split("@")[0].slice(0, 8)}...`}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyToken}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-card-border bg-background hover:bg-foreground/5 text-xs text-foreground transition-colors cursor-pointer flex-shrink-0"
              >
                {copiedToken ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                <span>{copiedToken ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          {/* Subscription Section */}
          <div className="rounded-xl border border-card-border bg-background/50 p-4">
            <h3 className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <CreditCard className="h-3.5 w-3.5 text-muted" />
              Subscription & Quota
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground text-sm">{planDisplayName} Tier</p>
                <p className="text-xs text-muted mt-0.5">
                  {limit.toLocaleString()} monthly ingestion events &bull; Active
                </p>
              </div>
              {onManageBilling && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onManageBilling();
                  }}
                  className="rounded-lg border border-card-border bg-card hover:bg-card/80 px-3 py-1.5 text-xs font-medium text-foreground cursor-pointer transition-colors shadow-xs"
                >
                  Manage Billing
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-card-border">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-2 text-xs font-medium text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-xs font-semibold text-background hover:opacity-90 cursor-pointer transition-opacity disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{saving ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
