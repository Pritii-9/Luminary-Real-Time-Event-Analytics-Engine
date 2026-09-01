import { useParams } from 'react-router-dom';
import { useState, useEffect } from "react";
import { MousePointer2, Play, VideoOff, RefreshCw } from "lucide-react";
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

  return (
    <div className="max-w-6xl animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Session Replays & Telemetry</h1>
          <p className="text-xs text-muted mt-1">
            Replay live user journeys, cursor movements, clicks, and page transitions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchReplays}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-card-border bg-card text-foreground hover:bg-white/5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-accent" : "text-muted"}`} />
            <span>Refresh</span>
          </button>

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

        {isLoading ? (
          <div className="p-12 text-center text-xs text-muted">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-accent" />
            Loading real-time session replays...
          </div>
        ) : replaySessions.length === 0 ? (
          <div className="p-12 text-center">
            <VideoOff className="h-8 w-8 text-muted/40 mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">No Recorded Sessions Yet</p>
            <p className="text-xs text-muted max-w-sm mx-auto mt-1">
              Install your Luminary tracking script on your website to start recording visitor mouse trajectories and clicks in real time.
            </p>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
