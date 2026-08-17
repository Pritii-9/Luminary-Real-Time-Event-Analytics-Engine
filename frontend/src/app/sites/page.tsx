"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listSites, createSite, getMe, logout, getToken, SiteData } from "@/lib/api";
import { Globe, Plus, LogOut, ExternalLink, BarChart3 } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import Toast from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import Logo from "@/components/Logo";

export default function SitesPage() {
  const router = useRouter();
  const [sites, setSites] = useState<SiteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");

  // Create site modal state
  const [showModal, setShowModal] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [siteDomain, setSiteDomain] = useState("");
  const [creating, setCreating] = useState(false);

  // Interaction feedback states
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    loadData();
  }, []);

  async function loadData() {
    try {
      const [user, siteList] = await Promise.all([getMe(), listSites()]);
      setUserEmail(user.email);
      setSites(siteList);
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const site = await createSite(siteName, siteDomain);
      setSites((prev) => [...prev, site]);
      setShowModal(false);
      setSiteName("");
      setSiteDomain("");
      setToast({ message: "Site added successfully!", type: "success" });
    } catch (err: any) {
      setToast({ message: err.message || "Failed to create site.", type: "error" });
    } finally {
      setCreating(false);
    }
  }

  async function triggerLogout() {
    setShowConfirmLogout(true);
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <span className="text-xs">Loading sites...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-8 bg-background text-foreground transition-colors duration-200">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <Logo className="h-9 w-9" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Your Sites</h1>
              <p className="text-sm text-muted">{userEmail}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-background hover:brightness-105 active:scale-[0.98] shadow-md shadow-accent/5 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add Site
            </button>
            <button
              onClick={triggerLogout}
              className="flex items-center justify-center h-9 w-9 rounded-xl border border-card-border bg-card/60 hover:bg-slate-100 dark:hover:bg-slate-800/40 text-muted hover:text-foreground transition-all duration-200 cursor-pointer"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Sites Grid */}
        {sites.length === 0 ? (
          <div className="animate-fade-in rounded-2xl border border-dashed border-card-border bg-card/20 p-16 text-center">
            <Globe className="mx-auto h-12 w-12 text-muted mb-4" />
            <h2 className="text-lg font-bold text-foreground mb-2">No sites yet</h2>
            <p className="text-sm text-muted mb-6">Add your first website to start tracking analytics.</p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-background hover:brightness-105 active:scale-[0.98] cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add Your First Site
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sites.map((site, i) => (
              <div
                key={site.id}
                className="group animate-fade-in rounded-2xl border border-card-border bg-card p-6 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/2 transition-all duration-200 cursor-pointer"
                style={{ animationDelay: `${i * 60}ms` }}
                onClick={() => router.push(`/dashboard/${site.site_id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                      <Globe className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground group-hover:text-accent transition-colors">{site.name}</h3>
                      <p className="text-xs text-muted">{site.domain}</p>
                    </div>
                  </div>
                  <BarChart3 className="h-4 w-4 text-muted group-hover:text-accent transition-colors" />
                </div>

                <div className="space-y-2 border-t border-border-subtle pt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">Site ID</span>
                    <span className="font-mono font-semibold text-foreground/80">{site.site_id}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">Created</span>
                    <span className="font-semibold text-foreground/80">{new Date(site.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/dashboard/${site.site_id}`);
                    }}
                    className="flex-1 rounded-xl bg-background/50 hover:bg-slate-100 dark:hover:bg-slate-800/40 border border-card-border px-3 py-2 text-xs font-bold text-foreground flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <BarChart3 className="h-3.5 w-3.5" /> Dashboard
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/dashboard/${site.site_id}/snippet`);
                    }}
                    className="flex-1 rounded-xl bg-background/50 hover:bg-slate-100 dark:hover:bg-slate-800/40 border border-card-border px-3 py-2 text-xs font-bold text-foreground flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Snippet
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Site Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md animate-fade-in rounded-2xl border border-card-border bg-modal-bg p-8 shadow-2xl transition-all duration-200">
              <h2 className="text-lg font-bold text-foreground mb-6">Add New Site</h2>
              <form onSubmit={handleCreate} className="space-y-5">
                <div>
                  <label htmlFor="modal-name" className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">
                    Site Name
                  </label>
                  <input
                    id="modal-name"
                    required
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    className="w-full rounded-xl border border-card-border bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/10"
                    placeholder="My Blog"
                  />
                </div>
                <div>
                  <label htmlFor="modal-domain" className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">
                    Domain
                  </label>
                  <input
                    id="modal-domain"
                    required
                    value={siteDomain}
                    onChange={(e) => setSiteDomain(e.target.value)}
                    className="w-full rounded-xl border border-card-border bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/10"
                    placeholder="myblog.com"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 rounded-xl border border-card-border bg-background/50 hover:bg-slate-100 dark:hover:bg-slate-800/40 px-4 py-2.5 text-sm font-bold text-foreground cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-background hover:brightness-105 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    {creating ? "Creating..." : "Create Site"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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
    </div>
  );
}
