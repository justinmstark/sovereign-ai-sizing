import React, { useEffect, useMemo, useState } from "react";

export type ScenarioKey = "conservative" | "expected" | "aggressive";

export type ScenarioDef = {
  cagr_activity: number;
  cagr_complexity: number;
};

export type ModelScenarioOverrides = {
  mode: "inherit" | "override";
  conservative?: ScenarioDef;
  expected?: ScenarioDef;
  aggressive?: ScenarioDef;
};

export type ModelEntry = {
  id: string;
  displayName: string;
  params: number;
  datasetTB: number;
  tokenCount?: number;
  epochs: number;
  avgRunGPUhours: number;
  runsPerMonth: number;

  precision?: "fp32" | "fp16" | "bf16" | "int8";
  distStrategy?: string;
  checkpointGB?: number;
  checkpointRetentionMonths?: number;
  concurrency?: number;
  storageTier?: string;
  notes?: string;

  growth?: ModelScenarioOverrides;
};

export type Assumptions = {
  target_utilization: number;
  gpu_per_node: number;
  hours_per_node_per_year: number;

  cpu_per_node?: string;
  cpuCoresPerNode?: number;
  ramGB_per_node?: number;
  networkGbps_per_node?: number;
  powerKW_per_node?: number;
};

export type Capture = {
  schemaVersion: string;
  serviceId: "LLM_TRAINING";
  clientId: string;
  environment: string;
  metadata?: any;

  models: ModelEntry[];
  scenarios: {
    conservative: ScenarioDef;
    expected: ScenarioDef;
    aggressive: ScenarioDef;
  };
  assumptions: Assumptions;
};

export type LLMTrainingValue = Capture;

const HELP = {
  avgRunGPUhours:
    "Total GPU-hours consumed by one completed run across all GPUs. Example: 8 GPUs × 12.5 hours = 100 GPU-hours.",
  runsPerMonth:
    "How often this training run happens in a typical month. Use 1=monthly, 4=weekly, 0.25=quarterly.",
  utilization:
    "Planned average utilization for capacity planning (not peak). Lower values provide headroom for bursts, queueing, failures, maintenance.",
  s_activity:
    "Activity CAGR = growth in training frequency (more runs, more teams, more experiments).",
  s_complexity:
    "Complexity CAGR = growth in per-run cost (bigger models, more data, more epochs, heavier eval).",
  cpuParse:
    'CPU cores are estimated from "CPU per node" if in a format like "2x64" (2 sockets × 64 cores = 128). Or set CPU cores per node explicitly.'
} as const;

// -------------------- Small UI helpers --------------------
function HelpTip({ text }: { text: string }) {
  return (
    <span
      title={text}
      aria-label={text}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 18,
        height: 18,
        borderRadius: 999,
        border: "1px solid #c7c7c7",
        fontSize: 12,
        lineHeight: "18px",
        marginLeft: 8,
        cursor: "help",
        userSelect: "none",
        color: "#111827",
        background: "#fff"
      }}
    >
      ?
    </span>
  );
}

type ButtonVariant = "primary" | "secondary" | "danger";

function Button({
  variant = "secondary",
  children,
  style,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
}) {
  const base: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 10,
    fontWeight: 800,
    fontSize: 13,
    cursor: props.disabled ? "not-allowed" : "pointer",
    opacity: props.disabled ? 0.6 : 1,
    whiteSpace: "nowrap",
    userSelect: "none"
  };

  const variants: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      border: "1px solid #111827",
      background: "#111827",
      color: "#ffffff"
    },
    secondary: {
      border: "1px solid #e5e7eb",
      background: "#ffffff",
      color: "#111827"
    },
    danger: {
      border: "1px solid #fecaca",
      background: "#fff1f2",
      color: "#b91c1c"
    }
  };

  return (
    <button {...props} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

function Card({
  title,
  right,
  children
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid #e6e6e9",
        borderRadius: 14,
        padding: 16,
        background: "#ffffff",
        boxShadow: "0 1px 4px rgba(15, 23, 42, 0.04)",
        color: "#0f172a" // force readable text even under dark app theme
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
          {title}
        </div>
        {right}
      </div>
      <div style={{ marginTop: 12 }}>{children}</div>
    </div>
  );
}

function PillTabs<T extends string>({
  items,
  active,
  onChange
}: {
  items: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {items.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid " + (isActive ? "#111827" : "#e5e7eb"),
              background: isActive ? "#111827" : "#ffffff",
              color: isActive ? "#ffffff" : "#111827",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function Field({
  label,
  help,
  children
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          color: "#0f172a",
          display: "flex",
          alignItems: "center"
        }}
      >
        {label}
        {help ? <HelpTip text={help} /> : null}
      </div>
      <div style={{ marginTop: 8 }}>{children}</div>
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid #e5e7eb",
        outline: "none",
        background: "#ffffff",
        color: "#0f172a",
        fontSize: 13
      }}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid #e5e7eb",
        outline: "none",
        background: "#ffffff",
        color: "#0f172a",
        fontSize: 13
      }}
    />
  );
}

