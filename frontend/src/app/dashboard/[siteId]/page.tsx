"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  fetchSummary,
  fetchTimeseries,
  fetchPages,
  fetchReferrers,
  fetchDevices,
  fetchActiveUsers,
  fetchCustomEvents,
  getSite,
  getMe,
  logout,
  getToken,
  createPortalSession,
  SiteData,
} from "@/lib/api";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Eye, Users, Activity, Globe, FileText, ArrowLeft, Zap,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import UserDropdown from "@/components/UserDropdown";
import AccountSettingsModal from "@/components/AccountSettingsModal";
import ConfirmDialog from "@/components/ConfirmDialog";

const CHIC_COLORS = ["#10b981", "#059669", "#047857", "#065f46", "#64748b", "#475569", "#334155"];

export default function DashboardPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const router = useRouter();
  const [site, setSite] = useState<SiteData | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [timeseries, setTimeseries] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [referrers, setReferrers] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [customEvents, setCustomEvents] = useState<any[]>([]);
  const [activeVisitors, setActiveVisitors] = useState(0);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

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
  }, [siteId, days]);

  // Real-time polling every 5 seconds
  useEffect(() => {
    if (!siteId) return;
    const interval = setInterval(async () => {
      try {
        const data = await fetchActiveUsers(siteId);
        setActiveVisitors(data.active_visitors);
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [siteId]);

  async function loadData() {
    setLoading(true);
    try {
      const [siteData, sumData, tsData, pgData, refData, devData, activeData, customData, userData] =
        await Promise.all([
          getSite(siteId).catch(() => null),
          fetchSummary(siteId, days).catch(() => null),
          fetchTimeseries(siteId, days).catch(() => []),
          fetchPages(siteId, days).catch(() => []),
          fetchReferrers(siteId, days).catch(() => []),
          fetchDevices(siteId, days).catch(() => []),
          fetchActiveUsers(siteId).catch(() => null),
          fetchCustomEvents(siteId, days).catch(() => []),
          getMe().catch(() => null),
        ]);

      if (siteData) setSite(siteData);
      if (sumData) setSummary(sumData);
      if (tsData) setTimeseries(tsData);
      if (pgData) setPages(pgData);
      if (refData) setReferrers(refData);
      if (devData) setDevices(devData);
      if (customData) setCustomEvents(customData);
      if (userData) {
        setUserEmail(userData.email);
        setPlan(userData.plan);
        setLimit(userData.monthly_pageview_limit);
      }
      setActiveVisitors(activeData?.active_visitors || 0);
    } catch (err) {
      console.error("Dashboard load error", err);
    } finally {
      setLoading(false);
    }
  }


  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <span className="text-xs">Loading analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 bg-background text-foreground transition-colors duration-200">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="relative z-30 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/sites")}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-card-border bg-card/60 hover:bg-slate-100 dark:hover:bg-slate-800/40 text-muted hover:text-foreground transition-all duration-200 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{site?.name || siteId}</h1>
              <p className="text-sm text-muted">{site?.domain} · Last {days} days</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Days filter */}
            <div className="flex rounded-xl border border-card-border bg-card/50 overflow-hidden p-0.5">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                    days === d
                      ? "bg-accent text-background shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>

            {/* Real-time badge */}
            <div className="flex items-center gap-2 rounded-xl border border-accent/20 bg-accent/10 px-3 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
              </span>
              <span className="text-xs font-bold text-accent">{activeVisitors} live</span>
            </div>

            <ThemeToggle />
            <UserDropdown
              email={userEmail}
              plan={plan}
              limit={limit}
              usage={summary?.pageviews || 0}
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

        {/* KPI Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in" style={{ animationDelay: "100ms" }}>
          <KpiCard title="Pageviews" value={summary?.pageviews || 0} icon={<Eye className="h-4.5 w-4.5" />} />
          <KpiCard title="Unique Visitors" value={summary?.visitors || 0} icon={<Users className="h-4.5 w-4.5" />} />
          <KpiCard title="Sessions" value={summary?.sessions || 0} icon={<Activity className="h-4.5 w-4.5" />} />
          <KpiCard title="Active Now" value={activeVisitors} icon={<Zap className="h-4.5 w-4.5" />} live />
        </div>

        {/* Charts */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Traffic Over Time */}
          <div className="animate-fade-in rounded-2xl border border-card-border bg-card p-6 shadow-md" style={{ animationDelay: "200ms" }}>
            <h2 className="mb-4 text-xs font-bold text-muted uppercase tracking-wider">Traffic Over Time</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeseries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="event_date" stroke="var(--muted)" tick={{ fontSize: 10, fill: "var(--muted)" }} />
                  <YAxis stroke="var(--muted)" tick={{ fontSize: 10, fill: "var(--muted)" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--card-border)",
                      color: "var(--foreground)",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Line type="monotone" dataKey="pageviews" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--accent)" }} />
                  <Line type="monotone" dataKey="visitors" stroke="var(--muted)" strokeWidth={2} dot={{ r: 3, fill: "var(--muted)" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Device Breakdown */}
          <div className="animate-fade-in rounded-2xl border border-card-border bg-card p-6 shadow-md" style={{ animationDelay: "250ms" }}>
            <h2 className="mb-4 text-xs font-bold text-muted uppercase tracking-wider">Devices</h2>
            <div className="h-64 flex items-center justify-center">
              {devices.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={devices} dataKey="views" nameKey="device_type" cx="50%" cy="50%" outerRadius={90} innerRadius={55} paddingAngle={4}>
                      {devices.map((_, i) => (
                        <Cell key={i} fill={CHIC_COLORS[i % CHIC_COLORS.length]} stroke="var(--card)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--card-border)",
                        color: "var(--foreground)",
                        borderRadius: "12px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted text-sm font-semibold">No device data yet</p>
              )}
            </div>
            {devices.length > 0 && (
              <div className="mt-2 flex flex-wrap justify-center gap-3">
                {devices.map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-muted font-semibold">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHIC_COLORS[i % CHIC_COLORS.length] }} />
                    {d.device_type}: {d.views}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tables */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Top Pages */}
          <div className="animate-fade-in rounded-2xl border border-card-border bg-card overflow-hidden shadow-md" style={{ animationDelay: "300ms" }}>
            <div className="p-5 border-b border-card-border flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted" />
              <h2 className="text-xs font-bold text-muted uppercase tracking-wider">Top Pages</h2>
            </div>
            <div className="divide-y divide-border-subtle">
              {pages.map((page, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3.5 hover:bg-background/40 transition-colors">
                  <span className="text-sm text-foreground/90 font-mono truncate max-w-[250px]">{page.path}</span>
                  <span className="text-sm font-bold text-muted tabular-nums">{page.views}</span>
                </div>
              ))}
              {pages.length === 0 && (
                <div className="px-5 py-8 text-center text-sm text-muted">No page data yet</div>
              )}
            </div>
          </div>

          {/* Top Referrers */}
          <div className="animate-fade-in rounded-2xl border border-card-border bg-card overflow-hidden shadow-md" style={{ animationDelay: "350ms" }}>
            <div className="p-5 border-b border-card-border flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted" />
              <h2 className="text-xs font-bold text-muted uppercase tracking-wider">Traffic Sources</h2>
            </div>
            <div className="divide-y divide-border-subtle">
              {referrers.map((ref, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3.5 hover:bg-background/40 transition-colors">
                  <span className="text-sm text-foreground/90 truncate max-w-[250px]">{ref.referrer}</span>
                  <span className="text-sm font-bold text-muted tabular-nums">{ref.views}</span>
                </div>
              ))}
              {referrers.length === 0 && (
                <div className="px-5 py-8 text-center text-sm text-muted">No referrer data yet</div>
              )}
            </div>
          </div>

          {/* Custom Events / Goals */}
          <div className="animate-fade-in rounded-2xl border border-card-border bg-card overflow-hidden shadow-md col-span-1 lg:col-span-2" style={{ animationDelay: "400ms" }}>
            <div className="p-5 border-b border-card-border flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent" />
              <h2 className="text-xs font-bold text-muted uppercase tracking-wider">Conversion Goals & Custom Events</h2>
            </div>
            <div className="divide-y divide-border-subtle">
              {customEvents.length > 0 ? (
                <div className="grid grid-cols-12 gap-4 px-5 py-3 text-xs font-bold text-muted uppercase tracking-wider bg-background/20">
                  <span className="col-span-6">Goal / Event Name</span>
                  <span className="col-span-2 text-right">Triggers</span>
                  <span className="col-span-2 text-right">Unique Users</span>
                  <span className="col-span-2 text-right">Conversion Rate</span>
                </div>
              ) : null}
              {customEvents.map((event, i) => {
                const convRate = summary?.visitors
                  ? ((event.unique_visitors / summary.visitors) * 100).toFixed(1)
                  : "0.0";
                return (
                  <div key={i} className="grid grid-cols-12 gap-4 items-center px-5 py-3.5 hover:bg-background/40 transition-colors">
                    <span className="col-span-6 text-sm font-bold text-foreground/90 font-mono truncate">{event.event_name}</span>
                    <span className="col-span-2 text-sm font-semibold text-muted text-right tabular-nums">{event.count.toLocaleString()}</span>
                    <span className="col-span-2 text-sm font-semibold text-muted text-right tabular-nums">{event.unique_visitors.toLocaleString()}</span>
                    <span className="col-span-2 text-sm font-bold text-accent text-right tabular-nums">{convRate}%</span>
                  </div>
                );
              })}
              {customEvents.length === 0 && (
                <div className="px-5 py-8 text-center text-sm text-muted">
                  No custom events recorded yet. Use <code className="font-mono text-accent bg-accent/5 px-1.5 py-0.5 rounded">window.luminary.track("event_name")</code> in your code to track conversion goals.
                </div>
              )}
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
          router.push("/login");
        }}
        onCancel={() => setShowConfirmLogout(false)}
      />
    </div>
  );
}

// KPI Card Component
function KpiCard({
  title,
  value,
  icon,
  live,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  live?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-card-border bg-card p-5 hover:border-accent/40 shadow-sm transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className="rounded-xl border border-card-border bg-background/50 p-2.5 text-accent">
          {icon}
        </div>
        {live && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground tabular-nums">{value.toLocaleString()}</p>
      <p className="text-[10px] font-bold text-muted mt-0.5 uppercase tracking-wide">{title}</p>
    </div>
  );
}
