import { useParams } from 'react-router-dom';
import { useEffect, useState, use } from "react";
import { fetchCustomEvents, fetchSummary } from "@/lib/api";
import { Zap, Code } from "lucide-react";

export default function EventsPage() {
  const {  siteId  } = useParams();
  const [events, setEvents] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [eventData, sumData] = await Promise.all([
          fetchCustomEvents(siteId as string as string, days),
          fetchSummary(siteId as string as string, days),
        ]);
        setEvents(eventData || []);
        setSummary(sumData);
      } catch (err) {
        console.error("Failed to load events", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [siteId as string, days]);

  return (
    <div className="max-w-6xl animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Goals & Custom Events</h1>
          <p className="text-xs text-muted mt-1">
            Track user conversions, button clicks, form submissions, and SaaS feature triggers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-md border border-card-border overflow-hidden">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  days === d
                    ? "bg-foreground text-background font-semibold"
                    : "text-muted hover:bg-white/5 hover:text-foreground"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Code Snippet Helper */}
      <div className="rounded-xl border border-card-border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Code className="h-4 w-4 text-muted" />
          <h3 className="text-xs font-semibold text-foreground">How to trigger custom events in your code</h3>
        </div>
        <pre className="text-xs font-mono text-foreground bg-background p-3 rounded-md overflow-x-auto border border-card-border">
          {`// Track button click or signup conversion
window.luminary?.track("signup_completed", { plan: "pro" });`}
        </pre>
      </div>

      {/* Events Table */}
      <div className="rounded-xl border border-card-border bg-card overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-card-border text-[10px] font-semibold text-muted uppercase tracking-wider">
          <span className="col-span-6">Event / Goal Identifier</span>
          <span className="col-span-2 text-right">Total Triggers</span>
          <span className="col-span-2 text-right">Unique Users</span>
          <span className="col-span-2 text-right">Conversion Rate</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted">Loading custom events...</div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted">
            No custom events recorded for this site yet.
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {events.map((e, idx) => {
              const convRate = summary?.visitors
                ? ((e.unique_visitors / summary.visitors) * 100).toFixed(1)
                : "0.0";
              return (
                <div key={idx} className="grid grid-cols-12 gap-4 items-center px-4 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className="col-span-6 flex items-center gap-2.5 min-w-0">
                    <Zap className="h-3.5 w-3.5 text-muted shrink-0" />
                    <span className="text-xs font-mono font-medium text-foreground truncate">{e.event_name}</span>
                  </div>
                  <span className="col-span-2 text-xs font-semibold text-foreground text-right tabular-nums">
                    {e.count.toLocaleString()}
                  </span>
                  <span className="col-span-2 text-xs text-muted text-right tabular-nums">
                    {e.unique_visitors.toLocaleString()}
                  </span>
                  <span className="col-span-2 text-xs font-semibold text-foreground text-right tabular-nums">
                    {convRate}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