// ---------- Defaults ----------
const DEFAULT_CAPTURE = (clientId = "default", env = "prod"): Capture => ({
  schemaVersion: "1.0",
  serviceId: "LLM_TRAINING",
  clientId,
  environment: env,
  metadata: { createdBy: "user", createdAt: new Date().toISOString() },
  models: [
    {
      id: "model-1",
      displayName: "7B research model",
      params: 7e9,
      datasetTB: 5,
      tokenCount: 0,
      epochs: 3,
      avgRunGPUhours: 100,
      runsPerMonth: 2,
      checkpointGB: 200,
      checkpointRetentionMonths: 3,
      growth: { mode: "inherit" }
    }
  ],
  scenarios: {
    conservative: { cagr_activity: 0.1, cagr_complexity: 0.05 },
    expected: { cagr_activity: 0.35, cagr_complexity: 0.15 },
    aggressive: { cagr_activity: 0.8, cagr_complexity: 0.3 }
  },
  assumptions: {
    target_utilization: 0.55,
    gpu_per_node: 8,
    hours_per_node_per_year: 8760,
    cpu_per_node: "2x64",
    ramGB_per_node: 1024,
    networkGbps_per_node: 400
  }
});

export function makeDefaultLLMTrainingValue(
  clientId = "default",
  env = "prod"
): LLMTrainingValue {
  return DEFAULT_CAPTURE(clientId, env);
}

// ---------- Math ----------
function monthlyGPUHoursPerModel(m: ModelEntry) {
  return m.runsPerMonth * m.avgRunGPUhours;
}

function annualGPUHoursPerModel(m: ModelEntry) {
  return monthlyGPUHoursPerModel(m) * 12;
}

function scenarioMultiplier(cagr_activity: number, cagr_complexity: number, years: number) {
  return (
    Math.pow(1 + cagr_activity, years) *
    Math.pow(1 + cagr_complexity, years)
  );
}

function projectedAnnualGPUHours(baseAnnualHours: number, scenario: ScenarioDef, years: number) {
  return baseAnnualHours * scenarioMultiplier(scenario.cagr_activity, scenario.cagr_complexity, years);
}

function gpuHoursPerNodePerYear(a: Assumptions) {
  return a.gpu_per_node * a.hours_per_node_per_year * a.target_utilization;
}

function requiredNodesForAnnualHours(annualHours: number, a: Assumptions) {
  const perNode = gpuHoursPerNodePerYear(a);
  return Math.ceil(annualHours / perNode);
}

function parseCpuCoresFromString(cpu?: string): number | null {
  if (!cpu) return null;
  const m = cpu
    .toLowerCase()
    .replace("×", "x")
    .match(/^\s*(\d+)\s*x\s*(\d+)\s*$/);
  if (!m) return null;
  const sockets = Number(m[1]);
  const cores = Number(m[2]);
  if (!Number.isFinite(sockets) || !Number.isFinite(cores)) return null;
  return sockets * cores;
}

function formatTBFromGB(gb: number) {
  return Math.round((gb / 1024) * 100) / 100;
}

