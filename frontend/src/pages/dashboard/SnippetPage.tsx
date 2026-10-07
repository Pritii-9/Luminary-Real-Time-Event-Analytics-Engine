import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSnippet, getSite, getMe, logout, getToken, createPortalSession, type SiteData } from "@/lib/api";
import { ArrowLeft, Copy, Check, Code, ShieldCheck, Terminal, FileCode, Cpu } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import Toast from "@/components/Toast";
import UserDropdown from "@/components/UserDropdown";
import AccountSettingsModal from "@/components/AccountSettingsModal";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function SnippetPage() {
  const { siteId } = useParams();
  const navigate = useNavigate();
  const [site, setSite] = useState<SiteData | null>(null);
  const [snippet, setSnippet] = useState("");
  const [publicToken, setPublicToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [activeTab, setActiveTab] = useState<"html" | "react" | "events">("html");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // User details state
  const [userEmail, setUserEmail] = useState("");
  const [plan, setPlan] = useState("free");
  const [limit, setLimit] = useState(10000);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  const activeBackendUrl =
    import.meta.env.VITE_API_URL ||
    (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
      ? "https://luminary-scalable-web-event-engine.onrender.com"
      : "http://localhost:8000");

  const loadData = useCallback(async () => {
    try {
      const [siteData, snippetData, userData] = await Promise.all([
        getSite(siteId as string),
        getSnippet(siteId as string),
        getMe().catch(() => null),
      ]);
      setSite(siteData);
      const cleanSnippet = snippetData.snippet.replace(
        /src="[^"]*\/tracker\.js/,
        `src="${activeBackendUrl}/tracker.js"`
      );
      setSnippet(cleanSnippet);
      setPublicToken(snippetData.public_token);
      if (userData) {
        setUserEmail(userData.email);
        setPlan(userData.plan);
        setLimit(userData.monthly_pageview_limit);
      }
    } catch {
      navigate("/sites");
    } finally {
      setLoading(false);
    }
  }, [siteId, navigate, activeBackendUrl]);

  useEffect(() => {
    if (!getToken()) {
      navigate("/login");
      return;
    }
    loadData();
  }, [loadData, navigate]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setToast({ message: "Copied code snippet to clipboard", type: "success" });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const reactSnippet = `// Root Layout Component (app/layout.tsx or _app.tsx)
import Script from 'next/script';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script
          src="${activeBackendUrl}/tracker.js"
          data-site-id="${siteId}"
          strategy="afterInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}`;

  const customEventSnippet = `// Ingest conversion telemetry into Luminary event buffer
window.luminary?.track("order_completed", {
  order_id: "ord_9482",
  revenue_usd: 149.00,
  tier: "enterprise"
});`;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted">
        <div className="flex flex-col items-center gap-2">
          <div className="h-5 w-5 rounded-full border-2 border-foreground/30 border-t-foreground animate-spin" />
          <span className="text-xs font-mono">Loading telemetry configuration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-8 bg-background text-foreground transition-colors duration-200">
      <div className="mx-auto max-w-4xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-card-border">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/dashboard/${siteId}`)}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-card-border bg-card hover:bg-foreground/[0.04] text-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-foreground uppercase">
                SDK Telemetry Ingestion Setup
              </h1>
              <p className="text-xs text-muted font-mono">{site?.name} • {site?.domain}</p>
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

        {/* Public Ingestion Token Card */}
        <div className="flex items-center justify-between p-3.5 rounded-lg border border-card-border bg-card">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-semibold text-foreground">Client Public Ingestion Token</span>
            </div>
            <p className="text-[11px] text-muted font-mono mt-0.5">
              Publicly safe identifier scoped to domain CORS restrictions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <code className="px-2.5 py-1 rounded border border-card-border bg-background text-xs font-mono text-foreground font-semibold">
              {publicToken || siteId}
            </code>
            <button
              onClick={() => copyToClipboard(publicToken || siteId!, "token")}
              className="p-1.5 rounded border border-card-border bg-card hover:bg-foreground/[0.04] text-muted hover:text-foreground transition-colors cursor-pointer"
              title="Copy token"
            >
              {copiedKey === "token" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Integration Code Tabs */}
        <div className="rounded-lg border border-card-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-card-border bg-foreground/[0.01] px-3">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab("html")}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                  activeTab === "html"
                    ? "border-foreground text-foreground font-semibold"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                HTML Script Tag
              </button>
              <button
                onClick={() => setActiveTab("react")}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                  activeTab === "react"
                    ? "border-foreground text-foreground font-semibold"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                <FileCode className="h-3.5 w-3.5 text-purple-400" />
                Next.js / React
              </button>
              <button
                onClick={() => setActiveTab("events")}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                  activeTab === "events"
                    ? "border-foreground text-foreground font-semibold"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                <Cpu className="h-3.5 w-3.5 text-cyan-400" />
                Custom Goals API
              </button>
            </div>

            <button
              onClick={() => {
                const text =
                  activeTab === "html"
                    ? snippet
                    : activeTab === "react"
                    ? reactSnippet
                    : customEventSnippet;
                copyToClipboard(text, activeTab);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono border border-card-border bg-background text-muted hover:text-foreground hover:border-foreground/30 transition-colors cursor-pointer"
            >
              {copiedKey === activeTab ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              <span>{copiedKey === activeTab ? "Copied" : "Copy Code"}</span>
            </button>
          </div>

          {/* Terminal Code Viewer */}
          <div className="p-4 bg-[#0d0e11] text-[#e1e4e8] font-mono text-xs overflow-x-auto leading-relaxed">
            {activeTab === "html" && (
              <div>
                <div className="text-zinc-500 select-none">&lt;!-- Paste in website &lt;head&gt; --&gt;</div>
                <span className="text-purple-400">&lt;script</span>{" "}
                <span className="text-amber-300">defer</span>{" "}
                <span className="text-cyan-300">src</span>=
                <span className="text-emerald-300">"{activeBackendUrl}/tracker.js"</span>{" "}
                <span className="text-cyan-300">data-site-id</span>=
                <span className="text-emerald-300">"{siteId}"</span>
                <span className="text-purple-400">&gt;&lt;/script&gt;</span>
              </div>
            )}

            {activeTab === "react" && (
              <pre className="whitespace-pre text-zinc-300 font-mono text-xs select-all">
                {reactSnippet}
              </pre>
            )}

            {activeTab === "events" && (
              <pre className="whitespace-pre text-zinc-300 font-mono text-xs select-all">
                {customEventSnippet}
              </pre>
            )}
          </div>
        </div>

        {/* Security & Telemetry Specs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-4 rounded-lg border border-card-border bg-card space-y-2">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Passive Telemetry Ingested</h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted font-mono">
              <div>• Route URI Path</div>
              <div>• Screen Viewport</div>
              <div>• Referrer Domain</div>
              <div>• Browser / OS Agent</div>
              <div>• UTM Acquisition</div>
              <div>• SPA History Push</div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-card-border bg-card space-y-2">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Security & Privacy Protocol</h3>
            <div className="text-xs text-muted space-y-1.5 font-mono">
              <p>• Zero third-party tracking cookies or localStorage beacons</p>
              <p>• SHA-256 salted rotating IP hashing (GDPR compliant)</p>
              <p>• Edge heuristic WAF protection on all event streams</p>
            </div>
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
          navigate("/login");
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
