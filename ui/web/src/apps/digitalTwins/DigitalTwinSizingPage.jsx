// File: src/apps/digitalTwins/DigitalTwinSizingPage.jsx
import React, { useMemo, useState } from "react";

/**
 * Digital Twins sizing (no Tailwind)
 * - Dark theme to match host app
 * - Layout matches the reference: left list + rollup KPI tiles + editor + derived KPI tiles
 * - Includes small polish: gradients, focus glow, responsive stacking, no label overlap
 */

export const DT_LS_KEY = "sovereign_ai_digital_twins_v1";

function uid(prefix = "dt") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function clampNum(v, min = 0, max = Number.POSITIVE_INFINITY) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

function fmt(n, digits = 0) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function loadAll() {
  try {
    const raw = localStorage.getItem(DT_LS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(rows) {
  localStorage.setItem(DT_LS_KEY, JSON.stringify(rows));
}

const TWIN_TYPES = ["Facility", "Network", "Fleet", "Process", "Other"];
const UPDATE_RATE = [
  { id: "batch", label: "Batch (hourly)", hz: 1 / 3600 },
  { id: "5min", label: "5 min", hz: 1 / 300 },
  { id: "1min", label: "1 min", hz: 1 / 60 },
  { id: "realtime", label: "Real-time (1 Hz)", hz: 1 },
];

function makeDefaultTwin(name = "Digital Twin 1") {
  return {
    id: uid("twin"),
    name,
    twinType: "Facility",
    assets: 50000,
    telemetryKBPerUpdate: 2.0,
    updateRate: "realtime",
    retentionDays: 365,
    compressionRatio: 3.0,
    concurrentUsers: 50,
    queriesPerSecond: 20,
    utilizationPct: 70,
    notes: "",
  };
}

function deriveSizing(w) {
  const assets = clampNum(w.assets, 0);
  const kb = clampNum(w.telemetryKBPerUpdate, 0);

  const rate = UPDATE_RATE.find((r) => r.id === w.updateRate) || UPDATE_RATE[3];
  const hz = rate.hz;

  const secondsPerMonth = 3600 * 24 * 30.4;
  const utilizedSeconds = secondsPerMonth * (clampNum(w.utilizationPct, 0, 100) / 100);

  // Ingest
  const kbPerSec = assets * kb * hz;
  const mbPerSec = kbPerSec / 1024;
  const gbPerMonthRaw = (mbPerSec * utilizedSeconds) / 1024;

  // Storage
  const retentionDays = clampNum(w.retentionDays, 0);
  const gbPerDayRaw = gbPerMonthRaw / 30.4;
  const overhead = 1.35; // index + metadata + safety margin
  const compression = clampNum(w.compressionRatio, 1, 20);
  const storageGB = (gbPerDayRaw * retentionDays * overhead) / compression;

  // Compute heuristic
  const qps = clampNum(w.queriesPerSecond, 0);
  const cpu = Math.max(8, Math.ceil(assets / 2500) * 16 + Math.ceil(qps / 50) * 8);
  const ramGB = Math.max(32, cpu * 4);

  return { mbPerSec, gbPerMonthRaw, storageGB, cpu, ramGB };
}

/* ---------------------------
   Styles (no Tailwind)
---------------------------- */
const S = {
  page: {
    minHeight: "100vh",
    background: "#1f1f1f",
    color: "#eaeaea",
    padding: 24,
    fontFamily: "system-ui",
  },
  shell: {
    maxWidth: 1600,
    margin: "0 auto",
  },
  card: {
    background: "linear-gradient(180deg, #2b2b2b 0%, #242424 100%)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 18,
    boxShadow: "0 14px 40px rgba(0,0,0,0.35)",
  },
  headerRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  h1: { margin: 0, fontSize: 28, fontWeight: 750 },
  sub: { marginTop: 6, opacity: 0.8, lineHeight: 1.35 },

  btn: {
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "#111",
    color: "white",
    padding: "8px 12px",
    fontWeight: 800,
    cursor: "pointer",
  },
  btnSmall: {
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "#111",
    color: "white",
    padding: "6px 10px",
    fontWeight: 800,
    cursor: "pointer",
    fontSize: 12,
  },
  btnSmallGhost: {
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "transparent",
    color: "#ddd",
    padding: "6px 10px",
    fontWeight: 800,
    cursor: "pointer",
    fontSize: 12,
  },
  btnSmallDisabled: {
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "#151515",
    color: "#666",
    padding: "6px 10px",
    fontWeight: 800,
    cursor: "not-allowed",
    fontSize: 12,
  },

  grid: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "340px minmax(640px, 1fr) 340px",
    alignItems: "start",
    marginTop: 18,
  },

  leftStack: { display: "grid", gap: 14 },

  titleSm: { fontSize: 13, fontWeight: 850, opacity: 0.95 },
  muted: { fontSize: 12, opacity: 0.7 },

  listItem: (active) => ({
    width: "100%",
    textAlign: "left",
    borderRadius: 14,
    border: active ? "1px solid rgba(138,162,255,0.85)" : "1px solid rgba(255,255,255,0.10)",
    background: active ? "rgba(138,162,255,0.10)" : "rgba(0,0,0,0.18)",
    padding: 12,
    cursor: "pointer",
    color: "#eaeaea",
  }),
  listName: { fontSize: 13, fontWeight: 850, marginBottom: 6 },
  listMeta: { fontSize: 12, opacity: 0.82, lineHeight: 1.3 },

  kpiGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 },
  kpi: {
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.18)",
    padding: 12,
  },
  kpiLabel: { fontSize: 11, fontWeight: 850, opacity: 0.7 },
  kpiVal: { marginTop: 6, fontSize: 18, fontWeight: 850 },

  sectionTitle: { fontSize: 20, fontWeight: 850, margin: 0 },
  sectionSub: { marginTop: 6, opacity: 0.75 },

  formGrid: { display: "grid", gap: 14, marginTop: 18 },
row2: {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", // ✅ prevents overflow pushing into neighbor
  columnGap: 12,
  rowGap: 14,
  alignItems: "start",
},
row3: {
  display: "grid",
  gridTemplateColumns:
    "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)", // ✅ same idea for 3-up
  columnGap: 12,
  rowGap: 14,
  alignItems: "start",
},
field: {
  display: "grid",
  gap: 8,        // ✅ more breathing room
  minWidth: 0,   // ✅ critical inside CSS grid to avoid overflow overlap
},

  label: {
    fontSize: 12,
    fontWeight: 850,
    opacity: 0.95,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 10,
    flexWrap: "wrap",
    minHeight: 18,
  },
  labelHint: {
    fontSize: 11,
    fontWeight: 750,
    opacity: 0.65,
    whiteSpace: "nowrap",
  },

input: {
  display: "block",
  boxSizing: "border-box",
  width: "100%",
  minWidth: 0,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.25)",
  color: "#fff",
  padding: "10px 12px",
  outline: "none",
},
select: {
  display: "block",
  boxSizing: "border-box",
  width: "100%",
  minWidth: 0,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.25)",
  color: "#fff",
  padding: "10px 12px",
  outline: "none",
},
textarea: {
  display: "block",
  boxSizing: "border-box",
  width: "100%",
  minWidth: 0,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.25)",
  color: "#fff",
  padding: "10px 12px",
  outline: "none",
  resize: "vertical",
},

  rightTiles: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 },

  noteLine: { marginTop: 12, fontSize: 12, opacity: 0.75, lineHeight: 1.35 },
  mono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" },
};