function modelScenario(capture: Capture, model: ModelEntry, key: ScenarioKey): ScenarioDef {
  const g = model.growth;
  if (g?.mode === "override") {
    const v = g[key];
    if (v && Number.isFinite(v.cagr_activity) && Number.isFinite(v.cagr_complexity)) return v;
  }
  return capture.scenarios[key];
}

type RollupRow = {
  year: number;
  annualGPUHours: number;
  nodes: number;
  gpus: number;
  cpuCores: number | null;
  memoryTB: number | null;
};

function computeScenarioRollup(capture: Capture, key: ScenarioKey): RollupRow[] {
  const rows: RollupRow[] = [];

  const cpuCoresPerNode =
    (capture.assumptions.cpuCoresPerNode && capture.assumptions.cpuCoresPerNode > 0
      ? capture.assumptions.cpuCoresPerNode
      : parseCpuCoresFromString(capture.assumptions.cpu_per_node)) ?? null;

  const memGBPerNode =
    typeof capture.assumptions.ramGB_per_node === "number" && capture.assumptions.ramGB_per_node > 0
      ? capture.assumptions.ramGB_per_node
      : null;

  for (let y = 0; y <= 3; y++) {
    let totalAnnual = 0;
    for (const m of capture.models) {
      const base = annualGPUHoursPerModel(m);
      const s = modelScenario(capture, m, key);
      totalAnnual += projectedAnnualGPUHours(base, s, y);
    }

    const nodes = requiredNodesForAnnualHours(totalAnnual, capture.assumptions);
    const gpus = nodes * capture.assumptions.gpu_per_node;
    const cpuCores = cpuCoresPerNode ? nodes * cpuCoresPerNode : null;
    const memoryTB = memGBPerNode ? formatTBFromGB(nodes * memGBPerNode) : null;

    rows.push({
      year: y,
      annualGPUHours: Math.round(totalAnnual * 100) / 100,
      nodes,
      gpus,
      cpuCores,
      memoryTB
    });
  }

  return rows;
}

