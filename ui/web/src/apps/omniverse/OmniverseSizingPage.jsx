// File: src/apps/omniverse/OmniverseSizingPage.jsx
import React, { useMemo, useState, useEffect } from "react";

/**
 * Omniverse Sizing Page (Managed Data) — INLINE LIGHT UI (NO TAILWIND)
 *
 * Goal: match the "light form panels with thin borders" style in your screenshot:
 * - white cards/panels
 * - light grey borders
 * - black text
 * - subtle grey helper text
 * - active pill button is dark; inactive is white
 */

const STORAGE_KEY = "omniverse_catalog_v1";

// ---------------------------
// Default managed dataset
// ---------------------------
const DEFAULT_CATALOG = {
  version: "1.0",
  updatedAt: new Date().toISOString(),
  providers: [
    { id: "GENERIC", name: "Generic (Baseline)" },
    { id: "DELL", name: "Dell (Placeholder)" },
    { id: "HPE", name: "HPE (Placeholder)" },
    { id: "NVIDIA", name: "NVIDIA (Platform)" },
  ],
  useCases: [
    {
      id: "COLLAB_DESIGN",
      name: "Collaborative Design & Visualization",
      description:
        "Multi-user review sessions with RTX rendering and shared USD scene collaboration.",
      base: {
        gpuPerSession: 1,
        vramGB: 24,
        cpuCores: 16,
        ramGB: 64,
        localNVMeTB: 2,
        sharedIOPSTB: 2,
        objectStorageTB: 10,
        networkGbps: 2,
      },
      tags: ["RTX", "Nucleus", "Interactive"],
    },
    {
      id: "INDUSTRIAL_TWIN",
      name: "Industrial Digital Twin",
      description:
        "Factory/facility twins with higher scene complexity and mixed interactive + batch workflows.",
      base: {
        gpuPerSession: 2,
        vramGB: 48,
        cpuCores: 32,
        ramGB: 128,
        localNVMeTB: 4,
        sharedIOPSTB: 4,
        objectStorageTB: 30,
        networkGbps: 5,
      },
      tags: ["USD", "RTX", "Hybrid"],
    },
    {
      id: "ISAAC_SIM",
      name: "Robotics Simulation (Isaac Sim)",
      description:
        "Agent-based simulation with physics and sensors; concurrency driven by robot/agent count.",
      base: {
        gpuPerSession: 1,
        vramGB: 24,
        cpuCores: 24,
        ramGB: 96,
        localNVMeTB: 2,
        sharedIOPSTB: 3,
        objectStorageTB: 15,
        networkGbps: 3,
      },
      tags: ["PhysX", "Sensors", "Simulation"],
    },
    {
      id: "DRIVE_SIM",
      name: "Autonomous Vehicle Simulation (Drive Sim)",
      description:
        "High-fidelity driving scenes, sensors, and scenario generation with heavy GPU+storage IO.",
      base: {
        gpuPerSession: 4,
        vramGB: 80,
        cpuCores: 48,
        ramGB: 256,
        localNVMeTB: 8,
        sharedIOPSTB: 8,
        objectStorageTB: 60,
        networkGbps: 10,
      },
      tags: ["Sensors", "Scenario", "Simulation"],
    },
    {
      id: "SYNTHETIC_DATA",
      name: "Synthetic Data Generation",
      description:
        "Batch generation of labeled images/video; throughput and storage driven.",
      base: {
        gpuPerSession: 4,
        vramGB: 48,
        cpuCores: 32,
        ramGB: 128,
        localNVMeTB: 4,
        sharedIOPSTB: 4,
        objectStorageTB: 120,
        networkGbps: 8,
      },
      tags: ["Batch", "Storage-heavy"],
    },
    {
      id: "REALTIME_RTX",
      name: "Real-Time RTX Rendering (Remote Visualization)",
      description:
        "Remote visualization sessions (VDI-like) with strict latency and bandwidth expectations.",
      base: {
        gpuPerSession: 1,
        vramGB: 16,
        cpuCores: 12,
        ramGB: 48,
        localNVMeTB: 1,
        sharedIOPSTB: 1,
        objectStorageTB: 5,
        networkGbps: 3,
      },
      tags: ["Interactive", "Remote Viz"],
    },
  ],
  multipliers: {
    sceneComplexity: [
      { id: "LOW", name: "Low (Concept)", factor: 0.7 },
      { id: "MED", name: "Medium (Production)", factor: 1.0 },
      { id: "HIGH", name: "High (City/Factory scale)", factor: 1.6 },
    ],
    physicsFidelity: [
      { id: "NONE", name: "None / Visual-only", factor: 0.85 },
      { id: "APPROX", name: "Approximate", factor: 1.0 },
      { id: "HIGH", name: "High-fidelity / deterministic", factor: 1.35 },
    ],
    renderingMode: [
      { id: "RASTER", name: "Rasterized", factor: 0.75 },
      { id: "RTX", name: "RTX real-time", factor: 1.0 },
      { id: "PATH", name: "Path-traced (offline/review)", factor: 1.5 },
    ],
    sessionType: [
      { id: "INTERACTIVE", name: "Interactive (latency-sensitive)", factor: 1.0 },
      { id: "HYBRID", name: "Hybrid", factor: 1.1 },
      { id: "BATCH", name: "Batch / offline", factor: 1.25 },
    ],
  },
  referenceArchitectures: [
    {
      id: "RA_GENERIC_ENTRY",
      providerId: "GENERIC",
      name: "Entry Omniverse Pod",
      notes: "Baseline small pod. Tune per provider.",
      limits: { maxConcurrentSessions: 10, maxAgents: 25 },
      infra: {
        nodes: 4,
        gpusPerNode: 2,
        gpuClass: "RTX / L40S class",
        cpuCoresPerNode: 64,
        ramGBPerNode: 512,
        localNVMeTBPerNode: 7.68,
        sharedStorageTier: "NVMe-oF / high-IOPS",
        networkFabric: "25–100GbE",
      },
      fitFor: ["COLLAB_DESIGN", "REALTIME_RTX", "ISAAC_SIM"],
    },
    {
      id: "RA_GENERIC_SCALE",
      providerId: "GENERIC",
      name: "Scale Digital Twin Cluster",
      notes: "Balanced for industrial twins + higher concurrency.",
      limits: { maxConcurrentSessions: 50, maxAgents: 200 },
      infra: {
        nodes: 16,
        gpusPerNode: 4,
        gpuClass: "L40S / A100 / H100 class",
        cpuCoresPerNode: 96,
        ramGBPerNode: 768,
        localNVMeTBPerNode: 7.68,
        sharedStorageTier: "High-IOPS + Object storage",
        networkFabric: "100GbE",
      },
      fitFor: ["INDUSTRIAL_TWIN", "SYNTHETIC_DATA", "ISAAC_SIM"],
    },
  ],
};

