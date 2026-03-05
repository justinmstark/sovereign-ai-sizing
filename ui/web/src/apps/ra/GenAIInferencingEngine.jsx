// File: src/apps/ra/GenAIInferencingEngine.jsx
import React, { useMemo, useState } from "react";
import {
  GPU_PRESETS,
  PRECISION_PRESETS,
  sizeGenAIInferencingEngine,
} from "./calculators/genaiInferencingCalculator";

const S = {
  card: {
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 16,
    padding: 14,
    background: "rgba(255,255,255,0.06)",
    boxShadow: "0 10px 26px rgba(0,0,0,0.22)",
    backdropFilter: "blur(10px)",
  },
  cardTitle: {
    fontWeight: 800,
    marginBottom: 8,
    fontSize: 13,
    letterSpacing: 0.2,
    opacity: 0.95,
  },
  divider: { height: 1, background: "rgba(255,255,255,0.10)" },
  fieldWrap: { display: "grid", gap: 4 },
  fieldHead: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "baseline",
  },
  label: { fontWeight: 750, fontSize: 12.5 },
  hint: { opacity: 0.7, fontSize: 11.5 },

  // ✅ narrower entry blocks
  input: {
    width: "100%",
    maxWidth: 220,
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.20)",
    color: "rgba(255,255,255,0.92)",
    outline: "none",
  },
  select: {
    width: "100%",
    maxWidth: 240, // a touch wider for dropdown
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    outline: "none",
    background: "rgba(0,0,0,0.20)",
    color: "rgba(255,255,255,0.92)",
  },
};

const Field = ({ label, hint, children }) => (
  <div style={S.fieldWrap}>
    <div style={S.fieldHead}>
      <div style={S.label}>{label}</div>
      {hint ? <div style={S.hint}>{hint}</div> : null}
    </div>
    {children}
  </div>
);

const Card = ({ title, children }) => (
  <div style={S.card}>
    {title ? <div style={S.cardTitle}>{title}</div> : null}
    {children}
  </div>
);

const NumberInput = ({ value, onChange, min, step }) => (
  <input
    type="number"
    value={Number.isFinite(value) ? value : 0}
    min={min}
    // ✅ Avoid native "nearest valid values" step validation popups
    step={step ?? "any"}
    inputMode="decimal"
    onChange={(e) => onChange(Number(e.target.value))}
    style={S.input}
  />
);

const Select = ({ value, onChange, options }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} style={S.select}>
    {options.map((o) => (
      <option key={o.value} value={o.value} style={{ color: "#0b0d10" }}>
        {o.label}
      </option>
    ))}
  </select>
);

const Badge = ({ children, tone = "neutral" }) => {
  const bg =
    tone === "good"
      ? "rgba(34,197,94,0.18)"
      : tone === "bad"
      ? "rgba(239,68,68,0.18)"
      : "rgba(59,130,246,0.18)";
  const border =
    tone === "good"
      ? "rgba(34,197,94,0.28)"
      : tone === "bad"
      ? "rgba(239,68,68,0.28)"
      : "rgba(59,130,246,0.28)";
  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        background: bg,
        border: `1px solid ${border}`,
        fontSize: 12,
        fontWeight: 850,
        color: "rgba(255,255,255,0.92)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
};

function clampNum(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function MiniCard({ title, children }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 14,
        padding: 11,
        background: "rgba(0,0,0,0.18)",
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.9, marginBottom: 7 }}>
        {title}
      </div>
      <div style={{ display: "grid", gap: 7, fontSize: 13 }}>{children}</div>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      <div style={{ opacity: 0.78 }}>{k}</div>
      <div style={{ fontWeight: 900 }}>{String(v)}</div>
    </div>
  );
}