// ---------- Component ----------
export default function LLMTrainingForm({
  defaultClient = "default",
  defaultEnv = "prod",
  mode = "standalone",
  value,
  onChange
}: {
  defaultClient?: string;
  defaultEnv?: string;
  mode?: "standalone" | "embedded";
  value?: Capture | null;
  onChange?: (v: Capture) => void;
}) {
  const initial = useMemo<Capture>(() => {
    if (mode === "embedded" && value) return value;
    return DEFAULT_CAPTURE(defaultClient, defaultEnv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [capture, setCapture] = useState<Capture>(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [activeModelId, setActiveModelId] = useState<string>(
    initial.models[0]?.id || ""
  );

  function storageKey(cId = capture.clientId, env = capture.environment) {
    return `llm_training:${cId}:${env}`;
  }

  function saveToLocal(updated?: Capture) {
    const toSave = updated || capture;
    localStorage.setItem(
      storageKey(toSave.clientId, toSave.environment),
      JSON.stringify(toSave)
    );
    setMessage("Saved to localStorage.");
  }

  async function saveToServer(payload?: Capture) {
    try {
      const res = await fetch("/api/llm-training/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || capture)
      });
      if (!res.ok) throw new Error(`Save failed: ${res.statusText}`);
      setMessage("Saved to server.");
    } catch (err: any) {
      setMessage(`Server save error: ${err.message}`);
    }
  }

  function loadFromLocal() {
    const raw = localStorage.getItem(storageKey());
    if (!raw) {
      const next = DEFAULT_CAPTURE(capture.clientId, capture.environment);
      setCapture(next);
      setActiveModelId(next.models[0]?.id || "");
      setMessage("No local data; loaded default.");
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Capture;
      setCapture(parsed);
      setActiveModelId(parsed.models?.[0]?.id || "");
      setMessage("Loaded from localStorage.");
    } catch {
      const next = DEFAULT_CAPTURE(capture.clientId, capture.environment);
      setCapture(next);
      setActiveModelId(next.models[0]?.id || "");
      setMessage("Failed to parse local data; loaded default.");
    }
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(capture, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${capture.clientId}_${capture.environment}_llm-training.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSONFile(file: File) {
    const r = new FileReader();
    r.onload = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result)) as Capture;
        setCapture(parsed);
        setActiveModelId(parsed.models?.[0]?.id || "");
        setMessage("Imported JSON loaded into form.");
      } catch {
        setMessage("Invalid JSON import.");
      }
    };
    r.readAsText(file);
  }

  useEffect(() => {
    if (mode === "standalone") loadFromLocal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Embedded mode: push changes up to parent (Portfolio) on every edit.
  useEffect(() => {
    if (mode === "embedded" && onChange) onChange(capture);
  }, [capture, mode, onChange]);

  // Embedded mode: if parent value changes (switch workload/env), sync down into this form.
  useEffect(() => {
    if (mode !== "embedded") return;
    if (!value) return;

    if (value !== capture) {
      setCapture(value);
      setActiveModelId(value.models?.[0]?.id || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, mode]);

  function addModel() {
    const next: ModelEntry = {
      id: `model-${Date.now()}`,
      displayName: "New model",
      params: 1e9,
      datasetTB: 1,
      tokenCount: 0,
      epochs: 1,
      avgRunGPUhours: 10,
      runsPerMonth: 1,
      checkpointGB: 50,
      checkpointRetentionMonths: 1,
      growth: { mode: "inherit" }
    };
    const updated = { ...capture, models: [...capture.models, next] };
    setCapture(updated);
    setActiveModelId(next.id);
    if (mode === "standalone") saveToLocal(updated);
  }

  function updateModel(id: string, patch: Partial<ModelEntry>) {
    const models = capture.models.map((m) => (m.id === id ? { ...m, ...patch } : m));
    const updated = { ...capture, models };
    setCapture(updated);
    if (mode === "standalone") saveToLocal(updated);
  }

  function removeModel(id: string) {
    const models = capture.models.filter((m) => m.id !== id);
    const updated = { ...capture, models };
    setCapture(updated);
    setActiveModelId(models[0]?.id || "");
    if (mode === "standalone") saveToLocal(updated);
  }

  const activeModel = useMemo(
    () => capture.models.find((m) => m.id === activeModelId) || capture.models[0],
    [capture.models, activeModelId]
  );

  const tabs = useMemo(
    () =>
      capture.models.map((m) => ({
        id: m.id,
        label: m.displayName || "Unnamed model"
      })),
    [capture.models]
  );

  const rollups = useMemo(() => {
    return {
      conservative: computeScenarioRollup(capture, "conservative"),
      expected: computeScenarioRollup(capture, "expected"),
      aggressive: computeScenarioRollup(capture, "aggressive")
    };
  }, [capture]);

  const cpuParseHint = useMemo(() => {
    const cores =
      (capture.assumptions.cpuCoresPerNode && capture.assumptions.cpuCoresPerNode > 0
        ? capture.assumptions.cpuCoresPerNode
        : parseCpuCoresFromString(capture.assumptions.cpu_per_node)) ?? null;
    return cores
      ? `CPU cores per node: ${cores}`
      : "CPU cores per node: not set (enter CPU cores per node to show CPU totals).";
  }, [capture.assumptions.cpu_per_node, capture.assumptions.cpuCoresPerNode]);

  const pageStyle: React.CSSProperties = {
    background: "#f7f7f8",
    minHeight: "100vh",
    padding: 16,
    color: "#0f172a" // force page text readable even under dark global theme
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: 1200,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1.2fr 0.8fr",
    gap: 14,
    alignItems: "start"
  };

  return (
    <div style={pageStyle}>
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          marginBottom: 12,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start"
        }}
      >
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>
            LLM Training
          </div>
          <div style={{ color: "#475569", fontSize: 13, marginTop: 4 }}>
            Model-by-model capture with independent growth assumptions and a 3-year staging roll-up.
          </div>
        </div>

        {mode === "standalone" ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Button variant="secondary" onClick={() => saveToLocal()}>
              Save local
            </Button>
            <Button variant="primary" onClick={() => saveToServer()}>
              Save server
            </Button>
            <Button variant="secondary" onClick={exportJSON}>
              Export JSON
            </Button>
            <label style={{ display: "inline-flex", alignItems: "center" }}>
              <span style={{ display: "inline-flex" }}>
                <Button variant="secondary" type="button" style={{ cursor: "pointer" }}>
                  Import
                </Button>
              </span>
              <input
                type="file"
                accept="application/json"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importJSONFile(f);
                  // reset for same-file re-import
                  e.currentTarget.value = "";
                }}
                style={{ display: "none" }}
              />
            </label>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800, padding: "10px 12px" }}>
            Embedded in Portfolio
          </div>
        )}
      </div>

      <div style={containerStyle}>
        {/* Left column */}
        <div style={{ display: "grid", gap: 14 }}>
          <Card
            title="Operational identity"
            right={
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                {capture.clientId} / {capture.environment}
              </div>
            }
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Client ID">
                <Input
                  value={capture.clientId}
                  onChange={(e) => setCapture({ ...capture, clientId: e.target.value })}
                />
              </Field>
              <Field label="Environment">
                <Input
                  value={capture.environment}
                  onChange={(e) => setCapture({ ...capture, environment: e.target.value })}
                />
              </Field>
            </div>
          </Card>

          <Card
            title="Models"
            right={
              <div style={{ display: "flex", gap: 8 }}>
                <Button variant="secondary" onClick={addModel} style={{ padding: "8px 10px" }}>
                  + Add model
                </Button>
              </div>
            }
          >
            {tabs.length > 0 ? (
              <PillTabs items={tabs} active={activeModel?.id} onChange={(id) => setActiveModelId(id)} />
            ) : null}

            {activeModel ? (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>
                    {activeModel.displayName}
                  </div>
                  <Button
                    variant="danger"
                    onClick={() => removeModel(activeModel.id)}
                    style={{ padding: "8px 10px", fontWeight: 900 }}
                  >
                    Remove model
                  </Button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                  <Field label="Model name">
                    <Input
                      value={activeModel.displayName}
                      onChange={(e) => updateModel(activeModel.id, { displayName: e.target.value })}
                    />
                  </Field>
                  <Field label="Parameters">
                    <Input
                      type="number"
                      value={activeModel.params}
                      onChange={(e) => updateModel(activeModel.id, { params: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Dataset size (TB)">
                    <Input
                      type="number"
                      value={activeModel.datasetTB}
                      onChange={(e) => updateModel(activeModel.id, { datasetTB: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Epochs per run">
                    <Input
                      type="number"
                      value={activeModel.epochs}
                      onChange={(e) => updateModel(activeModel.id, { epochs: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Avg GPU-hours per run" help={HELP.avgRunGPUhours}>
                    <Input
                      type="number"
                      value={activeModel.avgRunGPUhours}
                      onChange={(e) => updateModel(activeModel.id, { avgRunGPUhours: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Runs per month" help={HELP.runsPerMonth}>
                    <Input
                      type="number"
                      value={activeModel.runsPerMonth}
                      onChange={(e) => updateModel(activeModel.id, { runsPerMonth: Number(e.target.value) })}
                    />
                  </Field>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                  <Field label="Checkpoint size (GB)">
                    <Input
                      type="number"
                      value={activeModel.checkpointGB || 0}
                      onChange={(e) => updateModel(activeModel.id, { checkpointGB: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Checkpoint retention (months)">
                    <Input
                      type="number"
                      value={activeModel.checkpointRetentionMonths || 1}
                      onChange={(e) =>
                        updateModel(activeModel.id, { checkpointRetentionMonths: Number(e.target.value) })
                      }
                    />
                  </Field>
                </div>

                <div style={{ marginTop: 14, borderTop: "1px solid #eee", paddingTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a" }}>
                      Growth (per model)
                    </div>
                    <Select
                      value={activeModel.growth?.mode || "inherit"}
                      onChange={(e) => {
                        const mode = e.target.value as ModelScenarioOverrides["mode"];
                        const nextGrowth: ModelScenarioOverrides =
                          mode === "inherit"
                            ? { mode: "inherit" }
                            : {
                                mode: "override",
                                conservative:
                                  activeModel.growth?.conservative || { ...capture.scenarios.conservative },
                                expected: activeModel.growth?.expected || { ...capture.scenarios.expected },
                                aggressive:
                                  activeModel.growth?.aggressive || { ...capture.scenarios.aggressive }
                              };
                        updateModel(activeModel.id, { growth: nextGrowth });
                      }}
                      style={{ maxWidth: 260 }}
                    >
                      <option value="inherit">Inherit global scenarios</option>
                      <option value="override">Override per model</option>
                    </Select>
                  </div>

                  {activeModel.growth?.mode === "override" && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 10 }}>
                      {(["conservative", "expected", "aggressive"] as const).map((k) => {
                        const v = (activeModel.growth as any)[k] as ScenarioDef;
                        return (
                          <div
                            key={k}
                            style={{
                              border: "1px solid #eee",
                              borderRadius: 12,
                              padding: 10,
                              background: "#fff"
                            }}
                          >
                            <div style={{ fontSize: 12, fontWeight: 900, textTransform: "capitalize", color: "#0f172a" }}>
                              {k}
                            </div>
                            <div style={{ marginTop: 8 }}>
                              <Field label="Activity CAGR" help={HELP.s_activity}>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={v?.cagr_activity ?? 0}
                                  onChange={(e) => {
                                    const g = activeModel.growth || ({ mode: "override" } as ModelScenarioOverrides);
                                    const next = {
                                      ...g,
                                      mode: "override" as const,
                                      [k]: {
                                        ...(g as any)[k],
                                        cagr_activity: Number(e.target.value)
                                      }
                                    };
                                    updateModel(activeModel.id, { growth: next });
                                  }}
                                />
                              </Field>
                            </div>
                            <div style={{ marginTop: 8 }}>
                              <Field label="Complexity CAGR" help={HELP.s_complexity}>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={v?.cagr_complexity ?? 0}
                                  onChange={(e) => {
                                    const g = activeModel.growth || ({ mode: "override" } as ModelScenarioOverrides);
                                    const next = {
                                      ...g,
                                      mode: "override" as const,
                                      [k]: {
                                        ...(g as any)[k],
                                        cagr_complexity: Number(e.target.value)
                                      }
                                    };
                                    updateModel(activeModel.id, { growth: next });
                                  }}
                                />
                              </Field>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ color: "#64748b", fontWeight: 700 }}>No models yet.</div>
            )}
          </Card>

          <Card title="Staging roll-up (3-year)">
            {(["conservative", "expected", "aggressive"] as const).map((k) => (
              <div key={k} style={{ marginBottom: 14 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 900,
                    textTransform: "capitalize",
                    color: "#0f172a",
                    marginBottom: 8
                  }}
                >
                  {k}
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      {["Year", "Annual GPU-hours", "Nodes", "GPUs", "CPU cores", "Memory (TB)"].map((h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: "left",
                            borderBottom: "1px solid #eee",
                            padding: "8px 6px",
                            color: "#334155",
                            fontWeight: 900
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rollups[k].map((r) => (
                      <tr key={r.year}>
                        <td style={{ padding: "8px 6px", borderBottom: "1px solid #f2f2f2" }}>{r.year}</td>
                        <td style={{ padding: "8px 6px", borderBottom: "1px solid #f2f2f2" }}>{r.annualGPUHours}</td>
                        <td style={{ padding: "8px 6px", borderBottom: "1px solid #f2f2f2" }}>{r.nodes}</td>
                        <td style={{ padding: "8px 6px", borderBottom: "1px solid #f2f2f2" }}>{r.gpus}</td>
                        <td style={{ padding: "8px 6px", borderBottom: "1px solid #f2f2f2" }}>{r.cpuCores ?? "—"}</td>
                        <td style={{ padding: "8px 6px", borderBottom: "1px solid #f2f2f2" }}>{r.memoryTB ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </Card>
        </div>

        {/* Right column */}
        <div style={{ display: "grid", gap: 14 }}>
          <Card title="Capacity translation assumptions">
            <div style={{ display: "grid", gap: 12 }}>
              <Field label="Target utilization" help={HELP.utilization}>
                <Input
                  type="number"
                  step="0.01"
                  value={capture.assumptions.target_utilization}
                  onChange={(e) =>
                    setCapture({
                      ...capture,
                      assumptions: { ...capture.assumptions, target_utilization: Number(e.target.value) }
                    })
                  }
                />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="GPUs per node">
                  <Input
                    type="number"
                    value={capture.assumptions.gpu_per_node}
                    onChange={(e) =>
                      setCapture({
                        ...capture,
                        assumptions: { ...capture.assumptions, gpu_per_node: Number(e.target.value) }
                      })
                    }
                  />
                </Field>
                <Field label="Hours per node per year">
                  <Input
                    type="number"
                    value={capture.assumptions.hours_per_node_per_year}
                    onChange={(e) =>
                      setCapture({
                        ...capture,
                        assumptions: { ...capture.assumptions, hours_per_node_per_year: Number(e.target.value) }
                      })
                    }
                  />
                </Field>
              </div>

              <Field label="CPU per node" help={HELP.cpuParse}>
                <Input
                  value={capture.assumptions.cpu_per_node || ""}
                  onChange={(e) =>
                    setCapture({
                      ...capture,
                      assumptions: { ...capture.assumptions, cpu_per_node: e.target.value }
                    })
                  }
                />
              </Field>

              <Field label="CPU cores per node (explicit override)">
                <Input
                  type="number"
                  value={capture.assumptions.cpuCoresPerNode || 0}
                  onChange={(e) =>
                    setCapture({
                      ...capture,
                      assumptions: {
                        ...capture.assumptions,
                        cpuCoresPerNode: Number(e.target.value) || undefined
                      }
                    })
                  }
                />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="RAM per node (GB)">
                  <Input
                    type="number"
                    value={capture.assumptions.ramGB_per_node || 0}
                    onChange={(e) =>
                      setCapture({
                        ...capture,
                        assumptions: { ...capture.assumptions, ramGB_per_node: Number(e.target.value) }
                      })
                    }
                  />
                </Field>
                <Field label="Network per node (Gbps)">
                  <Input
                    type="number"
                    value={capture.assumptions.networkGbps_per_node || 0}
                    onChange={(e) =>
                      setCapture({
                        ...capture,
                        assumptions: { ...capture.assumptions, networkGbps_per_node: Number(e.target.value) }
                      })
                    }
                  />
                </Field>
              </div>

              <div style={{ fontSize: 12, color: "#64748b", paddingLeft: 2, fontWeight: 700 }}>
                {cpuParseHint}
              </div>
            </div>
          </Card>

          <Card title="Global scenario defaults">
            <div style={{ display: "grid", gap: 10 }}>
              {(["conservative", "expected", "aggressive"] as const).map((k) => (
                <div
                  key={k}
                  style={{
                    border: "1px solid #eee",
                    borderRadius: 12,
                    padding: 10,
                    background: "#fff"
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 900, textTransform: "capitalize", color: "#0f172a" }}>
                    {k}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                    <Field label="Activity CAGR" help={HELP.s_activity}>
                      <Input
                        type="number"
                        step="0.01"
                        value={capture.scenarios[k].cagr_activity}
                        onChange={(e) =>
                          setCapture({
                            ...capture,
                            scenarios: {
                              ...capture.scenarios,
                              [k]: { ...capture.scenarios[k], cagr_activity: Number(e.target.value) }
                            }
                          })
                        }
                      />
                    </Field>
                    <Field label="Complexity CAGR" help={HELP.s_complexity}>
                      <Input
                        type="number"
                        step="0.01"
                        value={capture.scenarios[k].cagr_complexity}
                        onChange={(e) =>
                          setCapture({
                            ...capture,
                            scenarios: {
                              ...capture.scenarios,
                              [k]: { ...capture.scenarios[k], cagr_complexity: Number(e.target.value) }
                            }
                          })
                        }
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {message && (
            <div style={{ fontSize: 13, color: "#1d4ed8", paddingLeft: 2, fontWeight: 800 }}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}