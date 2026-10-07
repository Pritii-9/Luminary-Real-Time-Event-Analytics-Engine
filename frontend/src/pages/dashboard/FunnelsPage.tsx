import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Filter,
  Plus,
  Trash2,
  TrendingDown,
  Users,
  CheckCircle2,
  BarChart2,
  X,
} from "lucide-react";
import {
  listFunnels,
  createFunnelApi,
  deleteFunnelApi,
  fetchFunnelAnalysis,
  type FunnelItem,
  type FunnelAnalysis,
} from "@/lib/api";

export default function FunnelsPage() {
  const { siteId } = useParams();
  const [funnels, setFunnels] = useState<FunnelItem[]>([]);
  const [selectedFunnelId, setSelectedFunnelId] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<FunnelAnalysis | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [funnelName, setFunnelName] = useState("");
  const [steps, setSteps] = useState([
    { name: "Landing Page", path: "/" },
    { name: "Pricing", path: "/pricing" },
  ]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadFunnels();
  }, [siteId]);

  useEffect(() => {
    if (selectedFunnelId) {
      loadAnalysis(selectedFunnelId, days);
    }
  }, [selectedFunnelId, days]);

  async function loadFunnels() {
    if (!siteId) return;
    setLoading(true);
    try {
      const data = await listFunnels(siteId);
      setFunnels(data);
      if (data.length > 0 && !selectedFunnelId) {
        setSelectedFunnelId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load funnels", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadAnalysis(id: number, timeWindow: number) {
    setAnalyzing(true);
    try {
      const res = await fetchFunnelAnalysis(id, timeWindow);
      setAnalysis(res);
    } catch (err) {
      console.error("Failed to load funnel analysis", err);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleCreateFunnel(e: React.FormEvent) {
    e.preventDefault();
    if (!siteId || !funnelName.trim() || steps.length < 2) return;
    setCreating(true);
    try {
      const res = await createFunnelApi(siteId, funnelName.trim(), steps);
      setShowModal(false);
      setFunnelName("");
      setSteps([
        { name: "Landing Page", path: "/" },
        { name: "Pricing", path: "/pricing" },
      ]);
      await loadFunnels();
      setSelectedFunnelId(res.funnel_id);
    } catch (err) {
      console.error("Failed to create funnel", err);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteFunnel(id: number) {
    if (!confirm("Are you sure you want to delete this conversion funnel?")) return;
    try {
      await deleteFunnelApi(id);
      const remaining = funnels.filter((f) => f.id !== id);
      setFunnels(remaining);
      if (selectedFunnelId === id) {
        setSelectedFunnelId(remaining.length > 0 ? remaining[0].id : null);
        setAnalysis(null);
      }
    } catch (err) {
      console.error("Failed to delete funnel", err);
    }
  }

  const addStepField = () => {
    setSteps([...steps, { name: `Step ${steps.length + 1}`, path: "" }]);
  };

  const removeStepField = (index: number) => {
    if (steps.length <= 2) return;
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStepField = (index: number, field: "name" | "path", value: string) => {
    const updated = [...steps];
    updated[index][field] = value;
    setSteps(updated);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-5 w-5 rounded-full border-2 border-foreground/30 border-t-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-card-border">
        <div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted" />
            <h1 className="text-sm font-semibold tracking-tight text-foreground uppercase">
              Pipeline Funnels & Drop-off Telemetry
            </h1>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Multi-stage visitor journeys, transition retention, and bottleneck drop-off analysis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Timeframe Selector */}
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-md border border-card-border bg-card text-xs font-medium text-foreground focus:outline-none cursor-pointer"
          >
            <option value={7}>Last 7 Days</option>
            <option value={14}>Last 14 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>

          {/* New Funnel Button */}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-foreground text-background text-xs font-semibold px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            New Funnel
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      {funnels.length === 0 ? (
        <div className="border border-dashed border-card-border rounded-lg p-12 text-center bg-card">
          <Filter className="h-8 w-8 text-muted mx-auto mb-3 stroke-[1.5]" />
          <h3 className="text-sm font-medium text-foreground">No Conversion Funnels Defined</h3>
          <p className="text-xs text-muted max-w-sm mx-auto mt-1 mb-4">
            Build step pipelines (e.g. Landing &rarr; Pricing &rarr; Register) to monitor step-by-step conversion drop-offs.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-foreground text-background text-xs font-semibold px-3.5 py-1.5 rounded-md hover:opacity-90 transition-opacity cursor-pointer"
          >
            Create First Funnel
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Funnel Selector List */}
          <div className="lg:col-span-1 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-medium text-muted uppercase tracking-wider">Pipelines</span>
              <span className="text-[10px] font-mono text-muted">{funnels.length} active</span>
            </div>
            <div className="space-y-1.5">
              {funnels.map((f) => {
                const isSelected = f.id === selectedFunnelId;
                return (
                  <div
                    key={f.id}
                    onClick={() => setSelectedFunnelId(f.id)}
                    className={`p-2.5 rounded-md border text-left transition-colors cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "border-foreground/30 bg-foreground/[0.04] text-foreground font-medium"
                        : "border-card-border bg-card text-muted hover:text-foreground hover:bg-foreground/[0.02]"
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-xs font-medium truncate">{f.name}</p>
                      <p className="text-[10px] text-muted font-mono mt-0.5">
                        {f.steps.length} stages
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFunnel(f.id);
                      }}
                      title="Delete Funnel"
                      className="text-muted hover:text-rose-400 p-1 rounded transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Funnel Visualizer Panel */}
          <div className="lg:col-span-3 space-y-4">
            {analyzing ? (
              <div className="flex h-64 items-center justify-center border border-card-border rounded-lg bg-card">
                <div className="h-5 w-5 rounded-full border-2 border-foreground/30 border-t-foreground animate-spin" />
              </div>
            ) : analysis ? (
              <>
                {/* Summary Metrics Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-lg border border-card-border bg-card">
                    <div className="flex items-center justify-between text-muted text-[10px] font-medium uppercase tracking-wider mb-1">
                      <span>Total Entrants</span>
                      <Users className="h-3.5 w-3.5 text-muted" />
                    </div>
                    <p className="text-lg font-semibold tabular-nums text-foreground">{analysis.total_entrants.toLocaleString()}</p>
                    <p className="text-[10px] text-muted mt-0.5 font-mono">Stage 1 triggers</p>
                  </div>

                  <div className="p-3.5 rounded-lg border border-card-border bg-card">
                    <div className="flex items-center justify-between text-muted text-[10px] font-medium uppercase tracking-wider mb-1">
                      <span>Completed</span>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                    <p className="text-lg font-semibold tabular-nums text-foreground">{analysis.total_conversions.toLocaleString()}</p>
                    <p className="text-[10px] text-muted mt-0.5 font-mono">Full pipeline completed</p>
                  </div>

                  <div className="p-3.5 rounded-lg border border-card-border bg-card">
                    <div className="flex items-center justify-between text-muted text-[10px] font-medium uppercase tracking-wider mb-1">
                      <span>Net Conversion</span>
                      <BarChart2 className="h-3.5 w-3.5 text-muted" />
                    </div>
                    <p className="text-lg font-semibold tabular-nums text-foreground">
                      {analysis.overall_conversion_rate}
                    </p>
                    <p className="text-[10px] text-muted mt-0.5 font-mono">End-to-end retention</p>
                  </div>
                </div>

                {/* Step Breakdown Cards */}
                <div className="border border-card-border rounded-lg bg-card overflow-hidden">
                  <div className="p-3.5 border-b border-card-border flex items-center justify-between bg-foreground/[0.01]">
                    <span className="text-xs font-semibold text-foreground tracking-tight">
                      {analysis.name} — Pipeline Stages
                    </span>
                    <span className="text-[10px] font-mono text-muted">
                      Window: Last {days} Days
                    </span>
                  </div>

                  <div className="p-4 space-y-4">
                    {analysis.step_analysis.map((step, idx) => {
                      const numericPct = Number(step.retention_rate.replace("%", "")) || 0;
                      const widthPct = Math.max(Math.min(numericPct, 100), 4);

                      return (
                        <div key={idx} className="space-y-1.5 p-3 rounded-md border border-border-subtle bg-foreground/[0.01]">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="h-5 w-5 rounded font-mono text-[10px] font-semibold border border-card-border bg-foreground/[0.05] text-foreground flex items-center justify-center">
                                {step.step_number}
                              </span>
                              <span className="font-medium text-foreground">{step.name}</span>
                              <span className="text-muted font-mono text-[11px]">{step.path}</span>
                            </div>

                            <div className="flex items-center gap-3 text-xs tabular-nums">
                              <span className="text-muted">
                                <strong className="text-foreground font-semibold">{step.visitors.toLocaleString()}</strong> visitors
                              </span>
                              <span className="font-mono font-medium px-2 py-0.5 rounded text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {step.retention_rate}
                              </span>
                            </div>
                          </div>

                          {/* Progress Bar Container */}
                          <div className="h-2 w-full bg-foreground/[0.06] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-foreground/80 rounded-full transition-all duration-300"
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>

                          {/* Drop-off Indicator (if not first step) */}
                          {idx > 0 && (
                            <div className="flex items-center justify-between text-[11px] pt-0.5">
                              <div className="flex items-center gap-1.5 text-rose-400 font-mono">
                                <TrendingDown className="h-3 w-3" />
                                <span>
                                  Stage Drop-off: -{step.dropoff_count.toLocaleString()} visitors ({step.dropoff_rate})
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Modal: Create Funnel */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-card border border-card-border rounded-lg w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-card-border">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Create Conversion Pipeline</h3>
                <p className="text-[11px] text-muted mt-0.5">Define sequential paths to compute conversion drop-offs</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted hover:text-foreground transition-colors p-1 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFunnel} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Pipeline Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Onboarding to Subscription"
                  value={funnelName}
                  onChange={(e) => setFunnelName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md border border-card-border bg-background text-xs font-medium text-foreground placeholder:text-muted/60 focus:outline-none focus:border-foreground/40"
                />
              </div>

              {/* Step Fields */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">
                    Sequential Stages (Min 2)
                  </label>
                  <button
                    type="button"
                    onClick={addStepField}
                    className="text-[11px] font-medium text-foreground hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" /> Add Stage
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {steps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted w-4 text-center">{idx + 1}</span>
                      <input
                        type="text"
                        required
                        placeholder={`Stage ${idx + 1} Name`}
                        value={step.name}
                        onChange={(e) => updateStepField(idx, "name", e.target.value)}
                        className="w-1/2 px-2.5 py-1.5 rounded-md border border-card-border bg-background text-xs font-medium text-foreground focus:outline-none focus:border-foreground/40"
                      />
                      <input
                        type="text"
                        required
                        placeholder="/path"
                        value={step.path}
                        onChange={(e) => updateStepField(idx, "path", e.target.value)}
                        className="w-1/2 px-2.5 py-1.5 rounded-md border border-card-border bg-background text-xs font-mono text-foreground focus:outline-none focus:border-foreground/40"
                      />
                      {steps.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeStepField(idx)}
                          className="text-muted hover:text-rose-400 p-1"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-muted hover:text-foreground hover:bg-foreground/[0.04] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-1.5 rounded-md text-xs font-semibold bg-foreground text-background hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Save Pipeline"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
