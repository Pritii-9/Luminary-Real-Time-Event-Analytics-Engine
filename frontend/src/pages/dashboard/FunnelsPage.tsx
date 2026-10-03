import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Filter,
  Plus,
  Trash2,
  TrendingDown,
  Users,
  CheckCircle2,
  AlertCircle,
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
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Conversion Funnels & Drop-off Analysis
          </h1>
          <p className="text-xs text-muted mt-1">
            Track multi-step visitor journeys and pinpoint exact conversion drop-off percentages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Timeframe Selector */}
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-1.5 rounded-lg border border-card-border bg-card text-xs font-medium text-foreground focus:outline-none"
          >
            <option value={7}>Last 7 Days</option>
            <option value={14}>Last 14 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>

          {/* New Funnel Button */}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-2 rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            New Funnel
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      {funnels.length === 0 ? (
        <div className="border border-dashed border-card-border rounded-xl p-12 text-center bg-card/20">
          <Filter className="h-10 w-10 text-muted mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-foreground">No Conversion Funnels Created</h3>
          <p className="text-xs text-muted max-w-sm mx-auto mt-1 mb-4">
            Build user journey funnels (e.g. Landing &rarr; Pricing &rarr; Register) to analyze conversion retention.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-primary text-primary-foreground text-xs font-medium px-4 py-2 rounded-lg cursor-pointer"
          >
            Create Your First Funnel
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Funnel Selector List */}
          <div className="lg:col-span-1 space-y-2">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Funnels</p>
            {funnels.map((f) => {
              const isSelected = f.id === selectedFunnelId;
              return (
                <div
                  key={f.id}
                  onClick={() => setSelectedFunnelId(f.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? "border-primary bg-primary/5 text-foreground font-semibold"
                      : "border-card-border bg-card/40 text-muted hover:text-foreground hover:bg-card/70"
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs truncate">{f.name}</p>
                    <p className="text-[10px] text-muted truncate mt-0.5">
                      {f.steps.length} Steps
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFunnel(f.id);
                    }}
                    title="Delete Funnel"
                    className="text-muted hover:text-red-400 p-1 rounded-md transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Funnel Visualizer Panel */}
          <div className="lg:col-span-3 space-y-6">
            {analyzing ? (
              <div className="flex h-64 items-center justify-center border border-card-border rounded-xl bg-card/40">
                <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : analysis ? (
              <>
                {/* Summary Metrics Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-card-border bg-card/40">
                    <div className="flex items-center gap-2 text-muted text-xs mb-1">
                      <Users className="h-3.5 w-3.5 text-blue-400" />
                      <span>Total Entrants</span>
                    </div>
                    <p className="text-lg font-bold">{analysis.total_entrants}</p>
                  </div>

                  <div className="p-4 rounded-xl border border-card-border bg-card/40">
                    <div className="flex items-center gap-2 text-muted text-xs mb-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Conversions</span>
                    </div>
                    <p className="text-lg font-bold">{analysis.total_conversions}</p>
                  </div>

                  <div className="p-4 rounded-xl border border-card-border bg-card/40">
                    <div className="flex items-center gap-2 text-muted text-xs mb-1">
                      <BarChart2 className="h-3.5 w-3.5 text-purple-400" />
                      <span>Overall Rate</span>
                    </div>
                    <p className="text-lg font-bold text-primary">
                      {analysis.overall_conversion_rate}
                    </p>
                  </div>
                </div>

                {/* Step Breakdown Cards */}
                <div className="border border-card-border rounded-xl p-5 bg-card/40 space-y-5">
                  <h3 className="text-sm font-semibold text-foreground flex items-center justify-between">
                    <span>{analysis.name} — Step Breakdown</span>
                    <span className="text-xs font-normal text-muted">
                      Timeframe: Last {days} Days
                    </span>
                  </h3>

                  <div className="space-y-4">
                    {analysis.step_analysis.map((step, idx) => {
                      const widthPct = Math.max(
                        Number(step.retention_rate.replace("%", "")),
                        5
                      );

                      return (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 font-medium">
                              <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center">
                                {step.step_number}
                              </span>
                              <span>{step.name}</span>
                              <span className="text-muted text-[11px]">({step.path})</span>
                            </div>

                            <div className="flex items-center gap-4 text-xs">
                              <span className="font-semibold text-foreground">
                                {step.visitors} visitors
                              </span>
                              <span className="text-emerald-400 font-bold">
                                {step.retention_rate}
                              </span>
                            </div>
                          </div>

                          {/* Progress Bar Container */}
                          <div className="h-3 w-full bg-zinc-800/60 rounded-full overflow-hidden relative">
                            <div
                              className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all duration-300"
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>

                          {/* Drop-off Indicator (if not first step) */}
                          {idx > 0 && (
                            <div className="flex items-center gap-1.5 text-[11px] text-red-400 bg-red-500/10 px-2.5 py-1 rounded-md w-fit">
                              <TrendingDown className="h-3 w-3" />
                              <span>
                                Drop-off: <strong>-{step.dropoff_count}</strong> visitors ({step.dropoff_rate})
                              </span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-card-border rounded-xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Create Conversion Funnel</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFunnel} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  Funnel Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., User Onboarding & Checkout"
                  value={funnelName}
                  onChange={(e) => setFunnelName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-card-border bg-background text-xs font-medium focus:outline-none focus:border-primary"
                />
              </div>

              {/* Step Fields */}
              <div className="space-y-3">
                <label className="block text-xs font-medium text-muted">
                  Funnel Steps (Min 2)
                </label>

                {steps.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      placeholder={`Step ${idx + 1} Name`}
                      value={step.name}
                      onChange={(e) => updateStepField(idx, "name", e.target.value)}
                      className="w-1/2 px-2.5 py-1.5 rounded-lg border border-card-border bg-background text-xs font-medium focus:outline-none"
                    />
                    <input
                      type="text"
                      required
                      placeholder="URL Path (/pricing)"
                      value={step.path}
                      onChange={(e) => updateStepField(idx, "path", e.target.value)}
                      className="w-1/2 px-2.5 py-1.5 rounded-lg border border-card-border bg-background text-xs font-medium focus:outline-none"
                    />
                    {steps.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeStepField(idx)}
                        className="text-muted hover:text-red-400 p-1"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addStepField}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer pt-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Step
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
                >
                  {creating ? "Creating..." : "Save Funnel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
