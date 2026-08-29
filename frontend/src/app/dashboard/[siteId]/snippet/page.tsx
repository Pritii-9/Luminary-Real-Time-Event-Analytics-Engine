"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { getSnippet, getSite, getMe, logout, getToken, createPortalSession, SiteData } from "@/lib/api";
import { ArrowLeft, Copy, Code } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import Toast from "@/components/Toast";
import UserDropdown from "@/components/UserDropdown";
import AccountSettingsModal from "@/components/AccountSettingsModal";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function SnippetPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const router = useRouter();
  const [site, setSite] = useState<SiteData | null>(null);
  const [snippet, setSnippet] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // User details state
  const [userEmail, setUserEmail] = useState("");
  const [plan, setPlan] = useState("free");
  const [limit, setLimit] = useState(10000);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    loadData();
  }, [siteId]);

  async function loadData() {
    try {
      const [siteData, snippetData, userData] = await Promise.all([
        getSite(siteId),
        getSnippet(siteId),
        getMe().catch(() => null),
      ]);
      setSite(siteData);
      const activeBackendUrl =
        process.env.NEXT_PUBLIC_API_URL ||
        (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
          ? "https://luminary-scalable-web-event-engine.onrender.com"
          : "http://localhost:8000");

      const cleanSnippet = snippetData.snippet.replace(/src="[^"]*\/tracker\.js/, `src="${activeBackendUrl}/tracker.js`);
      setSnippet(cleanSnippet);
      if (userData) {
        setUserEmail(userData.email);
        setPlan(userData.plan);
        setLimit(userData.monthly_pageview_limit);
      }
    } catch {
      router.push("/sites");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(snippet);
    setToast({ message: "Tracking snippet copied to clipboard!", type: "success" });
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <span className="text-xs">Loading snippet...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-8 bg-background text-foreground transition-colors duration-200">
      <div className="mx-auto max-w-3xl animate-fade-in">
        {/* Header */}
        <div className="relative z-30 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/dashboard/${siteId}`)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-card-border bg-card/60 hover:bg-slate-100 dark:hover:bg-slate-800/40 text-muted hover:text-foreground transition-all duration-200 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Tracking Snippet</h1>
              <p className="text-sm text-muted">{site?.name} · {site?.domain}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <UserDropdown
              email={userEmail}
              plan={plan}
              limit={limit}
              onManageBilling={async () => {
                try {
                  const res = await createPortalSession();
                  if (res?.portal_url) window.location.href = res.portal_url;
                } catch (err) {
                  console.error("Portal error", err);
                }
              }}
              onAccountSettings={() => setShowAccountSettings(true)}
              onLogout={() => setShowConfirmLogout(true)}
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-6 rounded-2xl border border-card-border bg-card p-6 shadow-md transition-all duration-200">
          <div className="flex items-center gap-2 mb-4">
            <Code className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-bold text-foreground">Installation</h2>
          </div>
          <p className="text-sm text-muted mb-4">
            Copy the snippet below and paste it into the <code className="text-accent bg-background border border-card-border px-1.5 py-0.5 rounded text-xs">&lt;head&gt;</code> section of your website. 
            The tracker will automatically begin capturing pageviews, including SPA route changes.
          </p>

          {/* Snippet Code Block */}
          <div className="relative rounded-xl border border-card-border bg-background/50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-card-border bg-card/10">
              <span className="text-xs text-muted font-mono font-bold">HTML</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-lg bg-card border border-card-border hover:bg-slate-100 dark:hover:bg-slate-800/40 px-3 py-1 text-xs font-bold text-foreground transition-all duration-200 cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy Snippet
              </button>
            </div>
            <pre className="p-4 text-sm font-mono text-accent overflow-x-auto leading-relaxed whitespace-pre-wrap select-all">
              {snippet}
            </pre>
          </div>
        </div>

        {/* What it tracks */}
        <div className="rounded-2xl border border-card-border bg-card p-6 shadow-md transition-all duration-200">
          <h2 className="text-lg font-bold text-foreground mb-4">What gets tracked</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {[
              "Page URL & path",
              "Referrer source",
              "Screen resolution",
              "Browser language",
              "Timezone",
              "UTM parameters",
              "SPA route changes",
              "Visitor & session IDs",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-muted">
                <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                {item}
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-accent/10 border border-accent/20 px-4 py-3">
            <p className="text-xs text-accent font-semibold">
              🔒 Privacy-first: No cookies, no raw IP storage, no fingerprinting. Only anonymized data is collected.
            </p>
          </div>
        </div>
      </div>

      {/* Account Settings Modal */}
      <AccountSettingsModal
        isOpen={showAccountSettings}
        onClose={() => setShowAccountSettings(false)}
        email={userEmail}
        plan={plan}
        limit={limit}
        onManageBilling={async () => {
          try {
            const res = await createPortalSession();
            if (res?.portal_url) window.location.href = res.portal_url;
          } catch (err) {
            console.error("Portal error", err);
          }
        }}
      />

      {/* Confirm Logout Dialog */}
      <ConfirmDialog
        isOpen={showConfirmLogout}
        title="Sign Out"
        message="Are you sure you want to sign out of your Luminary Analytics workspace?"
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
        onConfirm={async () => {
          setShowConfirmLogout(false);
          await logout();
          router.push("/login");
        }}
        onCancel={() => setShowConfirmLogout(false)}
      />

      {/* Dynamic Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
