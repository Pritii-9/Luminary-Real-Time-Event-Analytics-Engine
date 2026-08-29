import { useEffect, useState, use } from "react";
import { useNavigate, useParams } from 'react-router-dom';
import {
  fetchSummary,
  fetchTimeseries,
  fetchPages,
  fetchReferrers,
  fetchDevices,
  fetchActiveUsers,
  fetchCustomEvents,
  getToken,
} from "@/lib/api";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { Eye, Users, Activity, Globe, FileText, Zap } from "lucide-react";

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
  const [activeVisitors, setActiveVisitors] = useState(0);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    if (!getToken()) { navigate("/login"); return; }
    loadData();
  }, [siteId as string, days]);

  useEffect(() => {
    if (!siteId) return;
    const interval = setInterval(async () => {
      try {
        const data = await fetchActiveUsers(siteId as string as string);
        setActiveVisitors(data.active_visitors);
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [siteId]);

  async function loadData() {
    setLoading(true);
    try {
      const [sumData, tsData, pgData, refData, devData, activeData, customData] =
        await Promise.all([
          fetchSummary(siteId as string as string, days).catch(() => null),
          fetchTimeseries(siteId as string as string, days).catch(() => []),
          fetchPages(siteId as string as string, days).catch(() => []),
          fetchReferrers(siteId as string as string, days).catch(() => []),
          fetchDevices(siteId as string as string, days).catch(() => []),
          fetchActiveUsers(siteId as string as string).catch(() => null),
          fetchCustomEvents(siteId as string as string, days).catch(() => []),
        ]);

      if (sumData) setSummary(sumData);
      if (tsData) setTimeseries(tsData);
      if (pgData) setPages(pgData);
      if (refData) setReferrers(refData);
      if (devData) setDevices(devData);
      if (customData) setCustomEvents(customData);
      setActiveVisitors(activeData?.active_visitors || 0);
    } catch (err) {
      console.error("Dashboard load error", err);
    } finally {
      setLoading(false);
    }
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
    <div className="max-w-7xl animate-fade-in">
      {/* Days filter + Live badge */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex rounded-md border border-card-border overflow-hidden">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                days === d
                  ? "bg-foreground text-background"
                  : "text-muted hover:bg-white/5 hover:text-foreground"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-md border border-card-border px-3 py-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success"></span>
          </span>
          <span className="text-xs font-medium text-zinc-400">{activeVisitors} live</span>
        </div>
      </div>

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
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
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
                <Line type="monotone" dataKey="pageviews" stroke="#d4d4d8" strokeWidth={1.5} dot={{ r: 2.5, fill: "#d4d4d8" }} />
                <Line type="monotone" dataKey="visitors" stroke="#71717a" strokeWidth={1.5} dot={{ r: 2, fill: "#71717a" }} />
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
                    {devices.map((_, i) => (
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
              {devices.map((d, i) => (
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
            {pages.map((page, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors">
                <span className="text-xs text-zinc-400 font-mono truncate max-w-[250px]">{page.path}</span>
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
            {referrers.map((ref, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors">
                <span className="text-xs text-zinc-400 truncate max-w-[250px]">{ref.referrer}</span>
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
            {customEvents.map((event, i) => {
              const convRate = summary?.visitors
                ? ((event.unique_visitors / summary.visitors) * 100).toFixed(1)
                : "0.0";
              return (
                <div key={i} className="grid grid-cols-12 gap-4 items-center px-4 py-3 hover:bg-white/[0.02] transition-colors">
                  <span className="col-span-6 text-xs font-medium text-zinc-400 font-mono truncate">{event.event_name}</span>
                  <span className="col-span-2 text-xs text-muted text-right tabular-nums">{event.count.toLocaleString()}</span>
                  <span className="col-span-2 text-xs text-muted text-right tabular-nums">{event.unique_visitors.toLocaleString()}</span>
                  <span className="col-span-2 text-xs font-medium text-foreground text-right tabular-nums">{convRate}%</span>
                </div>
              );
            })}
            {customEvents.length === 0 && (
              <div className="px-4 py-8 text-center text-xs text-muted">
                No custom events yet. Use <code className="font-mono text-zinc-400 bg-white/[0.03] px-1.5 py-0.5 rounded">window.luminary.track("event_name")</code> to track goals.
              </div>
            )}
          </div>
        </div>
      </div>
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
    <div className="rounded-lg border border-card-border bg-card p-4 hover:bg-white/[0.02] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="rounded-md border border-card-border bg-white/[0.02] p-2 text-muted">
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