// ---------------------------
// Helpers
// ---------------------------
function safeJsonParse(text) {
  try {
    const v = JSON.parse(text);
    return { ok: true, value: v };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

function round2(n) {
  if (!isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function fmtNum(n) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
    isFinite(n) ? n : 0
  );
}

function clampInt(v, min, max) {
  const n = Number(v);
  if (!isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

// ---------------------------
// Light UI style tokens
// ---------------------------
const UI = {
  page: {
    display: "grid",
    gap: 14,
    color: "#111",
    fontSize: 13,
  },
  panel: {
    background: "#fff",
    border: "1px solid #d6d6d6",
    borderRadius: 10,
    padding: 14,
  },
  panelTitle: { margin: 0, fontSize: 14, fontWeight: 800 },
  subtitle: { marginTop: 6, fontSize: 12, color: "#555" },

  tabsRow: { display: "flex", gap: 10, alignItems: "center" },
  tabBtnActive: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid #111",
    background: "#111",
    color: "#fff",
    fontWeight: 750,
    cursor: "pointer",
  },
  tabBtn: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid #d6d6d6",
    background: "#fff",
    color: "#111",
    fontWeight: 750,
    cursor: "pointer",
  },

  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  // main layout: 2 columns (left wider)
  main: { display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 },
  stack: { display: "grid", gap: 12 },

  label: { display: "block" },
  labelTitle: { fontSize: 12, fontWeight: 700, color: "#111" },
  help: { marginTop: 4, fontSize: 11, color: "#666" },

  input: {
    width: "100%",
    marginTop: 6,
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #bdbdbd",
    background: "#fff",
    color: "#111",
    outline: "none",
  },
  select: {
    width: "100%",
    marginTop: 6,
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #bdbdbd",
    background: "#fff",
    color: "#111",
    outline: "none",
  },

  inset: {
    marginTop: 10,
    border: "1px solid #d6d6d6",
    borderRadius: 10,
    padding: 10,
    background: "#fafafa",
  },

  pillRow: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 },
  pill: {
    fontSize: 11,
    padding: "3px 8px",
    borderRadius: 999,
    border: "1px solid #d6d6d6",
    background: "#fff",
    color: "#444",
  },

  sectionHeader: { margin: 0, fontSize: 13, fontWeight: 800 },

  statGrid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  statBox: {
    border: "1px solid #d6d6d6",
    borderRadius: 10,
    padding: 10,
    background: "#fff",
  },
  statLabel: { fontSize: 11, color: "#555" },
  statValue: { marginTop: 6, fontSize: 14, fontWeight: 800, color: "#111" },
  statSub: { marginTop: 4, fontSize: 11, color: "#666" },

  divider: { height: 1, background: "#e6e6e6", margin: "10px 0" },

  raCard: {
    border: "1px solid #d6d6d6",
    borderRadius: 10,
    padding: 10,
    background: "#fff",
  },
  raName: { fontWeight: 800, marginBottom: 4 },
  raNotes: { fontSize: 11, color: "#666" },

  textarea: {
    minHeight: 520,
    width: "100%",
    borderRadius: 10,
    border: "1px solid #bdbdbd",
    background: "#fff",
    padding: 10,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: 12,
    color: "#111",
    outline: "none",
  },

  error: {
    padding: 10,
    borderRadius: 10,
    border: "1px solid #f0b4b4",
    background: "#fff2f2",
    color: "#7a1f1f",
    fontSize: 12,
  },

  actionRow: { display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" },
  actionBtn: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid #d6d6d6",
    background: "#fff",
    color: "#111",
    fontWeight: 700,
    cursor: "pointer",
  },
  actionBtnPrimary: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid #111",
    background: "#111",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
};

// ---------------------------
// Small UI components
// ---------------------------
function Stat({ label, value, sub }) {
  return (
    <div style={UI.statBox}>
      <div style={UI.statLabel}>{label}</div>
      <div style={UI.statValue}>{value}</div>
      {sub ? <div style={UI.statSub}>{sub}</div> : null}
    </div>
  );
}

// ---------------------------
// Main Page
// ---------------------------
export default function OmniverseSizingPage() {
  const [catalog, setCatalog] = useState(DEFAULT_CATALOG);
  const [activeTab, setActiveTab] = useState("CONFIG"); // CONFIG | DATA

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = safeJsonParse(raw);
    if (parsed.ok && parsed.value?.useCases && parsed.value?.multipliers) {
      setCatalog(parsed.value);
    }
  }, []);

  const persistCatalog = (next) => {
    const updated = { ...next, updatedAt: new Date().toISOString() };
    setCatalog(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated, null, 2));
  };

  // Config state
  const [providerId, setProviderId] = useState("GENERIC");
  const [useCaseId, setUseCaseId] = useState("COLLAB_DESIGN");

  const [sceneComplexityId, setSceneComplexityId] = useState("MED");
  const [physicsFidelityId, setPhysicsFidelityId] = useState("APPROX");
  const [renderingModeId, setRenderingModeId] = useState("RTX");
  const [sessionTypeId, setSessionTypeId] = useState("INTERACTIVE");

  const [concurrentSessions, setConcurrentSessions] = useState(10);
  const [simulatedAgents, setSimulatedAgents] = useState(0);
  const [burstFactorPct, setBurstFactorPct] = useState(25);

  // Lookups
  const provider = useMemo(
    () =>
      catalog.providers.find((p) => p.id === providerId) || catalog.providers[0],
    [catalog, providerId]
  );

  const useCase = useMemo(
    () => catalog.useCases.find((u) => u.id === useCaseId) || catalog.useCases[0],
    [catalog, useCaseId]
  );

  const mScene =
    catalog.multipliers.sceneComplexity.find((m) => m.id === sceneComplexityId) ||
    catalog.multipliers.sceneComplexity[0];
  const mPhys =
    catalog.multipliers.physicsFidelity.find((m) => m.id === physicsFidelityId) ||
    catalog.multipliers.physicsFidelity[0];
  const mRender =
    catalog.multipliers.renderingMode.find((m) => m.id === renderingModeId) ||
    catalog.multipliers.renderingMode[0];
  const mSession =
    catalog.multipliers.sessionType.find((m) => m.id === sessionTypeId) ||
    catalog.multipliers.sessionType[0];

  // Sizing computation
  const sizing = useMemo(() => {
    const base = useCase?.base || {};
    const factor =
      (mScene?.factor || 1) *
      (mPhys?.factor || 1) *
      (mRender?.factor || 1) *
      (mSession?.factor || 1);

    const s = clampInt(concurrentSessions, 1, 100000);
    const agents = clampInt(simulatedAgents, 0, 100000);
    const agentFactor = agents > 0 ? 1 + Math.min(2.0, agents / 200) : 1;

    const gpu = round2((base.gpuPerSession || 0) * s * factor);
    const vram = round2((base.vramGB || 0) * factor);
    const cpuCores = round2((base.cpuCores || 0) * s * factor * agentFactor);
    const ramGB = round2((base.ramGB || 0) * s * factor * agentFactor);

    const localNVMeTB = round2((base.localNVMeTB || 0) * Math.max(1, s / 10) * factor);
    const sharedIOPSTB = round2((base.sharedIOPSTB || 0) * Math.max(1, s / 10) * factor);
    const objectStorageTB = round2((base.objectStorageTB || 0) * Math.max(1, s / 10));
    const networkGbps = round2((base.networkGbps || 0) * Math.max(1, s / 10) * factor);

    const burst = 1 + clampInt(burstFactorPct, 0, 300) / 100;

    return {
      factor: round2(factor),
      agentFactor: round2(agentFactor),
      steady: { gpu, cpuCores, ramGB, localNVMeTB, sharedIOPSTB, objectStorageTB, networkGbps },
      peak: {
        gpu: round2(gpu * burst),
        cpuCores: round2(cpuCores * burst),
        ramGB: round2(ramGB * burst),
        localNVMeTB,
        sharedIOPSTB,
        objectStorageTB,
        networkGbps: round2(networkGbps * burst),
      },
      indicators: { vramPerSessionGB: vram },
    };
  }, [
    useCase,
    mScene,
    mPhys,
    mRender,
    mSession,
    concurrentSessions,
    simulatedAgents,
    burstFactorPct,
  ]);

  const matchingRAs = useMemo(() => {
    const all = catalog.referenceArchitectures || [];
    return all
      .filter((ra) => ra.providerId === providerId)
      .filter((ra) => (ra.fitFor || []).includes(useCaseId));
  }, [catalog, providerId, useCaseId]);

  // Data manager
  const [editorText, setEditorText] = useState(() => JSON.stringify(DEFAULT_CATALOG, null, 2));
  const [editorError, setEditorError] = useState("");

  useEffect(() => {
    if (activeTab === "DATA") {
      setEditorText(JSON.stringify(catalog, null, 2));
      setEditorError("");
    }
  }, [activeTab, catalog]);

  const applyEditor = () => {
    const parsed = safeJsonParse(editorText);
    if (!parsed.ok) {
      setEditorError(parsed.error);
      return;
    }
    const next = parsed.value;

    if (!next?.useCases || !Array.isArray(next.useCases) || next.useCases.length === 0) {
      setEditorError("Invalid catalog: useCases must be a non-empty array.");
      return;
    }
    if (!next?.multipliers?.sceneComplexity || !next?.multipliers?.renderingMode) {
      setEditorError("Invalid catalog: multipliers are missing required sections.");
      return;
    }
    if (!next?.providers || !Array.isArray(next.providers) || next.providers.length === 0) {
      setEditorError("Invalid catalog: providers must be a non-empty array.");
      return;
    }
    if (!next?.referenceArchitectures || !Array.isArray(next.referenceArchitectures)) {
      setEditorError("Invalid catalog: referenceArchitectures must be an array (can be empty).");
      return;
    }

    persistCatalog(next);
    setEditorError("");
  };

  const resetToDefault = () => persistCatalog(DEFAULT_CATALOG);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(catalog, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `omniverse-catalog-${catalog.version || "v1"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={UI.page}>
      {/* Header */}
      <div style={UI.panel}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>Omniverse Sizing & Options</h2>
            <div style={UI.subtitle}>
              Data-driven Omniverse use-cases → infrastructure sizing + vendor reference architecture mapping.
            </div>
          </div>

          <div style={UI.tabsRow}>
            <button
              type="button"
              onClick={() => setActiveTab("CONFIG")}
              style={activeTab === "CONFIG" ? UI.tabBtnActive : UI.tabBtn}
            >
              Configurator
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("DATA")}
              style={activeTab === "DATA" ? UI.tabBtnActive : UI.tabBtn}
            >
              Data Manager
            </button>
          </div>
        </div>
      </div>

      {activeTab === "CONFIG" ? (
        <div style={UI.main}>
          {/* Left column */}
          <div style={UI.stack}>
            {/* 1 */}
            <div style={UI.panel}>
              <h3 style={UI.sectionHeader}>1) Select Omniverse Use Case</h3>

              <div style={{ ...UI.grid2, marginTop: 10 }}>
                <label style={UI.label}>
                  <div style={UI.labelTitle}>Provider dataset</div>
                  <select value={providerId} onChange={(e) => setProviderId(e.target.value)} style={UI.select}>
                    {(catalog.providers || []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <div style={UI.help}>Select whose RA dataset you want to bind to.</div>
                </label>

                <label style={UI.label}>
                  <div style={UI.labelTitle}>Use case</div>
                  <select value={useCaseId} onChange={(e) => setUseCaseId(e.target.value)} style={UI.select}>
                    {(catalog.useCases || []).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                  <div style={UI.help}>This drives the baseline resource footprint.</div>
                </label>
              </div>

              <div style={UI.inset}>
                <div style={{ fontSize: 12, color: "#444" }}>{useCase?.description}</div>
                <div style={UI.pillRow}>
                  {(useCase?.tags || []).map((t) => (
                    <span key={t} style={UI.pill}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 2 */}
            <div style={UI.panel}>
              <h3 style={UI.sectionHeader}>2) Fidelity & Complexity</h3>

              <div style={{ ...UI.grid2, marginTop: 10 }}>
                <label style={UI.label}>
                  <div style={UI.labelTitle}>Scene complexity</div>
                  <select value={sceneComplexityId} onChange={(e) => setSceneComplexityId(e.target.value)} style={UI.select}>
                    {catalog.multipliers.sceneComplexity.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} (×{m.factor})
                      </option>
                    ))}
                  </select>
                </label>

                <label style={UI.label}>
                  <div style={UI.labelTitle}>Physics fidelity</div>
                  <select value={physicsFidelityId} onChange={(e) => setPhysicsFidelityId(e.target.value)} style={UI.select}>
                    {catalog.multipliers.physicsFidelity.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} (×{m.factor})
                      </option>
                    ))}
                  </select>
                </label>

                <label style={UI.label}>
                  <div style={UI.labelTitle}>Rendering mode</div>
                  <select value={renderingModeId} onChange={(e) => setRenderingModeId(e.target.value)} style={UI.select}>
                    {catalog.multipliers.renderingMode.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} (×{m.factor})
                      </option>
                    ))}
                  </select>
                </label>

                <label style={UI.label}>
                  <div style={UI.labelTitle}>Session type</div>
                  <select value={sessionTypeId} onChange={(e) => setSessionTypeId(e.target.value)} style={UI.select}>
                    {catalog.multipliers.sessionType.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} (×{m.factor})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {/* 3 */}
            <div style={UI.panel}>
              <h3 style={UI.sectionHeader}>3) Scale & Concurrency</h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 10 }}>
                <label style={UI.label}>
                  <div style={UI.labelTitle}>Concurrent sessions</div>
                  <input
                    type="number"
                    value={concurrentSessions}
                    onChange={(e) => setConcurrentSessions(clampInt(e.target.value, 1, 100000))}
                    min={1}
                    style={UI.input}
                  />
                  <div style={UI.help}>Users / viewports / interactive sessions.</div>
                </label>

                <label style={UI.label}>
                  <div style={UI.labelTitle}>Simulated agents</div>
                  <input
                    type="number"
                    value={simulatedAgents}
                    onChange={(e) => setSimulatedAgents(clampInt(e.target.value, 0, 100000))}
                    min={0}
                    style={UI.input}
                  />
                  <div style={UI.help}>Robots/vehicles; 0 if not applicable.</div>
                </label>

                <label style={UI.label}>
                  <div style={UI.labelTitle}>Peak uplift (%)</div>
                  <input
                    type="number"
                    value={burstFactorPct}
                    onChange={(e) => setBurstFactorPct(clampInt(e.target.value, 0, 300))}
                    min={0}
                    max={300}
                    style={UI.input}
                  />
                  <div style={UI.help}>Burst envelope above steady-state.</div>
                </label>
              </div>

              <div style={UI.divider} />

              <div style={UI.grid2}>
                <div style={UI.statBox}>
                  <div style={UI.statLabel}>Composite factor</div>
                  <div style={UI.statValue}>
                    ×{fmtNum(sizing.factor)}{" "}
                    <span style={{ fontWeight: 600, color: "#666", fontSize: 12 }}>
                      (agents ×{fmtNum(sizing.agentFactor)})
                    </span>
                  </div>
                </div>

                <div style={UI.statBox}>
                  <div style={UI.statLabel}>VRAM indicator</div>
                  <div style={UI.statValue}>
                    {fmtNum(sizing.indicators.vramPerSessionGB)} GB{" "}
                    <span style={{ fontWeight: 600, color: "#666", fontSize: 12 }}>
                      per session (approx)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4 */}
            <div style={UI.panel}>
              <h3 style={UI.sectionHeader}>4) Reference Architectures (Dataset-bound)</h3>

              {providerId !== "GENERIC" ? (
                <div style={{ ...UI.help, marginTop: 6 }}>
                  Showing RAs for: <b>{provider?.name}</b>
                </div>
              ) : null}

              <div style={{ marginTop: 10 }}>
                {matchingRAs.length === 0 ? (
                  <div style={{ ...UI.inset, background: "#fff" }}>
                    <div style={{ fontSize: 12, color: "#555" }}>
                      No matching RAs in the selected provider dataset for this use case.
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, color: "#555" }}>
                      Go to <b>Data Manager</b> and add RAs under <b>referenceArchitectures</b>.
                    </div>
                  </div>
                ) : (
                  <div style={UI.grid2}>
                    {matchingRAs.map((ra) => (
                      <div key={ra.id} style={UI.raCard}>
                        <div style={UI.raName}>{ra.name}</div>
                        <div style={UI.raNotes}>{ra.notes}</div>

                        <div style={{ ...UI.inset, marginTop: 10 }}>
                          <div style={{ fontSize: 11, color: "#666", fontWeight: 700 }}>Infra</div>
                          <div style={{ marginTop: 6, fontSize: 12, color: "#333" }}>
                            {ra.infra.nodes} nodes · {ra.infra.gpusPerNode} GPU/node · {ra.infra.gpuClass}
                          </div>
                          <div style={{ fontSize: 12, color: "#333" }}>
                            {ra.infra.cpuCoresPerNode} cores/node · {ra.infra.ramGBPerNode} GB RAM/node
                          </div>
                          <div style={{ fontSize: 12, color: "#333" }}>
                            Storage: {ra.infra.sharedStorageTier} · Fabric: {ra.infra.networkFabric}
                          </div>
                        </div>

                        <div style={{ ...UI.inset, marginTop: 10 }}>
                          <div style={{ fontSize: 11, color: "#666", fontWeight: 700 }}>Limits</div>
                          <div style={{ marginTop: 6, fontSize: 12, color: "#333" }}>
                            ≤ {ra.limits.maxConcurrentSessions} sessions · ≤ {ra.limits.maxAgents} agents
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div style={UI.stack}>
            <div style={UI.panel}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                <h3 style={UI.sectionHeader}>Sizing Outputs</h3>
                <div style={{ fontSize: 11, color: "#666" }}>
                  Dataset: {catalog.version} · {new Date(catalog.updatedAt).toLocaleDateString()}
                </div>
              </div>

              <div style={{ marginTop: 10, fontSize: 11, color: "#666", fontWeight: 700 }}>Steady-state</div>
              <div style={{ ...UI.statGrid2, marginTop: 8 }}>
                <Stat label="GPUs" value={fmtNum(sizing.steady.gpu)} />
                <Stat label="CPU cores" value={fmtNum(sizing.steady.cpuCores)} />
                <Stat label="RAM (GB)" value={fmtNum(sizing.steady.ramGB)} />
                <Stat label="Network (Gbps)" value={fmtNum(sizing.steady.networkGbps)} />
                <Stat label="Local NVMe (TB)" value={fmtNum(sizing.steady.localNVMeTB)} sub="Approx working/cache tier" />
                <Stat label="Shared IOPS tier (TB)" value={fmtNum(sizing.steady.sharedIOPSTB)} sub="High-IOPS for USD/Nucleus workloads" />
                <Stat label="Object storage (TB)" value={fmtNum(sizing.steady.objectStorageTB)} sub="Assets, versions, synthetic data outputs" />
              </div>

              <div style={UI.divider} />

              <div style={{ marginTop: 2, fontSize: 11, color: "#666", fontWeight: 700 }}>Peak envelope</div>
              <div style={{ ...UI.statGrid2, marginTop: 8 }}>
                <Stat label="Peak GPUs" value={fmtNum(sizing.peak.gpu)} sub={`Includes +${burstFactorPct}% uplift`} />
                <Stat label="Peak CPU cores" value={fmtNum(sizing.peak.cpuCores)} />
                <Stat label="Peak RAM (GB)" value={fmtNum(sizing.peak.ramGB)} />
                <Stat label="Peak Network (Gbps)" value={fmtNum(sizing.peak.networkGbps)} />
              </div>

              <div style={{ ...UI.inset, marginTop: 10 }}>
                <div style={{ fontSize: 11, color: "#666", fontWeight: 700 }}>Notes</div>
                <div style={{ marginTop: 6, fontSize: 12, color: "#333" }}>
                  This is a transparent, data-driven translation model. Tune baselines and multipliers in{" "}
                  <b>Data Manager</b> to align with validated provider RAs.
                </div>
              </div>
            </div>

            <div style={UI.panel}>
              <h3 style={UI.sectionHeader}>Off-take Units (Omniverse-native)</h3>
              <div style={{ ...UI.inset, marginTop: 10, background: "#fff" }}>
                <div style={{ fontSize: 11, color: "#666", fontWeight: 700 }}>
                  Suggested billing / planning units
                </div>
                <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: 12, color: "#333" }}>
                  <li>GPU-hours per concurrent RTX session</li>
                  <li>Simulation-hours per agent (robot/vehicle)</li>
                  <li>Active USD working-set TB (high-IOPS tier)</li>
                  <li>Object storage TB-month for assets & outputs</li>
                  <li>Network Gbps sustained (remote viz / collaboration)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // DATA MANAGER
        <div style={UI.main}>
          <div style={UI.panel}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <h3 style={UI.sectionHeader}>Managed Dataset Editor</h3>
              <div style={UI.actionRow}>
                <button type="button" style={UI.actionBtn} onClick={exportJson}>
                  Export JSON
                </button>
                <button type="button" style={UI.actionBtn} onClick={resetToDefault}>
                  Reset to Default
                </button>
                <button type="button" style={UI.actionBtnPrimary} onClick={applyEditor}>
                  Apply
                </button>
              </div>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {editorError ? <div style={UI.error}>{editorError}</div> : null}

              <textarea value={editorText} onChange={(e) => setEditorText(e.target.value)} style={UI.textarea} />

              <div style={{ fontSize: 11, color: "#666" }}>
                Stored in localStorage key: <b>{STORAGE_KEY}</b>
              </div>
            </div>
          </div>

          <div style={UI.stack}>
            <div style={UI.panel}>
              <h3 style={UI.sectionHeader}>How to manage provider datasets</h3>
              <div style={{ marginTop: 8, fontSize: 12, color: "#333" }}>
                To maintain separate datasets per provider (e.g., Dell vs HPE), you can:
                <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                  <li>Keep multiple JSON files externally and import/export as required.</li>
                  <li>Or duplicate this component’s storage key per provider (if you want strict separation).</li>
                  <li>
                    Use <b>referenceArchitectures[].providerId</b> to bind RAs.
                  </li>
                </ul>
              </div>
            </div>

            <div style={UI.panel}>
              <h3 style={UI.sectionHeader}>Validation expectations</h3>
              <div style={{ marginTop: 8, fontSize: 12, color: "#333" }}>
                Minimum required sections:
                <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                  <li>providers[]</li>
                  <li>useCases[] with base sizing fields</li>
                  <li>multipliers.sceneComplexity / physicsFidelity / renderingMode / sessionType</li>
                  <li>referenceArchitectures[] (can be empty)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}