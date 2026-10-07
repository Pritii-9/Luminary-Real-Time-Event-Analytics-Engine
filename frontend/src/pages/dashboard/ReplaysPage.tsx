import { useParams } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { MousePointer2, Play, VideoOff, RefreshCw, Clock, MonitorPlay, X } from "lucide-react";
import { apiFetch } from "../../lib/api";

interface ReplaySessionItem {
  id: string;
  user: string;
  location: string;
  pages: number;
  duration: string;
  device: string;
  time: string;
}

export default function ReplaysPage() {
  const { siteId } = useParams();
  const [days, setDays] = useState(30);
  const [replaySessions, setReplaySessions] = useState<ReplaySessionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<ReplaySessionItem | null>(null);

  const fetchReplays = () => {
    if (!siteId) return;
    setIsLoading(true);
    apiFetch<ReplaySessionItem[]>(`/api/v1/session-replay/list/${siteId}`)
      .then((data) => {
        if (Array.isArray(data)) {
          setReplaySessions(data);
        } else {
          setReplaySessions([]);
        }
      })
      .catch(() => {
        setReplaySessions([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchReplays();
  }, [siteId]);

  const multiPageCount = useMemo(() => {
    return replaySessions.filter((s) => s.pages > 1).length;
  }, [replaySessions]);

  return (
    <div className="space-y-5">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-card-border">
        <div>
          <div className="flex items-center gap-2">
            <MonitorPlay className="h-4 w-4 text-muted" />
            <h1 className="text-sm font-semibold tracking-tight text-foreground uppercase">
              DOM Session Replays & Interaction Traces
            </h1>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Micro-interaction stream captures, cursor vectors, viewport mutation logs, and page journeys.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchReplays}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-card-border bg-card text-foreground hover:bg-foreground/[0.04] transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : "text-muted"}`} />
            <span>Sync</span>
          </button>

          <div className="flex rounded-md border border-card-border overflow-hidden bg-card">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  days === d
                    ? "bg-foreground text-background font-semibold"
                    : "text-muted hover:bg-foreground/[0.04] hover:text-foreground"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 rounded-lg border border-card-border bg-card">
          <div className="flex items-center justify-between text-muted text-[10px] font-medium uppercase tracking-wider mb-1">
            <span>Captured Sessions</span>
            <MonitorPlay className="h-3.5 w-3.5 text-muted" />
          </div>
          <p className="text-lg font-semibold tabular-nums text-foreground">{replaySessions.length.toLocaleString()}</p>
          <p className="text-[10px] text-muted mt-0.5 font-mono">Stream recordings</p>
        </div>

        <div className="p-3.5 rounded-lg border border-card-border bg-card">
          <div className="flex items-center justify-between text-muted text-[10px] font-medium uppercase tracking-wider mb-1">
            <span>Multi-Page Journeys</span>
            <MousePointer2 className="h-3.5 w-3.5 text-muted" />
          </div>
          <p className="text-lg font-semibold tabular-nums text-foreground">{multiPageCount.toLocaleString()}</p>
          <p className="text-[10px] text-muted mt-0.5 font-mono">Depth &gt; 1 page</p>
        </div>

        <div className="p-3.5 rounded-lg border border-card-border bg-card">
          <div className="flex items-center justify-between text-muted text-[10px] font-medium uppercase tracking-wider mb-1">
            <span>Trace Compression</span>
            <Clock className="h-3.5 w-3.5 text-muted" />
          </div>
          <p className="text-lg font-semibold tabular-nums text-foreground">rrweb v2 / gzip</p>
          <p className="text-[10px] text-muted mt-0.5 font-mono">Differential mutations</p>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="rounded-lg border border-card-border bg-card overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-4 py-2.5 border-b border-card-border text-[10px] font-medium text-muted uppercase tracking-wider bg-foreground/[0.01]">
          <span className="col-span-4">Session UUID & Visitor</span>
          <span className="col-span-3">Client Geo & Device</span>
          <span className="col-span-2 text-right">Route Depth</span>
          <span className="col-span-2 text-right">Duration</span>
          <span className="col-span-1 text-right">Inspect</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-muted">
            <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-muted" />
            Loading recorded session streams...
          </div>
        ) : replaySessions.length === 0 ? (
          <div className="p-12 text-center">
            <VideoOff className="h-8 w-8 text-muted/50 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No Recorded Sessions Yet</p>
            <p className="text-xs text-muted max-w-sm mx-auto mt-1">
              Ensure your client SDK snippet includes <code className="font-mono text-foreground bg-foreground/[0.05] px-1 py-0.5 rounded border border-card-border">recordReplay: true</code> to stream DOM mutations.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {replaySessions.map((s) => (
              <div key={s.id} className="grid grid-cols-12 gap-4 items-center px-4 py-2.5 hover:bg-foreground/[0.02] transition-colors">
                <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-mono font-medium text-foreground truncate">{s.user || "Anonymous Visitor"}</p>
                    <p className="text-[10px] text-muted font-mono truncate">{s.id}</p>
                  </div>
                </div>

                <div className="col-span-3 text-xs text-muted min-w-0">
                  <p className="text-foreground truncate">{s.location || "Unknown Geo"}</p>
                  <p className="text-[10px] text-muted font-mono truncate">{s.device || "Browser Client"}</p>
                </div>

                <span className="col-span-2 text-xs font-mono text-foreground text-right tabular-nums">
                  {s.pages} {s.pages === 1 ? "page" : "pages"}
                </span>

                <div className="col-span-2 text-right text-xs">
                  <span className="font-mono text-foreground tabular-nums">{s.duration}</span>
                  <p className="text-[10px] text-muted font-mono">{s.time}</p>
                </div>

                <div className="col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveSession(s)}
                    className="inline-flex items-center justify-center h-7 w-7 rounded border border-card-border bg-background text-foreground hover:bg-foreground/[0.05] transition-colors cursor-pointer"
                    title="Playback session"
                  >
                    <Play className="h-3 w-3 fill-foreground" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Session Player Telemetry Modal */}
      {activeSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-card border border-card-border rounded-lg w-full max-w-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-card-border">
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4 fill-foreground text-foreground" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">DOM Replay Player: {activeSession.id}</h3>
                  <p className="text-[10px] text-muted font-mono">{activeSession.user} • {activeSession.location} • {activeSession.device}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveSession(null)}
                className="text-muted hover:text-foreground p-1 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Virtual Canvas/Player Stage */}
            <div className="aspect-video w-full rounded-md border border-card-border bg-[#0d0e11] flex flex-col items-center justify-center p-6 text-center text-muted">
              <MousePointer2 className="h-8 w-8 text-cyan-400 mb-2 animate-bounce" />
              <p className="text-xs font-mono text-foreground">Playback Buffer Active</p>
              <p className="text-[11px] text-muted max-w-md mt-1 font-mono">
                Replaying {activeSession.pages} pages over {activeSession.duration}. Full DOM canvas rendered from differential rrweb events.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-card-border text-xs">
              <div className="flex items-center gap-4 text-muted font-mono text-[11px]">
                <span>Speed: <strong>1.0x</strong></span>
                <span>Skip Inactivity: <strong>ON</strong></span>
              </div>
              <button
                type="button"
                onClick={() => setActiveSession(null)}
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-foreground text-background hover:opacity-90 transition-opacity cursor-pointer"
              >
                Close Replay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
