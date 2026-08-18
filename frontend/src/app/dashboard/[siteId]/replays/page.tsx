"use client";

import { useState, use } from "react";
import { MousePointer2, Play, Clock, Monitor, Globe } from "lucide-react";

export default function ReplaysFeaturePage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const [days, setDays] = useState(30);

  // Replay sessions telemetry data
  const replaySessions = [
    { id: "ses_9a4f21", user: "Visitor #4920", location: "United States", pages: 4, duration: "2m 14s", device: "Desktop / Chrome", time: "10 mins ago" },
    { id: "ses_8b1e77", user: "Visitor #4919", location: "Germany", pages: 7, duration: "4m 52s", device: "Desktop / Firefox", time: "28 mins ago" },
    { id: "ses_7c8d32", user: "Visitor #4918", location: "India", pages: 3, duration: "1m 05s", device: "Mobile / Safari", time: "1 hour ago" },
    { id: "ses_6d9a10", user: "Visitor #4917", location: "United Kingdom", pages: 12, duration: "8m 40s", device: "Desktop / Edge", time: "2 hours ago" },
    { id: "ses_5e2c88", user: "Visitor #4916", location: "Canada", pages: 2, duration: "0m 45s", device: "Mobile / Chrome", time: "3 hours ago" },
  ];

  return (
    <div className="max-w-6xl animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Session Replays & Telemetry</h1>
          <p className="text-xs text-muted mt-1">
            Replay user journeys, cursor movements, clicks, and page transitions.
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

      {/* Sessions Table */}
      <div className="rounded-xl border border-card-border bg-card overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-card-border text-[10px] font-semibold text-muted uppercase tracking-wider">
          <span className="col-span-3">Session & Visitor</span>
          <span className="col-span-3">Location & Device</span>
          <span className="col-span-2 text-right">Pages</span>
          <span className="col-span-2 text-right">Duration</span>
          <span className="col-span-2 text-right">Replay</span>
        </div>

        <div className="divide-y divide-border-subtle">
          {replaySessions.map((s) => (
            <div key={s.id} className="grid grid-cols-12 gap-4 items-center px-4 py-3 hover:bg-white/[0.02] transition-colors">
              <div className="col-span-3 flex items-center gap-2.5 min-w-0">
                <MousePointer2 className="h-3.5 w-3.5 text-muted shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-mono font-medium text-foreground truncate">{s.user}</p>
                  <p className="text-[10px] text-muted font-mono">{s.id}</p>
                </div>
              </div>

              <div className="col-span-3 text-xs text-muted min-w-0">
                <p className="text-foreground truncate">{s.location}</p>
                <p className="text-[10px] text-muted truncate">{s.device}</p>
              </div>

              <span className="col-span-2 text-xs font-semibold text-foreground text-right tabular-nums">
                {s.pages}
              </span>

              <div className="col-span-2 text-right text-xs">
                <span className="font-mono text-foreground tabular-nums">{s.duration}</span>
                <p className="text-[10px] text-muted">{s.time}</p>
              </div>

              <div className="col-span-2 flex justify-end">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 h-7 rounded-md border border-card-border bg-background px-2.5 text-xs font-medium text-foreground hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Play className="h-3 w-3 fill-foreground" />
                  <span>Play</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