export default function GenAIInferencingEngine() {
  const [state, setState] = useState({
    // Workload
    targetTokensPerSec: 1000,
    avgOutputTokens: 256,
    avgInputTokens: 1024,
    peakToAvg: 1.5,
    concurrency: 200,
    latencyTargetMs: 800,

    // Model
    modelParamsB: 70,
    precisionId: "int8",
    contextTokens: 4096,

    // Serving
    maxBatch: 8,
    tensorParallel: 1,
    pipelineParallel: 1,

    // Platform
    gpuId: "H100_80",
    gpusPerServer: 8,
    cpuCoresPerServer: 64,
    ramGBPerServer: 512,
    nicGbpsPerServer: 200,
    storageTBPerServer: 7.68,

    // Overheads / targets
    runtimeVramOverheadGB: 6,
    vramUtilisationTarget: 0.9,
    pue: 1.3,
  });

  const update = (patch) => setState((s) => ({ ...s, ...patch }));
  const result = useMemo(() => sizeGenAIInferencingEngine(state), [state]);

  const gpuOptions = GPU_PRESETS.map((g) => ({
    value: g.id,
    label: `${g.label} · ${g.vramGB}GB`,
  }));
  const precOptions = PRECISION_PRESETS.map((p) => ({ value: p.id, label: p.label }));

  // ✅ helper for consistent grid blocks (prevents stretching)
  const twoColGrid = {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
    alignItems: "start",
  };

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        gridTemplateColumns: "1.08fr 0.92fr",
        alignItems: "start",
      }}
    >
      {/* LEFT */}
      <div style={{ display: "grid", gap: 12 }}>
        <Card title="GenAI Inferencing Engine — Inputs">
          <div style={{ display: "grid", gap: 10 }}>
            {/* WORKLOAD */}
            <div style={twoColGrid}>
              <Field label="Target tokens/sec" hint="Total output tok/s (avg)">
                <NumberInput
                  value={state.targetTokensPerSec}
                  onChange={(v) => update({ targetTokensPerSec: clampNum(v, 1) })}
                  min={1}
                  step={10}
                />
              </Field>
              <Field label="Peak:Avg multiplier" hint="Burst headroom">
                <NumberInput
                  value={state.peakToAvg}
                  onChange={(v) => update({ peakToAvg: clampNum(v, 1) })}
                  min={1}
                  step={0.1}
                />
              </Field>
              <Field label="Concurrency" hint="Active requests">
                <NumberInput
                  value={state.concurrency}
                  onChange={(v) => update({ concurrency: clampNum(v, 1) })}
                  min={1}
                  step={10}
                />
              </Field>
              <Field label="Latency target (ms)" hint="P95-ish goal">
                <NumberInput
                  value={state.latencyTargetMs}
                  onChange={(v) => update({ latencyTargetMs: clampNum(v, 50) })}
                  min={50}
                  step={50}
                />
              </Field>
              <Field label="Avg output tokens" hint="Completion length">
                <NumberInput
                  value={state.avgOutputTokens}
                  onChange={(v) => update({ avgOutputTokens: clampNum(v, 1) })}
                  min={1}
                  step={16}
                />
              </Field>
              <Field label="Avg input tokens" hint="Prompt length">
                <NumberInput
                  value={state.avgInputTokens}
                  onChange={(v) => update({ avgInputTokens: clampNum(v, 1) })}
                  min={1}
                  step={64}
                />
              </Field>
            </div>

            <div style={S.divider} />

            {/* MODEL / SERVING */}
            <div style={twoColGrid}>
              <Field label="Model size (B params)" hint="7 / 13 / 70 etc">
                <NumberInput
                  value={state.modelParamsB}
                  onChange={(v) => update({ modelParamsB: clampNum(v, 1) })}
                  min={1}
                  step={1}
                />
              </Field>
              <Field label="Precision / quantization">
                <Select
                  value={state.precisionId}
                  onChange={(v) => update({ precisionId: v })}
                  options={precOptions}
                />
              </Field>
              <Field label="Context tokens" hint="Max context window">
                <NumberInput
                  value={state.contextTokens}
                  onChange={(v) => update({ contextTokens: clampNum(v, 256) })}
                  min={256}
                  step={256}
                />
              </Field>
              <Field label="Max batch" hint="Batching boosts throughput">
                <NumberInput
                  value={state.maxBatch}
                  onChange={(v) => update({ maxBatch: clampNum(v, 1) })}
                  min={1}
                  step={1}
                />
              </Field>
              <Field label="Tensor parallel">
                <NumberInput
                  value={state.tensorParallel}
                  onChange={(v) => update({ tensorParallel: clampNum(v, 1) })}
                  min={1}
                  step={1}
                />
              </Field>
              <Field label="Pipeline parallel">
                <NumberInput
                  value={state.pipelineParallel}
                  onChange={(v) => update({ pipelineParallel: clampNum(v, 1) })}
                  min={1}
                  step={1}
                />
              </Field>
            </div>

            <div style={S.divider} />

            {/* PLATFORM */}
            <div style={twoColGrid}>
              <Field label="GPU type">
                <Select value={state.gpuId} onChange={(v) => update({ gpuId: v })} options={gpuOptions} />
              </Field>
              <Field label="GPUs per server">
                <NumberInput
                  value={state.gpusPerServer}
                  onChange={(v) => update({ gpusPerServer: clampNum(v, 1) })}
                  min={1}
                  step={1}
                />
              </Field>
              <Field label="CPU cores/server">
                <NumberInput
                  value={state.cpuCoresPerServer}
                  onChange={(v) => update({ cpuCoresPerServer: clampNum(v, 8) })}
                  min={8}
                  step={8}
                />
              </Field>
              <Field label="RAM GB/server">
                <NumberInput
                  value={state.ramGBPerServer}
                  onChange={(v) => update({ ramGBPerServer: clampNum(v, 64) })}
                  min={64}
                  step={64}
                />
              </Field>
              <Field label="NIC Gbps/server" hint="Total fabric capacity">
                <NumberInput
                  value={state.nicGbpsPerServer}
                  onChange={(v) => update({ nicGbpsPerServer: clampNum(v, 10) })}
                  min={10}
                  step={10}
                />
              </Field>
              <Field label="Storage TB/server" hint="Local NVMe / cache">
                <NumberInput
                  value={state.storageTBPerServer}
                  onChange={(v) => update({ storageTBPerServer: clampNum(v, 1) })}
                  min={0}
                  step={0.5}
                />
              </Field>
            </div>

            <div style={S.divider} />

            {/* OVERHEADS */}
            <div style={twoColGrid}>
              <Field label="Runtime VRAM overhead (GB)" hint="Framework + fragmentation">
                <NumberInput
                  value={state.runtimeVramOverheadGB}
                  onChange={(v) => update({ runtimeVramOverheadGB: clampNum(v, 0) })}
                  min={0}
                  step={1}
                />
              </Field>
              <Field label="VRAM utilisation target" hint="e.g. 0.85–0.92">
                <NumberInput
                  value={state.vramUtilisationTarget}
                  onChange={(v) => update({ vramUtilisationTarget: clampNum(v, 0.9) })}
                  min={0.5}
                  step={0.01}
                />
              </Field>
              <Field label="PUE" hint="Facility overhead">
                <NumberInput
                  value={state.pue}
                  onChange={(v) => update({ pue: clampNum(v, 1.3) })}
                  min={1}
                  step={0.05}
                />
              </Field>
              <div />
            </div>
          </div>
        </Card>
      </div>

      {/* RIGHT */}
      <div style={{ display: "grid", gap: 12 }}>
        <Card title="Sizing Result">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.1 }}>
                {result.capacity.gpusRequired} GPUs
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.78, marginTop: 5 }}>
                {result.capacity.serversRequired} servers · {result.billOfMaterials.gpu.label}
              </div>
              <div style={{ marginTop: 9, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Badge tone={result.fit.vramFit ? "good" : "bad"}>
                  VRAM fit {result.fit.vramFit ? "✓" : "✕"}
                </Badge>
                <Badge tone="neutral">Peak {Math.round(result.performance.peakTokensPerSec)} tok/s</Badge>
              </div>
            </div>
          </div>

          <div style={{ height: 10 }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <MiniCard title="Performance">
              <Row k="Effective tok/s/GPU" v={result.performance.effDecodeTokPerSecPerGpu} />
              <Row k="Peak tok/s" v={Math.round(result.performance.peakTokensPerSec)} />
              <Row k="Req/sec (est)" v={result.performance.reqPerSec} />
              <Row k="Concurrency/GPU" v={result.performance.concPerGpu} />
              <Row k="Egress (Gbps est)" v={result.performance.estEgressGbps} />
            </MiniCard>

            <MiniCard title="Capacity">
              <Row k="GPUs required" v={result.capacity.gpusRequired} />
              <Row k="Servers required" v={result.capacity.serversRequired} />
              <Row k="CPU cores (est)" v={result.capacity.cpuCoresNeeded} />
              <Row k="RAM GB (est)" v={result.capacity.ramGBNeeded} />
              <Row k="Storage TB (est)" v={result.capacity.storageTBNeeded} />
            </MiniCard>

            <MiniCard title="VRAM Breakdown (per GPU)">
              <Row k="Needed (GB)" v={result.fit.vramNeededPerGpu} />
              <Row k="Available (GB)" v={result.fit.vramAvailablePerGpu} />
              <Row k="Weights (GB)" v={result.fit.weightsGBPerGpu} />
              <Row k="KV cache (GB)" v={result.fit.kvGBPerGpu} />
              <Row k="Runtime OH (GB)" v={result.fit.runtimeVramOverheadGB} />
            </MiniCard>

            <MiniCard title="Power">
              <Row k="IT power (kW)" v={result.power.itPowerKW} />
              <Row k="Facility power (kW)" v={result.power.facilityPowerKW} />
              <Row k="PUE" v={result.power.pue} />
            </MiniCard>
          </div>

          {result.notes?.length ? (
            <>
              <div style={{ height: 10 }} />
              <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}>Notes</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, opacity: 0.88 }}>
                {result.notes.map((n, i) => (
                  <li key={i} style={{ marginBottom: 6 }}>
                    {n}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </Card>
      </div>
    </div>
  );
}