import { useEffect, useState, Suspense, useMemo } from "react";
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  listSites,
  createSite,
  deleteSite,
  getMe,
  logout,
  getToken, type SiteData,
  createCheckoutSession,
  createPortalSession,
  fetchSummary,
  apiFetch,
} from "@/lib/api";
import CustomSelect from "@/components/CustomSelect";
import {
  Globe,
  Plus,
  ExternalLink,
  BarChart3,
  Code,
  Search,
  MoreVertical,
  Copy,
  Check,
  Trash2,
  Star,
  Zap,
  Settings,
  Activity,
  Edit3,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import Toast from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import Logo from "@/components/Logo";
import UserDropdown from "@/components/UserDropdown";
import AccountSettingsModal from "@/components/AccountSettingsModal";

export default function Sites() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background text-muted">
          <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      }
    >
      <SitesPageContent />
    </Suspense>
  );
}

function SitesPageContent() {
  const navigate = useNavigate();
  const [sites, setSites] = useState<SiteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [plan, setPlan] = useState("free");
  const [limit, setLimit] = useState(10000);
  const [sitePageviews, setSitePageviews] = useState<Record<string, number>>({});

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "date">("date");

  // Site Creation Modal
  const [showModal, setShowModal] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [siteDomain, setSiteDomain] = useState("");
  const [creating, setCreating] = useState(false);

  // Modals & Options
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [activeMenuSiteId, setActiveMenuSiteId] = useState<string | null>(null);
  const [copiedSiteId, setCopiedSiteId] = useState<string | null>(null);
  const [pinnedSites, setPinnedSites] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("luminary_pinned") || "[]")); }
    catch { return new Set(); }
  });
  const [healthCheck, setHealthCheck] = useState<Record<string, "idle" | "checking" | "ok" | "fail">>({});

  // Edit Domain
  const [editDomainSite, setEditDomainSite] = useState<SiteData | null>(null);
  const [editDomainValue, setEditDomainValue] = useState("");
  const [savingDomain, setSavingDomain] = useState(false);

  // Delete site state
  const [siteToDelete, setSiteToDelete] = useState<SiteData | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  async function handleDeleteSite() {
    if (!siteToDelete) return;
    setDeleting(true);
    try {
      await deleteSite(siteToDelete.site_id);
      setSites((prev) => prev.filter((s) => s.site_id !== siteToDelete.site_id));
      setToast({ message: `Site "${siteToDelete.name}" deleted.`, type: "success" });
      setSiteToDelete(null);
    } catch (err: any) {
      setToast({ message: err.message || "Failed to delete site.", type: "error" });
    } finally {
      setDeleting(false);
    }
  }

  const [searchParams] = useSearchParams();

  useEffect(() => {
    loadData();

    // Silent background polling every 30s
    const pollInterval = setInterval(() => {
      silentLoadData();
    }, 30000);

    return () => clearInterval(pollInterval);
  }, []);

  useEffect(() => {
    const upgrade = searchParams.get("upgrade");
    const portal = searchParams.get("portal");
    if (upgrade === "success") {
      setToast({ message: `Upgraded to ${searchParams.get("plan")}. Welcome aboard.`, type: "success" });
      loadData();
      navigate("/sites");
    } else if (upgrade === "cancel") {
      setToast({ message: "Upgrade cancelled.", type: "error" });
      navigate("/sites");
    } else if (portal === "mock") {
      setToast({ message: "Billing portal simulated.", type: "success" });
      navigate("/sites");
    }
  }, [searchParams]);

  async function silentLoadData() {
    try {
      const [user, siteList] = await Promise.all([getMe(), listSites()]);
      setUserEmail(user.email);
      setPlan(user.plan);
      setLimit(user.monthly_pageview_limit);
      setSites(siteList);

      // Fetch actual pageview counts for each site
      const pageviewMap: Record<string, number> = {};
      await Promise.all(
        siteList.map(async (site) => {
          try {
            const summary = await fetchSummary(site.site_id, 30);
            pageviewMap[site.site_id] = summary?.pageviews || 0;
          } catch {
            pageviewMap[site.site_id] = 0;
          }
        })
      );
      setSitePageviews(pageviewMap);
    } catch {
      // Don't redirect to login on silent poll failure to prevent aggressive logouts on flaky connections
    }
  }

  async function loadData() {
    setLoading(true);
    try {
      await silentLoadData();
    } catch {
      navigate("/login");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgrade(selectedPlan: string) {
    setUpgrading(selectedPlan);
    try {
      const res = await createCheckoutSession(selectedPlan);
      window.location.href = res.checkout_url;
    } catch (err: any) {
      setToast({ message: err.message || "Failed to initiate upgrade.", type: "error" });
      setUpgrading(null);
    }
  }

  async function handleManageBilling() {
    try {
      const res = await createPortalSession();
      window.location.href = res.portal_url;
    } catch (err: any) {
      setToast({ message: err.message || "Failed to open billing portal.", type: "error" });
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (siteName.trim().length < 3) {
      setToast({ message: "Site name must be at least 3 characters.", type: "error" });
      return;
    }
    const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(siteDomain.trim())) {
      setToast({ message: "Please enter a valid domain (e.g., example.com)", type: "error" });
      return;
    }
    setCreating(true);
    try {
      const site = await createSite(siteName.trim(), siteDomain.trim().toLowerCase());
      setSites((prev) => [...prev, site]);
      setShowModal(false);
      setSiteName("");
      setSiteDomain("");
      setToast({ message: "Site created successfully.", type: "success" });
    } catch (err: any) {
      setToast({ message: err.message || "Failed to create site.", type: "error" });
    } finally {
      setCreating(false);
    }
  }

  const handleCopySiteId = (e: React.MouseEvent, siteIdStr: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(siteIdStr);
    setCopiedSiteId(siteIdStr);
    setToast({ message: "Site ID copied to clipboard", type: "success" });
    setTimeout(() => setCopiedSiteId(null), 2000);
    setActiveMenuSiteId(null);
  };

  const togglePin = (e: React.MouseEvent, siteId: string) => {
    e.stopPropagation();
    setPinnedSites(prev => {
      const next = new Set(prev);
      if (next.has(siteId)) { next.delete(siteId); } else { next.add(siteId); }
      localStorage.setItem("luminary_pinned", JSON.stringify([...next]));
      return next;
    });
  };

  const runHealthCheck = async (e: React.MouseEvent, site: SiteData) => {
    e.stopPropagation();
    setHealthCheck(prev => ({ ...prev, [site.site_id]: "checking" }));
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/collect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_token: site.public_token, event_type: "health_check", url: `https://${site.domain}`, path: "/health" }),
      });
      setHealthCheck(prev => ({ ...prev, [site.site_id]: res.ok ? "ok" : "fail" }));
      setToast({ message: res.ok ? `Health check passed for ${site.name}` : `Health check failed for ${site.name}`, type: res.ok ? "success" : "error" });
    } catch {
      setHealthCheck(prev => ({ ...prev, [site.site_id]: "fail" }));
      setToast({ message: "Health check failed — server unreachable", type: "error" });
    }
    setTimeout(() => setHealthCheck(prev => ({ ...prev, [site.site_id]: "idle" })), 4000);
  };

  // Filter & Sort sites (pinned first)
  const filteredSites = useMemo(() => {
    return sites
      .filter((s) => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        return (
          s.name.toLowerCase().includes(query) ||
          s.domain.toLowerCase().includes(query) ||
          s.site_id.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        const aPinned = pinnedSites.has(a.site_id) ? -1 : 1;
        const bPinned = pinnedSites.has(b.site_id) ? -1 : 1;
        if (aPinned !== bPinned) return aPinned - bPinned;
        if (sortBy === "name") return a.name.localeCompare(b.name);
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [sites, searchQuery, sortBy, pinnedSites]);

  const totalPageviews = Object.values(sitePageviews).reduce((a, c) => a + c, 0);

  async function handleSaveDomain(e: React.FormEvent) {
    e.preventDefault();
    if (!editDomainSite) return;
    
    const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(editDomainValue.trim())) {
      setToast({ message: "Please enter a valid domain (e.g., example.com)", type: "error" });
      return;
    }

    setSavingDomain(true);
    try {
      const cleanedDomain = editDomainValue.trim().toLowerCase();
      await apiFetch(`/api/v1/sites/${editDomainSite.site_id}`, {
        method: "PATCH",
        body: JSON.stringify({ domain: cleanedDomain }),
      });
      setSites((prev) => prev.map((s) =>
        s.site_id === editDomainSite.site_id ? { ...s, domain: cleanedDomain } : s
      ));
      setToast({ message: "Domain updated successfully.", type: "success" });
      setEditDomainSite(null);
    } catch (err: any) {
      setToast({ message: err.message || "Failed to update domain.", type: "error" });
    } finally {
      setSavingDomain(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted">
        <div className="flex flex-col items-center gap-2">
          <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <span className="text-xs">Loading sites...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-200">
      {/* 1. TOP NAVIGATION / HEADER (Sticky, Glassmorphic, Theme-Aware) */}
      <header className="sticky top-0 z-40 h-16 w-full border-b border-card-border bg-background/80 backdrop-blur-md px-4 md:px-8 flex items-center justify-between">
        {/* Left: Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5 group cursor-pointer"
          >
            <Logo className="h-8 w-8 rounded-xl" />
            <span className="text-foreground font-bold text-[15px] tracking-tight group-hover:text-accent transition-colors">Luminary</span>
          </button>
          <span className="text-muted/40 text-base">/</span>
          <span className="text-muted font-medium text-sm">Overview</span>
        </div>

        {/* Right: Actions Group */}
        <div className="flex items-center gap-2.5">
          {plan === "free" && (
            <button
              type="button"
              onClick={() => setShowUpgradeModal(true)}
              className="flex items-center h-8 rounded-md border border-card-border bg-card px-3 text-xs font-medium text-muted hover:text-foreground hover:bg-white/5 cursor-pointer transition-colors"
            >
              Upgrade
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 h-8 rounded-md bg-foreground px-3 text-xs font-semibold text-background hover:opacity-90 active:scale-[0.98] cursor-pointer transition-all shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Site</span>
          </button>

          <div className="h-4 w-[1px] bg-card-border mx-0.5" />

          <ThemeToggle />

          <UserDropdown
            email={userEmail}
            plan={plan}
            limit={limit}
            usage={Object.values(sitePageviews).reduce((acc, curr) => acc + curr, 0)}
            onManageBilling={handleManageBilling}
            onAccountSettings={() => setShowAccountSettings(true)}
            onLogout={() => setShowConfirmLogout(true)}
          />
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-8">
        {/* 2. GLOBAL STATS BANNER */}
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Sites", value: sites.length, icon: <Globe className="h-4 w-4 text-muted" /> },
            { label: "Total Pageviews (30d)", value: totalPageviews.toLocaleString(), icon: <Activity className="h-4 w-4 text-muted" /> },
            { label: "Pinned Sites", value: pinnedSites.size, icon: <Star className="h-4 w-4 text-muted" /> },
            { label: "Plan", value: plan.charAt(0).toUpperCase() + plan.slice(1), icon: <Zap className="h-4 w-4 text-muted" /> },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-card-border bg-card p-5 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-background border border-card-border flex items-center justify-center shrink-0">
                {stat.icon}
              </div>
              <div>
                <div className="text-xl font-bold text-foreground tabular-nums">{stat.value}</div>
                <div className="text-[10px] text-muted">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Monthly quota usage bar */}
        {limit > 0 && (
          <div className="mb-6 rounded-xl border border-card-border bg-card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-foreground">Monthly Pageview Quota</span>
              <span className="text-xs text-muted tabular-nums">
                {totalPageviews.toLocaleString()} / {limit.toLocaleString()}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-background overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  totalPageviews / limit > 0.9
                    ? "bg-danger"
                    : totalPageviews / limit > 0.7
                    ? "bg-amber-500"
                    : "bg-success"
                }`}
                style={{ width: `${Math.min((totalPageviews / limit) * 100, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-muted mt-1.5">
              {((totalPageviews / limit) * 100).toFixed(1)}% used ·{" "}
              {Math.max(limit - totalPageviews, 0).toLocaleString()} remaining
            </p>
          </div>
        )}

        {/* 3. PAGE HEADER & TOOLBAR */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Your Sites</h1>
            <p className="text-xs text-muted mt-1">
              Monitor website performance, pageviews, and real-time user sessions.
            </p>
          </div>

          {/* Search & Sorting Bar */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Filter sites..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 rounded-md border border-card-border bg-card px-3 pl-9 text-xs text-foreground placeholder:text-muted/70 focus:border-accent focus:outline-none transition-colors"
              />
            </div>

            {/* Sort Menu */}
            <CustomSelect
              value={sortBy}
              onChange={(val) => setSortBy(val as "name" | "date")}
              options={[
                { label: "Sort by Date", value: "date" },
                { label: "Sort by Name", value: "value" },
              ]}
            />
          </div>
        </div>

        {/* 3. SITE CARDS GRID & ALIGNMENT */}
        {filteredSites.length === 0 ? (
          <div className="rounded-xl border border-dashed border-card-border bg-card/30 p-12 text-center my-8">
            <Globe className="mx-auto h-10 w-10 text-muted mb-3" />
            <h3 className="text-sm font-semibold text-foreground mb-1">
              {searchQuery ? "No sites match your filter" : "No sites added yet"}
            </h3>
            <p className="text-xs text-muted mb-5 max-w-sm mx-auto">
              {searchQuery
                ? `No properties found matching "${searchQuery}". Try clearing your search.`
                : "Create your first site tracking property to generate tracking code and view analytics."}
            </p>
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery("")}
                className="inline-flex items-center h-8 rounded-md border border-card-border bg-card px-3 text-xs font-medium text-foreground hover:bg-white/5 cursor-pointer transition-colors"
              >
                Clear Filter
              </button>
            ) : (
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-1.5 h-8 rounded-md bg-foreground px-3.5 text-xs font-semibold text-background hover:opacity-90 cursor-pointer transition-all shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" /> Add Your First Site
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSites.map((site) => (
              <div
                key={site.id}
                onClick={() => navigate(`/dashboard/${site.site_id}`)}
                className="group relative rounded-xl border border-card-border bg-card p-5 hover:border-accent/40 hover:bg-white/[0.02] transition-all cursor-pointer flex flex-col justify-between"
              >
                {/* CARD TOP SECTION */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Icon */}
                      <div className="h-9 w-9 rounded-lg bg-background border border-card-border flex items-center justify-center shrink-0 group-hover:border-accent/40 transition-colors">
                        <Globe className="h-4.5 w-4.5 text-muted group-hover:text-foreground transition-colors" />
                      </div>

                      {/* Title & External Link */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {pinnedSites.has(site.site_id) && (
                            <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />
                          )}
                          <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-accent transition-colors">
                            {site.name}
                          </h3>
                        </div>
                        <a
                          href={`https://${site.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors truncate mt-0.5"
                        >
                          <span className="truncate">{site.domain}</span>
                          <ExternalLink className="h-3 w-3 shrink-0 text-muted" />
                        </a>
                      </div>
                    </div>

                    {/* Right: Pin + Menu */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => togglePin(e, site.site_id)}
                        title={pinnedSites.has(site.site_id) ? "Unpin site" : "Pin site"}
                        className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                          pinnedSites.has(site.site_id)
                            ? "text-amber-400 hover:text-amber-300"
                            : "text-muted hover:text-foreground hover:bg-white/5"
                        }`}
                      >
                        <Star className={`h-3.5 w-3.5 ${pinnedSites.has(site.site_id) ? "fill-amber-400" : ""}`} />
                      </button>

                      {/* Context Action Menu */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuSiteId(activeMenuSiteId === site.site_id ? null : site.site_id);
                          }}
                          className="h-7 w-7 rounded-md flex items-center justify-center text-muted hover:text-foreground hover:bg-white/5 cursor-pointer transition-colors"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {activeMenuSiteId === site.site_id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 mt-1 w-48 rounded-lg border border-card-border bg-card p-1 shadow-xl z-30 animate-fade-in text-xs"
                          >
                            <button
                              type="button"
                              onClick={(e) => handleCopySiteId(e, site.site_id)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-foreground hover:bg-white/5 text-left transition-colors"
                            >
                              {copiedSiteId === site.site_id ? (
                                <Check className="h-3.5 w-3.5 text-success" />
                              ) : (
                                <Copy className="h-3.5 w-3.5 text-muted" />
                              )}
                              <span>Copy Site ID</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => { setActiveMenuSiteId(null); navigate(`/dashboard/${site.site_id}/snippet`); }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-foreground hover:bg-white/5 text-left transition-colors"
                            >
                              <Code className="h-3.5 w-3.5 text-muted" />
                              <span>View Snippet</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => { setActiveMenuSiteId(null); navigate(`/dashboard/${site.site_id}`); }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-foreground hover:bg-white/5 text-left transition-colors"
                            >
                              <BarChart3 className="h-3.5 w-3.5 text-muted" />
                              <span>Open Dashboard</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuSiteId(null);
                                setEditDomainSite(site);
                                setEditDomainValue(site.domain);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-foreground hover:bg-white/5 text-left transition-colors"
                            >
                              <Edit3 className="h-3.5 w-3.5 text-muted" />
                              <span>Edit Domain</span>
                            </button>

                            <div className="my-1 border-t border-border-subtle" />

                            <button
                              type="button"
                              onClick={() => { setActiveMenuSiteId(null); setSiteToDelete(site); }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-danger hover:bg-danger/10 text-left transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-danger" />
                              <span>Delete Site</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CARD MIDDLE SECTION: MINI METRICS BAR */}
                  <div className="my-4 rounded-lg border border-border-subtle bg-background/50 p-3 grid grid-cols-3 gap-2 text-center">
                    {/* Live indicator */}
                    <div className="flex flex-col items-center justify-center">
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                        </span>
                        <span className="text-xs font-bold text-foreground">Active</span>
                      </div>
                      <span className="text-[10px] text-muted mt-0.5">Real-time</span>
                    </div>

                    {/* Views */}
                    <div className="flex flex-col items-center justify-center border-x border-border-subtle">
                      <span className="text-xs font-semibold text-foreground">
                        {(sitePageviews[site.site_id] || 0).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-muted mt-0.5">Pageviews</span>
                    </div>

                    {/* Created Date */}
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-xs font-medium text-foreground">
                        {new Date(site.created_at).toLocaleDateString("en-US", {
                          month: "numeric",
                          day: "numeric",
                          year: "2-digit",
                        })}
                      </span>
                      <span className="text-[10px] text-muted mt-0.5">Created</span>
                    </div>
                  </div>
                </div>

                {/* CARD BOTTOM SECTION */}
                <div className="pt-3 border-t border-border-subtle flex items-center justify-between gap-2 mt-1">
                  {/* Site ID */}
                  <div
                    onClick={(e) => handleCopySiteId(e, site.site_id)}
                    className="font-mono text-xs text-muted hover:text-foreground transition-colors truncate max-w-[120px] cursor-pointer"
                    title="Click to copy Site ID"
                  >
                    {site.site_id}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    {/* Health Check */}
                    <button
                      type="button"
                      onClick={(e) => runHealthCheck(e, site)}
                      title="Run health check"
                      className={`inline-flex items-center gap-1 h-9 rounded-md border px-2.5 text-xs font-medium transition-colors cursor-pointer ${
                        healthCheck[site.site_id] === "ok"
                          ? "border-success/40 bg-success/10 text-success"
                          : healthCheck[site.site_id] === "fail"
                          ? "border-danger/40 bg-danger/10 text-danger"
                          : "border-card-border bg-card text-muted hover:text-foreground hover:bg-white/5"
                      }`}
                    >
                      <Zap className={`h-3 w-3 ${healthCheck[site.site_id] === "checking" ? "animate-pulse" : ""}`} />
                    </button>

                    {/* Snippet */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/${site.site_id}/snippet`); }}
                      className="inline-flex items-center gap-1.5 h-9 rounded-md border border-card-border bg-card px-3 text-xs font-medium text-muted hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <Code className="h-3.5 w-3.5" />
                      <span>Snippet</span>
                    </button>

                    {/* Dashboard */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/${site.site_id}`); }}
                      className="inline-flex items-center gap-1.5 h-9 rounded-md border border-card-border bg-card px-3 text-xs font-medium text-foreground hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <BarChart3 className="h-3.5 w-3.5 text-muted" />
                      <span>Dashboard</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MODAL: EDIT DOMAIN */}
        {editDomainSite && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
            <div className="w-full max-w-sm rounded-xl border border-card-border bg-card p-6 shadow-2xl">
              <h2 className="text-base font-semibold text-foreground mb-1">Edit Domain</h2>
              <p className="text-xs text-muted mb-4">
                Update the tracked domain for <span className="text-foreground font-medium">{editDomainSite.name}</span>.
              </p>
              <form onSubmit={handleSaveDomain} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-medium text-muted mb-1.5 uppercase tracking-wider">Domain Name</label>
                  <input
                    required
                    value={editDomainValue}
                    onChange={(e) => setEditDomainValue(e.target.value)}
                    className="w-full h-9 rounded-md border border-card-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                    placeholder="e.g. acme.com"
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditDomainSite(null)}
                    className="flex-1 h-9 rounded-md border border-card-border bg-transparent text-xs font-medium text-foreground hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingDomain}
                    className="flex-1 h-9 rounded-md bg-foreground text-xs font-semibold text-background hover:opacity-90 disabled:opacity-40 cursor-pointer transition-opacity"
                  >
                    {savingDomain ? "Saving..." : "Save Domain"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ADD NEW SITE */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
            <div className="w-full max-w-md rounded-xl border border-card-border bg-card p-6 shadow-2xl">
              <h2 className="text-base font-semibold text-foreground mb-1">Add New Site Property</h2>
              <p className="text-xs text-muted mb-5">
                Enter your website details to generate a dedicated tracking ID.
              </p>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label htmlFor="modal-name" className="block text-[11px] font-medium text-muted mb-1.5 uppercase tracking-wider">
                    Site Name
                  </label>
                  <input
                    id="modal-name"
                    required
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    className="w-full h-9 rounded-md border border-card-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                    placeholder="e.g. Acme SaaS Application"
                  />
                </div>

                <div>
                  <label htmlFor="modal-domain" className="block text-[11px] font-medium text-muted mb-1.5 uppercase tracking-wider">
                    Domain Name
                  </label>
                  <input
                    id="modal-domain"
                    required
                    value={siteDomain}
                    onChange={(e) => setSiteDomain(e.target.value)}
                    className="w-full h-9 rounded-md border border-card-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                    placeholder="e.g. acme.com"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 h-9 rounded-md border border-card-border bg-transparent text-xs font-medium text-foreground hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 h-9 rounded-md bg-foreground text-xs font-semibold text-background hover:opacity-90 disabled:opacity-40 cursor-pointer transition-opacity"
                  >
                    {creating ? "Creating..." : "Create Site"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: UPGRADE PLAN */}
        {showUpgradeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
            <div className="w-full max-w-2xl rounded-xl border border-card-border bg-card p-6 shadow-2xl">
              <h2 className="text-lg font-semibold text-foreground text-center mb-1">Upgrade Luminary Tier</h2>
              <p className="text-xs text-muted text-center mb-6">Choose a plan that fits your application traffic.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Pro Tier */}
                <div className="rounded-xl border border-card-border bg-background p-5 flex flex-col justify-between hover:border-accent/40 transition-colors">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">Pro</h3>
                      <span className="text-[10px] font-medium text-success border border-success/20 bg-success/10 px-2 py-0.5 rounded-full">
                        Popular
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-1">For growing web applications</p>

                    <div className="my-4">
                      <span className="text-2xl font-bold text-foreground">₹499</span>
                      <span className="text-xs text-muted"> / month</span>
                    </div>

                    <ul className="space-y-2 text-xs text-muted mb-6">
                      <li className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-success" />
                        <span>100,000 monthly pageviews</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-success" />
                        <span>Custom event & goal tracking</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-success" />
                        <span>Real-time session telemetry</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    disabled={upgrading !== null}
                    onClick={() => handleUpgrade("pro")}
                    className="w-full h-9 rounded-md bg-foreground text-xs font-semibold text-background hover:opacity-90 disabled:opacity-40 cursor-pointer transition-opacity"
                  >
                    {upgrading === "pro" ? "Processing..." : "Upgrade to Pro"}
                  </button>
                </div>

                {/* Enterprise Tier */}
                <div className="rounded-xl border border-card-border bg-background p-5 flex flex-col justify-between hover:border-accent/40 transition-colors">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Enterprise</h3>
                    <p className="text-xs text-muted mt-1">For high volume & critical SLA</p>

                    <div className="my-4">
                      <span className="text-2xl font-bold text-foreground">₹999</span>
                      <span className="text-xs text-muted"> / month</span>
                    </div>

                    <ul className="space-y-2 text-xs text-muted mb-6">
                      <li className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-success" />
                        <span>1,000,000 monthly pageviews</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-success" />
                        <span>Priority ClickHouse aggregation</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-success" />
                        <span>Unlimited team members</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    disabled={upgrading !== null}
                    onClick={() => handleUpgrade("enterprise")}
                    className="w-full h-9 rounded-md bg-foreground text-xs font-semibold text-background hover:opacity-90 disabled:opacity-40 cursor-pointer transition-opacity"
                  >
                    {upgrading === "enterprise" ? "Processing..." : "Upgrade to Enterprise"}
                  </button>
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="h-8 rounded-md border border-card-border bg-transparent px-4 text-xs font-medium text-muted hover:text-foreground cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <AccountSettingsModal
          isOpen={showAccountSettings}
          onClose={() => setShowAccountSettings(false)}
          email={userEmail}
          plan={plan}
          limit={limit}
          onManageBilling={handleManageBilling}
        />

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

        <ConfirmDialog
          isOpen={siteToDelete !== null}
          title="Delete Site Property"
          message={`Are you sure you want to delete "${siteToDelete?.name}" (${siteToDelete?.domain})? All tracking telemetry and configuration for this site will be permanently removed.`}
          confirmLabel={deleting ? "Deleting..." : "Delete Site"}
          cancelLabel="Cancel"
          onConfirm={handleDeleteSite}
          onCancel={() => setSiteToDelete(null)}
        />

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </main>
    </div>
  );
}
