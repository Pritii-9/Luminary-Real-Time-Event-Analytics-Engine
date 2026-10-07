import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  fetchSummary,
  fetchTimeseries,
  fetchPages,
  fetchReferrers,
  fetchDevices,
  fetchActiveUsers,
  fetchCustomEvents,
  fetchAnomalies,
  getToken,
  type AnomalyData,
} from "@/lib/api";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { Eye, Users, Activity, Globe, FileText, Zap, AlertTriangle, ShieldCheck, TrendingUp, TrendingDown, Download } from "lucide-react";
import ExportModal from "@/components/ExportModal";

const CHART_COLORS = ["#a1a1aa", "#71717a", "#52525b", "#3f3f46", "#27272a", "#d4d4d8", "#e4e4e7"];

export default function DashboardHome() {
  const {  siteId  } = useParams();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any>(null);
  const [timeseries, setTimeseries] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [referrers, setReferrers] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [customEvents, setCustomEvents] = useState<any[]>([]);
  const [anomaly, setAnomaly] = useState<AnomalyData | null>(null);
  const [activeVisitors, setActiveVisitors] = useState(0);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    if (!getToken()) { navigate("/login"); return; }
    loadData();

    // Silent background polling every 30s
    const pollInterval = setInterval(() => {
      silentLoadData();
    }, 30000);

    return () => clearInterval(pollInterval);
  }, [siteId as string, days]);

  useEffect(() => {
    if (!siteId) return;
    const interval = setInterval(async () => {
      try {
        const data = await fetchActiveUsers(siteId as string);
        setActiveVisitors(data.active_visitors);
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [siteId]);

  async function silentLoadData() {
    // Fire and forget individual queries to populate the UI progressively
    fetchSummary(siteId as string, days).then(d => d && setSummary(d)).catch(() => {});
    fetchTimeseries(siteId as string, days).then(d => d && setTimeseries(d)).catch(() => {});
    fetchPages(siteId as string, days).then(d => d && setPages(d)).catch(() => {});
    fetchReferrers(siteId as string, days).then(d => d && setReferrers(d)).catch(() => {});
    fetchDevices(siteId as string, days).then(d => d && setDevices(d)).catch(() => {});
    fetchCustomEvents(siteId as string, days).then(d => d && setCustomEvents(d)).catch(() => {});
    fetchAnomalies(siteId as string, days).then(d => d && setAnomaly(d)).catch(() => {});
    fetchActiveUsers(siteId as string).then(d => d && setActiveVisitors(d.active_visitors)).catch(() => {});
  }

  async function loadData() {
    setLoading(true);
    // Give the UI a tiny tick to paint the skeleton/loader
    await new Promise(r => setTimeout(r, 50));
    
    // Kick off progressive loading
    silentLoadData();
    
    // Immediately drop the hard-blocking full screen loader
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted">
        <div className="flex flex-col items-center gap-2">
          <div className="h-5 w-5 rounded-full border-2 border-zinc-700 border-t-transparent animate-spin" />
          <span className="text-xs">Loading analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl animate-fade-in space-y-5">
      {/* Days filter + Live badge — full-width bar, same baseline */}
      <div className="flex items-center justify-between">
        {/* Left: date range pills & Export button */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted font-medium hidden sm:block">Range:</span>
            <div className="flex rounded-md border border-card-border overflow-hidden">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    days === d
                      ? "bg-foreground text-background font-semibold"
                      : "text-muted hover:bg-foreground/5 hover:text-foreground"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-card-border bg-card hover:bg-foreground/[0.04] text-xs font-medium text-muted hover:text-foreground transition-colors cursor-pointer shadow-xs"
            title="Export CSV or JSON analytics telemetry"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>

        {/* Right: live visitors pill */}
        <div className="flex items-center gap-2 rounded-md border border-card-border bg-card px-3 py-1.5 shadow-xs">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success"></span>
          </span>
          <span className="text-xs font-medium text-foreground tabular-nums">{activeVisitors}</span>
          <span className="text-xs text-muted">live now</span>
        </div>
      </div>

      {/* AI Traffic Anomaly Alert Banner */}
      {anomaly && (
        <div
          className={`mb-6 p-4 rounded-xl border flex items-start justify-between gap-4 transition-all ${
            anomaly.status.startsWith("SPIKE")
              ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
              : anomaly.status === "DROP_OFF_WARNING"
              ? "bg-red-500/10 border-red-500/30 text-red-200"
              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
          }`}
        >
          <div className="flex items-start gap-3">
            {anomaly.status.startsWith("SPIKE") ? (
              <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            ) : anomaly.status === "DROP_OFF_WARNING" ? (
              <TrendingDown className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            )}

            <div>
              <div className="flex items-center gap-2 font-semibold text-xs">
                <span>AI Traffic Anomaly Status:</span>
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-black/20">
                  {anomaly.status.replace("_", " ")}
                </span>
                <span className="text-[11px] font-mono text-muted">
                  (Z-Score: {anomaly.z_score >= 0 ? `+${anomaly.z_score}` : anomaly.z_score})
                </span>
              </div>
              <p className="text-xs mt-1 text-muted-foreground">{anomaly.recommendation}</p>
            </div>
          </div>

          <div className="text-right flex-shrink-0 text-xs font-mono hidden sm:block">
            <p className="font-semibold">{anomaly.current_hourly_traffic} visits/hr</p>
            <p className="text-[10px] text-muted">Mean: {anomaly.mean_hourly_traffic}/hr ({anomaly.pct_deviation})</p>
          </div>
        </div>
      )}


      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Pageviews" value={summary?.pageviews || 0} icon={<Eye className="h-4 w-4" />} />
        <KpiCard title="Unique Visitors" value={summary?.visitors || 0} icon={<Users className="h-4 w-4" />} />
        <KpiCard title="Sessions" value={summary?.sessions || 0} icon={<Activity className="h-4 w-4" />} />
        <KpiCard title="Active Now" value={activeVisitors} icon={<Zap className="h-4 w-4" />} live />
      </div>

      {/* Charts */}
      <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Traffic Over Time */}
        <div className="rounded-lg border border-card-border bg-card p-5">
          <h2 className="mb-4 text-[10px] font-medium text-muted uppercase tracking-wider">Traffic Over Time</h2>
          <div className="h-60">
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
                    borderRadius: "6px",
                    fontSize: "11px",
                  }}
                />
                <Line type="monotone" dataKey="pageviews" stroke="var(--foreground)" strokeWidth={1.5} dot={{ r: 2.5, fill: "var(--foreground)" }} />
                <Line type="monotone" dataKey="visitors" stroke="var(--muted)" strokeWidth={1.5} dot={{ r: 2, fill: "var(--muted)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Device Breakdown */}
        <div className="rounded-lg border border-card-border bg-card p-5">
          <h2 className="mb-4 text-[10px] font-medium text-muted uppercase tracking-wider">Devices</h2>
          <div className="h-60 flex items-center justify-center">
            {devices.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={devices} dataKey="views" nameKey="device_type" cx="50%" cy="50%" outerRadius={85} innerRadius={52} paddingAngle={3}>
                    {devices.map((_: any, i: number) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="var(--card)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--card-border)",
                      color: "var(--foreground)",
                      borderRadius: "6px",
                      fontSize: "11px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted text-xs">No device data yet</p>
            )}
          </div>
          {devices.length > 0 && (
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              {devices.map((d: any, i: number) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-muted">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  {d.device_type}: {d.views}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Top Pages */}
        <div className="rounded-lg border border-card-border bg-card overflow-hidden">
          <div className="p-4 border-b border-card-border flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-muted" />
            <h2 className="text-[10px] font-medium text-muted uppercase tracking-wider">Top Pages</h2>
          </div>
          <div className="divide-y divide-border-subtle">
            {pages.map((page: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-foreground/[0.02] transition-colors">
                <span className="text-xs text-foreground font-mono truncate max-w-[250px]">{page.path}</span>
                <span className="text-xs font-medium text-muted tabular-nums">{page.views}</span>
              </div>
            ))}
            {pages.length === 0 && (
              <div className="px-4 py-8 text-center text-xs text-muted">No page data yet</div>
            )}
          </div>
        </div>

        {/* Traffic Sources */}
        <div className="rounded-lg border border-card-border bg-card overflow-hidden">
          <div className="p-4 border-b border-card-border flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 text-muted" />
            <h2 className="text-[10px] font-medium text-muted uppercase tracking-wider">Traffic Sources</h2>
          </div>
          <div className="divide-y divide-border-subtle">
            {referrers.map((ref: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-foreground/[0.02] transition-colors">
                <span className="text-xs text-foreground truncate max-w-[250px]">{ref.referrer}</span>
                <span className="text-xs font-medium text-muted tabular-nums">{ref.views}</span>
              </div>
            ))}
            {referrers.length === 0 && (
              <div className="px-4 py-8 text-center text-xs text-muted">No referrer data yet</div>
            )}
          </div>
        </div>

        {/* Custom Events */}
        <div className="rounded-lg border border-card-border bg-card overflow-hidden col-span-1 lg:col-span-2">
          <div className="p-4 border-b border-card-border flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-muted" />
            <h2 className="text-[10px] font-medium text-muted uppercase tracking-wider">Goals & Custom Events</h2>
          </div>
          <div className="divide-y divide-border-subtle">
            {customEvents.length > 0 && (
              <div className="grid grid-cols-12 gap-4 px-4 py-2.5 text-[10px] font-medium text-muted uppercase tracking-wider border-b border-border-subtle">
                <span className="col-span-6">Event Name</span>
                <span className="col-span-2 text-right">Triggers</span>
                <span className="col-span-2 text-right">Unique Users</span>
                <span className="col-span-2 text-right">Rate</span>
              </div>
            )}
            {customEvents.map((event: any, i: number) => {
              const convRate = summary?.visitors
                ? ((event.unique_visitors / summary.visitors) * 100).toFixed(1)
                : "0.0";
              return (
                <div key={i} className="grid grid-cols-12 gap-4 items-center px-4 py-3 hover:bg-foreground/[0.02] transition-colors">
                  <span className="col-span-6 text-xs font-medium text-foreground font-mono truncate">{event.event_name}</span>
                  <span className="col-span-2 text-xs text-muted text-right tabular-nums">{event.count.toLocaleString()}</span>
                  <span className="col-span-2 text-xs text-muted text-right tabular-nums">{event.unique_visitors.toLocaleString()}</span>
                  <span className="col-span-2 text-xs font-medium text-foreground text-right tabular-nums">{convRate}%</span>
                </div>
              );
            })}
            {customEvents.length === 0 && (
              <div className="px-4 py-8 text-center text-xs text-muted">
                No custom events yet. Use <code className="font-mono text-foreground bg-foreground/[0.05] border border-card-border px-1.5 py-0.5 rounded">window.luminary.track("event_name")</code> to track goals.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Export Telemetry Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        siteId={siteId!}
        defaultDays={days}
      />
    </div>
  );
}

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
    <div className="rounded-lg border border-card-border bg-card p-4 hover:bg-foreground/[0.02] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="rounded-md border border-card-border bg-foreground/[0.03] p-2 text-muted">
          {icon}
        </div>
        {live && (
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success"></span>
          </span>
        )}
      </div>
      <p className="text-xl font-semibold text-foreground tabular-nums">{value.toLocaleString()}</p>
      <p className="text-[10px] font-medium text-muted mt-0.5 uppercase tracking-wide">{title}</p>
    </div>
  );
}
