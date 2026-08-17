"use client";

import { useEffect, useState, useRef } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";

interface Coordinate {
  x: number;
  y: number;
  t: number;
  type: "move" | "click";
}

interface ReplayData {
  id: number;
  site_id: string;
  session_id: string;
  path: string;
  coordinates: Coordinate[];
  created_at: string;
}

interface Props {
  sessionId: string;
  targetPageUrl?: string; // Optional target page URL to show in iframe background
}

export default function SessionReplayViewer({ sessionId, targetPageUrl }: Props) {
  const [replay, setReplay] = useState<ReplayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function fetchReplay() {
      try {
        const res = await fetch(`http://localhost:8000/api/session-replay/${sessionId}`);
        const data = await res.json();
        if (data && data.length > 0) {
          // Merge coordinates from all page tracks in this session
          const sorted = data.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          setReplay(sorted[0]);
        }
      } catch (err) {
        console.error("Failed to load session replay", err);
      } finally {
        setLoading(false);
      }
    }
    fetchReplay();
  }, [sessionId]);

  const coords = replay?.coordinates || [];

  // Animation controller loop
  useEffect(() => {
    if (isPlaying && currentIndex < coords.length - 1) {
      const current = coords[currentIndex];
      const next = coords[currentIndex + 1];
      const delay = Math.max(10, Math.min(next.t - current.t, 1000)); // Clamp interval time for smooth replay

      timerRef.current = setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
      }, delay);
    } else if (currentIndex >= coords.length - 1) {
      setIsPlaying(false);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentIndex, coords]);

  const handlePlayPause = () => {
    if (currentIndex >= coords.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-card-border bg-card text-muted">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <span className="text-xs">Loading session data...</span>
        </div>
      </div>
    );
  }

  if (!replay || coords.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-card-border bg-card text-muted text-xs">
        No cursor movements captured for this session.
      </div>
    );
  }

  // Construct SVG Path string up to current index
  const getSvgPath = () => {
    if (currentIndex === 0) return "";
    let d = "";
    coords.slice(0, currentIndex + 1).forEach((pt, index) => {
      // Map percentages to 100% SVG view box
      const xVal = pt.x * 100;
      const yVal = pt.y * 100;
      if (index === 0) {
        d = `M ${xVal} ${yVal}`;
      } else {
        d += ` L ${xVal} ${yVal}`;
      }
    });
    return d;
  };

  // Find click coordinates up to current index
  const clicks = coords.slice(0, currentIndex + 1).filter((c) => c.type === "click");

  // Get current cursor location
  const currentCursor = coords[currentIndex] || { x: 0, y: 0 };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-card-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-card-border pb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">Session Cursor Replay</h3>
          <p className="text-xs text-muted">Path: <span className="font-mono text-accent">{replay.path}</span> · {coords.length} coordinates</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePlayPause}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-background hover:opacity-90 transition-all cursor-pointer"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
          </button>
          <button
            onClick={handleReset}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-card-border bg-card text-muted hover:text-foreground transition-all cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Visual Overlay Canvas */}
      <div
        ref={containerRef}
        className="relative aspect-video w-full overflow-hidden rounded-lg border border-card-border bg-slate-950/20 dark:bg-slate-900/40"
      >
        {targetPageUrl ? (
          <iframe
            src={targetPageUrl}
            className="absolute inset-0 h-full w-full border-none pointer-events-none opacity-40 select-none"
            title="Session Page Snapshot"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <span className="text-sm font-mono text-foreground font-semibold">PAGE CONTENT PLACEHOLDER</span>
          </div>
        )}

        {/* Overlaying Canvas SVG wrapper */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full pointer-events-none select-none"
          preserveAspectRatio="none"
        >
          {/* Cursor path line */}
          <path
            d={getSvgPath()}
            fill="none"
            stroke="#10b981"
            strokeWidth="0.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-100 ease-linear"
          />

          {/* Render Click indicators */}
          {clicks.map((click, idx) => (
            <circle
              key={idx}
              cx={click.x * 100}
              cy={click.y * 100}
              r="1.5"
              fill="#ef4444"
              stroke="#ffffff"
              strokeWidth="0.3"
              className="animate-ping"
            />
          ))}

          {/* Current animated cursor indicator */}
          <circle
            cx={currentCursor.x * 100}
            cy={currentCursor.y * 100}
            r="1.2"
            fill="#10b981"
            stroke="#ffffff"
            strokeWidth="0.3"
            className="shadow-md"
          />
        </svg>
      </div>

      {/* Timeline Slider */}
      <div className="flex items-center gap-4 text-xs">
        <span className="text-muted font-mono">{currentIndex + 1} / {coords.length}</span>
        <input
          type="range"
          min="0"
          max={coords.length - 1}
          value={currentIndex}
          onChange={(e) => setCurrentIndex(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-200 dark:bg-slate-800 accent-accent"
        />
        <span className="text-muted font-mono">
          {(((coords[currentIndex]?.t || 0) - (coords[0]?.t || 0)) / 1000).toFixed(1)}s
        </span>
      </div>
    </div>
  );
}