export default function DigitalTwinSizingPage() {
  const [twins, setTwins] = useState(() => {
    const existing = loadAll();
    return existing.length ? existing : [makeDefaultTwin("Digital Twin 1")];
  });

  const [activeId, setActiveId] = useState(() => {
    const first = loadAll()[0] || twins[0];
    return first?.id;
  });

  const active = useMemo(() => twins.find((t) => t.id === activeId) || twins[0], [twins, activeId]);
  const sizing = useMemo(() => deriveSizing(active || {}), [active]);

  const rollup = useMemo(() => {
    const rows = twins.map((t) => deriveSizing(t));
    const peakCPU = rows.length ? Math.max(...rows.map((r) => r.cpu)) : 0;
    const peakRAM = rows.length ? Math.max(...rows.map((r) => r.ramGB)) : 0;
    const storageGB = rows.reduce((a, r) => a + r.storageGB, 0);
    const ingestMBps = rows.reduce((a, r) => a + r.mbPerSec, 0);
    return { count: twins.length, peakCPU, peakRAM, storageGB, ingestMBps };
  }, [twins]);

  function persist(next) {
    setTwins(next);
    saveAll(next);
  }

  function updateActive(patch) {
    persist(twins.map((t) => (t.id === activeId ? { ...t, ...patch } : t)));
  }

  function addTwin() {
    const idx = twins.length + 1;
    const next = [...twins, makeDefaultTwin(`Digital Twin ${idx}`)];
    persist(next);
    setActiveId(next[next.length - 1].id);
  }

  function duplicateTwin() {
    const src = active;
    if (!src) return;
    const idx = twins.length + 1;
    const copy = { ...src, id: uid("twin"), name: `Digital Twin ${idx} (Copy)` };
    const next = [...twins, copy];
    persist(next);
    setActiveId(copy.id);
  }

  function removeTwin() {
    if (twins.length <= 1) return;
    const next = twins.filter((t) => t.id !== activeId);
    persist(next);
    setActiveId(next[0].id);
  }

  return (
    <div style={S.page}>
      <style>{`
        @media (max-width: 1200px) {
          .dt-grid { grid-template-columns: 1fr !important; }
          .dt-shell { padding: 0 12px; }
        }
        input:focus, select:focus, textarea:focus {
          border-color: rgba(138,162,255,0.65) !important;
          box-shadow: 0 0 0 3px rgba(138,162,255,0.18);
        }
        button:active { transform: translateY(1px); }
      `}</style>

      <div className="dt-shell" style={S.shell}>
        {/* Header card */}
        <div style={S.card}>
          <div style={S.headerRow}>
            <div>
              <div style={S.h1}>Digital Twins sizing</div>
              <div style={S.sub}>Capture telemetry scale + retention to estimate storage and basic compute envelope.</div>
            </div>
            <button
              type="button"
              style={S.btn}
              onClick={() => {
                const next = [makeDefaultTwin("Digital Twin 1")];
                persist(next);
                setActiveId(next[0].id);
              }}
            >
              Reset
            </button>
          </div>
        </div>

        <div className="dt-grid" style={S.grid}>
          {/* Left */}
          <div style={S.leftStack}>
            <div style={S.card}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={S.titleSm}>Twin workloads</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" style={S.btnSmall} onClick={addTwin}>
                    Add
                  </button>
                  <button type="button" style={S.btnSmallGhost} onClick={duplicateTwin}>
                    Duplicate
                  </button>
                  <button
                    type="button"
                    style={twins.length <= 1 ? S.btnSmallDisabled : S.btnSmallGhost}
                    onClick={removeTwin}
                    disabled={twins.length <= 1}
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {twins.map((t) => {
                  const sel = t.id === activeId;
                  const s = deriveSizing(t);
                  return (
                    <button key={t.id} type="button" style={S.listItem(sel)} onClick={() => setActiveId(t.id)}>
                      <div style={S.listName}>{t.name}</div>
                      <div style={S.listMeta}>
                        Storage: <b>{fmt(s.storageGB / 1024, 2)} TB</b> · CPU: <b>{fmt(s.cpu)}</b> · RAM:{" "}
                        <b>{fmt(s.ramGB)} GB</b>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={S.card}>
              <div style={S.titleSm}>Roll-up</div>
              <div style={S.kpiGrid}>
                <div style={S.kpi}>
                  <div style={S.kpiLabel}>Workloads</div>
                  <div style={S.kpiVal}>{fmt(rollup.count)}</div>
                </div>
                <div style={S.kpi}>
                  <div style={S.kpiLabel}>Ingest (MB/s)</div>
                  <div style={S.kpiVal}>{fmt(rollup.ingestMBps, 2)}</div>
                </div>
                <div style={S.kpi}>
                  <div style={S.kpiLabel}>Peak CPU</div>
                  <div style={S.kpiVal}>{fmt(rollup.peakCPU)}</div>
                </div>
                <div style={S.kpi}>
                  <div style={S.kpiLabel}>Storage (TB)</div>
                  <div style={S.kpiVal}>{fmt(rollup.storageGB / 1024, 2)}</div>
                </div>
              </div>
              <div style={{ marginTop: 10, ...S.muted }}>
                Peak RAM (GB): <b style={{ opacity: 0.95 }}>{fmt(rollup.peakRAM)}</b>
              </div>
            </div>
          </div>

          {/* Middle editor */}
          <div style={S.card}>
            <div>
              <div style={S.sectionTitle}>{active?.name || "—"}</div>
              <div style={S.sectionSub}>Edit sizing inputs for this twin workload.</div>
            </div>

            <div style={S.formGrid}>
              <div style={S.field}>
                <div style={S.label}>Name</div>
                <input style={S.input} value={active?.name || ""} onChange={(e) => updateActive({ name: e.target.value })} />
              </div>

              <div style={S.row2}>
                <div style={S.field}>
                  <div style={S.label}>Twin type</div>
                  <select style={S.select} value={active?.twinType || ""} onChange={(e) => updateActive({ twinType: e.target.value })}>
                    {TWIN_TYPES.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={S.field}>
                  <div style={S.label}>Update rate</div>
                  <select style={S.select} value={active?.updateRate || ""} onChange={(e) => updateActive({ updateRate: e.target.value })}>
                    {UPDATE_RATE.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={S.row2}>
                <div style={S.field}>
                  <div style={S.label}>
                    <span>Assets / entities</span>
                    <span style={S.labelHint}>Sensors, endpoints, nodes</span>
                  </div>
                  <input
                    type="number"
                    style={S.input}
                    value={active?.assets ?? 0}
                    onChange={(e) => updateActive({ assets: clampNum(e.target.value, 0) })}
                  />
                </div>

                <div style={S.field}>
                  <div style={S.label}>
                    <span>Telemetry KB per update</span>
                    <span style={S.labelHint}>Avg payload per asset</span>
                  </div>
                  <input
                    type="number"
                    style={S.input}
                    value={active?.telemetryKBPerUpdate ?? 0}
                    onChange={(e) => updateActive({ telemetryKBPerUpdate: clampNum(e.target.value, 0) })}
                  />
                </div>
              </div>

              <div style={S.row3}>
                <div style={S.field}>
                  <div style={S.label}>Retention (days)</div>
                  <input
                    type="number"
                    style={S.input}
                    value={active?.retentionDays ?? 0}
                    onChange={(e) => updateActive({ retentionDays: clampNum(e.target.value, 0) })}
                  />
                </div>

                <div style={S.field}>
                  <div style={S.label}>
                    <span>Compression ratio</span>
                    <span style={S.labelHint}>Higher = less storage</span>
                  </div>
                  <input
                    type="number"
                    style={S.input}
                    value={active?.compressionRatio ?? 1}
                    onChange={(e) => updateActive({ compressionRatio: clampNum(e.target.value, 1, 20) })}
                  />
                </div>

                <div style={S.field}>
                  <div style={S.label}>
                    <span>Utilization (%)</span>
                    <span style={S.labelHint}>Duty cycle</span>
                  </div>
                  <input
                    type="number"
                    style={S.input}
                    value={active?.utilizationPct ?? 0}
                    onChange={(e) => updateActive({ utilizationPct: clampNum(e.target.value, 0, 100) })}
                  />
                </div>
              </div>

              <div style={S.row2}>
                <div style={S.field}>
                  <div style={S.label}>Concurrent users</div>
                  <input
                    type="number"
                    style={S.input}
                    value={active?.concurrentUsers ?? 0}
                    onChange={(e) => updateActive({ concurrentUsers: clampNum(e.target.value, 0) })}
                  />
                </div>

                <div style={S.field}>
                  <div style={S.label}>
                    <span>Queries/sec (QPS)</span>
                    <span style={S.labelHint}>APIs, dashboards, analytics</span>
                  </div>
                  <input
                    type="number"
                    style={S.input}
                    value={active?.queriesPerSecond ?? 0}
                    onChange={(e) => updateActive({ queriesPerSecond: clampNum(e.target.value, 0) })}
                  />
                </div>
              </div>

              <div style={S.field}>
                <div style={S.label}>
                  <span>Notes</span>
                  <span style={S.labelHint}>Optional</span>
                </div>
                <textarea
                  rows={4}
                  style={S.textarea}
                  value={active?.notes || ""}
                  onChange={(e) => updateActive({ notes: e.target.value })}
                  placeholder="Any assumptions, integrations, or constraints…"
                />
              </div>
            </div>
          </div>

          {/* Right derived */}
          <div style={S.card}>
            <div style={S.titleSm}>Derived sizing (this twin)</div>

            <div style={S.rightTiles}>
              <div style={S.kpi}>
                <div style={S.kpiLabel}>Ingest</div>
                <div style={S.kpiVal}>{fmt(sizing.mbPerSec, 2)} MB/s</div>
              </div>
              <div style={S.kpi}>
                <div style={S.kpiLabel}>Raw ingest</div>
                <div style={S.kpiVal}>{fmt(sizing.gbPerMonthRaw, 0)} GB/mo</div>
              </div>
              <div style={S.kpi}>
                <div style={S.kpiLabel}>Storage</div>
                <div style={S.kpiVal}>{fmt(sizing.storageGB / 1024, 2)} TB</div>
              </div>
              <div style={S.kpi}>
                <div style={S.kpiLabel}>Compute</div>
                <div style={S.kpiVal}>{fmt(sizing.cpu)} vCPU</div>
              </div>
            </div>

            <div style={S.noteLine}>
              RAM (GB): <b>{fmt(sizing.ramGB)}</b> · Storage uses overhead + compression assumptions.
            </div>

            <div style={{ marginTop: 12, ...S.muted }}>
              LocalStorage key: <span style={S.mono}>{DT_LS_KEY}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}