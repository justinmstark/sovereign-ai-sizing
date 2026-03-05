// File: src/apps/methodology/LLMServicesMethodology.jsx
import React, { useMemo, useState } from "react";

/**
 * LLMServicesMethodology.jsx
 * Transparent, reviewer-friendly methodology page for LLM Services sizing (API / chat / embeddings).
 * - No Tailwind
 * - Self-contained styling (dark theme)
 * - Includes:
 *   1) Variables & Units table
 *   2) Step-by-step Calculation Trace table
 *   3) Optional “quick-check playground”
 *
 * What this page sizes:
 * - GPU capacity for inference based on token throughput (tokens/sec per GPU)
 * - A second constraint based on peak concurrent sessions (sessions/GPU)
 * - Optional memory / KV cache sanity check (approx)
 * - Basic network egress estimate
 *
 * IMPORTANT:
 * - Your production calculator likely has a chip + serving stack performance table.
 *   This page keeps performance as explicit inputs (tokensPerSecPerGPU, sessionsPerGPU, etc.)
 *   so reviewers can plug in published/benchmark values.
 */

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function fmtNum(n, digits = 2) {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(digits) + "T";
  if (abs >= 1e9) return (n / 1e9).toFixed(digits) + "B";
  if (abs >= 1e6) return (n / 1e6).toFixed(digits) + "M";
  if (abs >= 1e3) return (n / 1e3).toFixed(digits) + "k";
  return n.toFixed(digits);
}

function pct(n, digits = 0) {
  if (!Number.isFinite(n)) return "—";
  return (n * 100).toFixed(digits) + "%";
}

function Eq({ children }) {
  return (
    <pre style={styles.eq}>
      <code style={styles.code}>{children}</code>
    </pre>
  );
}

function Card({ title, subtitle, children, right }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div>
          <div style={styles.cardTitle}>{title}</div>
          {subtitle ? <div style={styles.cardSubtitle}>{subtitle}</div> : null}
        </div>
        {right ? <div style={styles.cardRight}>{right}</div> : null}
      </div>
      <div style={styles.cardBody}>{children}</div>
    </div>
  );
}

function Pill({ children }) {
  return <span style={styles.pill}>{children}</span>;
}

function Divider() {
  return <div style={styles.divider} />;
}

function Hint({ children }) {
  return <div style={styles.hint}>{children}</div>;
}

function Small({ children }) {
  return <div style={styles.small}>{children}</div>;
}

function Toggle({ value, onChange, label }) {
  return (
    <label style={styles.toggleWrap}>
      <span style={styles.toggleLabel}>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        style={{
          ...styles.toggleBtn,
          ...(value ? styles.toggleOn : styles.toggleOff),
        }}
        aria-pressed={value}
      >
        <span
          style={{
            ...styles.toggleKnob,
            transform: value ? "translateX(18px)" : "translateX(0px)",
          }}
        />
      </button>
    </label>
  );
}

function Field({ label, value, onChange, step, min, max }) {
  return (
    <div style={styles.formField}>
      <div style={styles.label}>{label}</div>
      <input
        style={styles.input}
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div style={styles.formField}>
      <div style={styles.label}>{label}</div>
      <select
        style={styles.select}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Kpi({ label, value, sub }) {
  return (
    <div style={styles.kpi}>
      <div style={styles.kpiLabel}>{label}</div>
      <div style={styles.kpiValue}>{value}</div>
      {sub ? <div style={styles.kpiSub}>{sub}</div> : null}
    </div>
  );
}

function VariablesCard({ title = "Variables & Units", rows }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div>
          <div style={styles.cardTitle}>{title}</div>
          <div style={styles.cardSubtitle}>Exact meaning + units for audit</div>
        </div>
        <div style={styles.cardRight}>
          <span style={styles.pill}>Reference</span>
        </div>
      </div>
      <div style={styles.cardBody}>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Variable</th>
                <th style={styles.th}>Unit</th>
                <th style={styles.th}>Meaning</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={styles.tdMono}>{r.name}</td>
                  <td style={styles.td}>{r.unit}</td>
                  <td style={styles.td}>{r.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TraceTable({ title = "Calculation Trace", steps }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div>
          <div style={styles.cardTitle}>{title}</div>
          <div style={styles.cardSubtitle}>
            Step-by-step breakdown that can be reproduced externally
          </div>
        </div>
        <div style={styles.cardRight}>
          <span style={styles.pill}>Audit</span>
        </div>
      </div>
      <div style={styles.cardBody}>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Step</th>
                <th style={styles.th}>Expression</th>
                <th style={styles.th}>Value</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((s, i) => (
                <tr key={i}>
                  <td style={styles.td}>{s.label}</td>
                  <td style={styles.tdMono} title={s.expr}>
                    {s.expr}
                  </td>
                  <td style={styles.tdMono}>{s.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function workloadDefaults(kind) {
  // Lightweight presets so reviewers can see how the same math applies to different service classes
  // (Your production app can replace with actual benchmark-derived settings.)
  if (kind === "chat") {
    return {
      avgInputTokens: 700,
      avgOutputTokens: 350,
      tokensPerSecPerGPU: 220, // effective throughput (after batching) per GPU
      sessionsPerGPU: 3, // concurrency packing constraint
      kvBytesPerToken: 32, // rough proxy; depends on model + context + precision
      avgConcurrency: 120, // peak active sessions
      reqPerSec: 6,
      avgResponseKb: 16,
    };
  }
  if (kind === "embeddings") {
    return {
      avgInputTokens: 900,
      avgOutputTokens: 0,
      tokensPerSecPerGPU: 1200,
      sessionsPerGPU: 12,
      kvBytesPerToken: 8,
      avgConcurrency: 180,
      reqPerSec: 30,
      avgResponseKb: 4,
    };
  }
  // default: "completion"
  return {
    avgInputTokens: 500,
    avgOutputTokens: 200,
    tokensPerSecPerGPU: 450,
    sessionsPerGPU: 6,
    kvBytesPerToken: 24,
    avgConcurrency: 90,
    reqPerSec: 10,
    avgResponseKb: 10,
  };
}

export default function LLMServicesMethodology() {
  const [showPlayground, setShowPlayground] = useState(true);

  // Service class preset
  const [serviceKind, setServiceKind] = useState("chat");

  // Demand inputs
  const [reqPerSec, setReqPerSec] = useState(6);
  const [avgInputTokens, setAvgInputTokens] = useState(700);
  const [avgOutputTokens, setAvgOutputTokens] = useState(350);

  // Concurrency
  const [peakConcurrentSessions, setPeakConcurrentSessions] = useState(120);

  // Performance inputs (benchmarks / table lookup in your real calculator)
  const [tokensPerSecPerGPU, setTokensPerSecPerGPU] = useState(220);
  const [sessionsPerGPU, setSessionsPerGPU] = useState(3);

  // Planning factors
  const [targetGpuUtil, setTargetGpuUtil] = useState(0.65);
  const [redundancyFactor, setRedundancyFactor] = useState(1.15);

  // Memory/KV cache (very rough sanity check)
  const [avgContextTokens, setAvgContextTokens] = useState(4096);
  const [kvBytesPerToken, setKvBytesPerToken] = useState(32);
  const [gpuMemoryGB, setGpuMemoryGB] = useState(80);
  const [kvUtilizationBudget, setKvUtilizationBudget] = useState(0.55); // how much GPU memory we allow for KV

  // Network (optional)
  const [avgResponseKb, setAvgResponseKb] = useState(16);

  // Apply preset quickly
  const applyPreset = (kind) => {
    const d = workloadDefaults(kind);
    setServiceKind(kind);
    setAvgInputTokens(d.avgInputTokens);
    setAvgOutputTokens(d.avgOutputTokens);
    setTokensPerSecPerGPU(d.tokensPerSecPerGPU);
    setSessionsPerGPU(d.sessionsPerGPU);
    setKvBytesPerToken(d.kvBytesPerToken);
    setPeakConcurrentSessions(d.avgConcurrency);
    setReqPerSec(d.reqPerSec);
    setAvgResponseKb(d.avgResponseKb);
  };

  const derived = useMemo(() => {
    const totalTokensPerRequest = Math.max(0, avgInputTokens) + Math.max(0, avgOutputTokens);

    // Token demand (tokens/sec)
    const tokenRate = Math.max(0, reqPerSec) * totalTokensPerRequest;

    // GPU capacity by throughput
    const gpusByThroughput =
      tokensPerSecPerGPU > 0 && targetGpuUtil > 0
        ? tokenRate / (tokensPerSecPerGPU * targetGpuUtil)
        : NaN;

    // GPU capacity by concurrency packing
    const gpusByConcurrency = sessionsPerGPU > 0 ? peakConcurrentSessions / sessionsPerGPU : NaN;

    // Must satisfy both constraints
    const gpusBase = Math.max(gpusByThroughput, gpusByConcurrency);

    // Add redundancy/headroom
    const gpusFinal = gpusBase * redundancyFactor;

    // KV cache sanity check:
    // Approx KV bytes per session = avgContextTokens × kvBytesPerToken
    // Total KV bytes at peak = peakConcurrentSessions × KV/session
    // KV budget bytes per GPU = gpuMemoryGB × 1024^3 × kvUtilizationBudget
    const kvBytesPerSession = Math.max(0, avgContextTokens) * Math.max(0, kvBytesPerToken);
    const totalKvBytesPeak = Math.max(0, peakConcurrentSessions) * kvBytesPerSession;
    const kvBudgetBytesPerGPU = Math.max(0, gpuMemoryGB) * 1024 * 1024 * 1024 * Math.max(0, kvUtilizationBudget);
    const gpusByKv =
      kvBudgetBytesPerGPU > 0 ? totalKvBytesPeak / kvBudgetBytesPerGPU : NaN;

    // Network egress (very rough): responses/sec × KB/response
    const egressKBps = Math.max(0, reqPerSec) * Math.max(0, avgResponseKb);
    const egressMbps = (egressKBps * 8) / 1024; // KB/s to Mb/s (approx)
    const egressGbps = egressMbps / 1000;

    return {
      totalTokensPerRequest,
      tokenRate,
      gpusByThroughput,
      gpusByConcurrency,
      gpusBase,
      gpusFinal,
      kvBytesPerSession,
      totalKvBytesPeak,
      kvBudgetBytesPerGPU,
      gpusByKv,
      egressMbps,
      egressGbps,
    };
  }, [
    reqPerSec,
    avgInputTokens,
    avgOutputTokens,
    peakConcurrentSessions,
    tokensPerSecPerGPU,
    sessionsPerGPU,
    targetGpuUtil,
    redundancyFactor,
    avgContextTokens,
    kvBytesPerToken,
    gpuMemoryGB,
    kvUtilizationBudget,
    avgResponseKb,
  ]);

  const traceSteps = useMemo(() => {
    const val = (x) => (Number.isFinite(x) ? x.toFixed(6) : "—");
    const gb = (bytes) =>
      Number.isFinite(bytes) ? (bytes / (1024 * 1024 * 1024)).toFixed(4) : "—";
    return [
      {
        label: "TotalTokensPerRequest",
        expr: "avgInputTokens + avgOutputTokens",
        value: val(derived.totalTokensPerRequest),
      },
      {
        label: "TokenRate",
        expr: "reqPerSec × TotalTokensPerRequest",
        value: val(derived.tokenRate) + " tokens/s",
      },
      {
        label: "GPUs_by_Throughput",
        expr: "TokenRate ÷ (tokensPerSecPerGPU × target_gpu_utilization)",
        value: val(derived.gpusByThroughput),
      },
      {
        label: "GPUs_by_Concurrency",
        expr: "peakConcurrentSessions ÷ sessionsPerGPU",
        value: val(derived.gpusByConcurrency),
      },
      {
        label: "GPUs_Base",
        expr: "max(GPUs_by_Throughput, GPUs_by_Concurrency)",
        value: val(derived.gpusBase),
      },
      {
        label: "GPUs_Final",
        expr: "GPUs_Base × redundancyFactor",
        value: val(derived.gpusFinal),
      },
      {
        label: "KV_per_Session",
        expr: "avgContextTokens × kvBytesPerToken",
        value: gb(derived.kvBytesPerSession) + " GB",
      },
      {
        label: "KV_Total_Peak",
        expr: "peakConcurrentSessions × KV_per_Session",
        value: gb(derived.totalKvBytesPeak) + " GB",
      },
      {
        label: "KV_Budget_per_GPU",
        expr: "gpuMemoryGB × kvUtilizationBudget",
        value: (gpuMemoryGB * kvUtilizationBudget).toFixed(3) + " GB",
      },
      {
        label: "GPUs_by_KV (sanity)",
        expr: "KV_Total_Peak ÷ KV_Budget_per_GPU",
        value: val(derived.gpusByKv),
      },
      {
        label: "Peak_Egress_Gbps (rough)",
        expr: "(reqPerSec × avgResponseKb × 8) ÷ 1024 ÷ 1000",
        value: val(derived.egressGbps),
      },
    ];
  }, [derived, gpuMemoryGB, kvUtilizationBudget]);

  const kvConstraintWarning = useMemo(() => {
    // If KV-based GPUs exceeds final GPUs by a meaningful margin, flag it.
    if (!Number.isFinite(derived.gpusByKv) || !Number.isFinite(derived.gpusFinal)) return null;
    if (derived.gpusByKv <= derived.gpusFinal * 1.05) return null;
    return (
      <Hint>
        KV cache looks like the limiting factor: GPUs_by_KV ({fmtNum(derived.gpusByKv, 2)}) is
        greater than GPUs_Final ({fmtNum(derived.gpusFinal, 2)}). Consider reducing{" "}
        <Pill>avgContextTokens</Pill>, using a smaller model, enabling KV cache optimizations, or
        lowering <Pill>peakConcurrentSessions</Pill> / raising <Pill>gpuMemoryGB</Pill>.
      </Hint>
    );
  }, [derived.gpusByKv, derived.gpusFinal]);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.hTitle}>LLM Services – Methodology</div>
          <div style={styles.hSubtitle}>
            Transparent conversion from API usage into <Pill>GPU capacity</Pill> using two constraints:
            <Pill> token throughput</Pill> and <Pill>peak concurrency</Pill>, plus an optional{" "}
            <Pill>KV cache</Pill> sanity check.
          </div>
        </div>
        <Toggle value={showPlayground} onChange={setShowPlayground} label="Show playground" />
      </div>

      <div style={styles.grid}>
        <Card
          title="A) What is being sized?"
          subtitle="LLM services are capacity-planned like a streaming compute service"
          right={<Pill>Scope</Pill>}
        >
          <ul style={styles.ul}>
            <li>
              <b>Throughput constraint</b>: tokens/sec demand divided by tokens/sec per GPU (with utilization).
            </li>
            <li>
              <b>Concurrency constraint</b>: peak concurrent sessions divided by sessions per GPU.
            </li>
            <li>
              <b>Memory sanity check</b>: KV cache budget vs peak sessions × context size (approx).
            </li>
            <li>
              <b>Network</b>: response size × requests/sec (rough egress planning).
            </li>
          </ul>
          <Small>
            In your production app, <Pill>tokensPerSecPerGPU</Pill> and <Pill>sessionsPerGPU</Pill>{" "}
            should be derived from your benchmark table (chip + precision + stack + model).
          </Small>
        </Card>

        <VariablesCard
          rows={[
            { name: "reqPerSec", unit: "requests/sec", meaning: "Incoming request rate at peak or design point" },
            { name: "avgInputTokens", unit: "tokens/request", meaning: "Average prompt/input tokens per request" },
            { name: "avgOutputTokens", unit: "tokens/request", meaning: "Average generated/output tokens per request" },
            { name: "peakConcurrentSessions", unit: "sessions", meaning: "Peak active in-flight sessions needing GPU memory/compute" },
            { name: "tokensPerSecPerGPU", unit: "tokens/sec/GPU", meaning: "Effective sustained token throughput per GPU (after batching/overheads)" },
            { name: "sessionsPerGPU", unit: "sessions/GPU", meaning: "Packing limit for concurrency per GPU (latency/SLA + memory)" },
            { name: "target_gpu_utilization", unit: "0–1", meaning: "Planned usable utilization (headroom included)" },
            { name: "redundancyFactor", unit: "multiplier", meaning: "Extra headroom for N+1 / failures / maintenance windows" },
            { name: "avgContextTokens", unit: "tokens/session", meaning: "Average context length kept in KV cache (approx)" },
            { name: "kvBytesPerToken", unit: "bytes/token", meaning: "Approx KV cache bytes per token (depends on model/precision); used for sanity check" },
            { name: "gpuMemoryGB", unit: "GB/GPU", meaning: "GPU memory available on chosen accelerator" },
            { name: "kvUtilizationBudget", unit: "0–1", meaning: "Fraction of GPU memory reserved for KV cache (rest for weights, activations, overhead)" },
            { name: "avgResponseKb", unit: "KB/response", meaning: "Average response payload size for rough egress planning" },
          ]}
        />

        <Card title="B) Token demand" subtitle="Requests/sec × tokens/request" right={<Pill>Demand</Pill>}>
          <Eq>{`TotalTokensPerRequest =
  avgInputTokens + avgOutputTokens

TokenRate (tokens/sec) =
  reqPerSec × TotalTokensPerRequest`}</Eq>
        </Card>

        <Card title="C) GPUs by throughput" subtitle="Demand ÷ (supply × utilization)" right={<Pill>Compute</Pill>}>
          <Eq>{`GPUs_by_Throughput =
  TokenRate / (tokensPerSecPerGPU × target_gpu_utilization)`}</Eq>
          <Hint>
            <b>tokensPerSecPerGPU</b> should match your serving stack + model + precision. Utilization
            accounts for headroom and real scheduling overhead.
          </Hint>
        </Card>

        <Card title="D) GPUs by concurrency" subtitle="Peak sessions ÷ sessions per GPU" right={<Pill>Concurrency</Pill>}>
          <Eq>{`GPUs_by_Concurrency =
  peakConcurrentSessions / sessionsPerGPU`}</Eq>
          <Small>
            This constraint captures latency/SLA pressure and memory/queue limits. Even if token
            throughput looks fine, concurrency may force more GPUs.
          </Small>
        </Card>

        <Card title="E) Base GPUs + redundancy" subtitle="Take max constraint, then apply N+1/headroom" right={<Pill>Capacity</Pill>}>
          <Eq>{`GPUs_Base =
  max(GPUs_by_Throughput, GPUs_by_Concurrency)

GPUs_Final =
  GPUs_Base × redundancyFactor`}</Eq>
        </Card>

        <Card title="F) KV cache sanity check (approx)" subtitle="Peak KV bytes vs KV budget per GPU" right={<Pill>Memory</Pill>}>
          <Eq>{`KV_per_Session_Bytes =
  avgContextTokens × kvBytesPerToken

KV_Total_Peak_Bytes =
  peakConcurrentSessions × KV_per_Session_Bytes

KV_Budget_Bytes_per_GPU =
  gpuMemoryGB × (1024^3) × kvUtilizationBudget

GPUs_by_KV (sanity) =
  KV_Total_Peak_Bytes / KV_Budget_Bytes_per_GPU`}</Eq>
          <Small>
            This is intentionally a <b>sanity check</b> (KV bytes/token is model-dependent). Use it to
            detect when long contexts + high concurrency make memory the real limiter.
          </Small>
          {kvConstraintWarning}
        </Card>

        <Card title="G) Optional network egress (rough)" subtitle="KB/response × req/s" right={<Pill>Network</Pill>}>
          <Eq>{`Peak_Egress_Gbps (rough) =
  (reqPerSec × avgResponseKb × 8) / 1024 / 1000`}</Eq>
        </Card>

        <TraceTable steps={traceSteps} />

        {showPlayground ? (
          <Card
            title="Quick-check playground"
            subtitle="Adjust values to match your benchmark table and validate outputs"
            right={<Pill>Audit</Pill>}
          >
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              <button type="button" style={styles.presetBtn} onClick={() => applyPreset("chat")}>
                Load preset: Chat
              </button>
              <button type="button" style={styles.presetBtn} onClick={() => applyPreset("completion")}>
                Load preset: Completion
              </button>
              <button type="button" style={styles.presetBtn} onClick={() => applyPreset("embeddings")}>
                Load preset: Embeddings
              </button>
              <span style={styles.presetNote}>
                Presets are illustrative only — replace with your measured values.
              </span>
            </div>

            <div style={styles.formGrid}>
              <Select
                label="serviceKind (label only)"
                value={serviceKind}
                onChange={(v) => applyPreset(v)}
                options={[
                  { label: "Chat", value: "chat" },
                  { label: "Completion", value: "completion" },
                  { label: "Embeddings", value: "embeddings" },
                ]}
              />

              <Field label="reqPerSec" value={reqPerSec} onChange={(v) => setReqPerSec(clamp(v, 0, 1e9))} step="1" min={0} />
              <Field label="peakConcurrentSessions" value={peakConcurrentSessions} onChange={(v) => setPeakConcurrentSessions(clamp(v, 0, 1e9))} step="1" min={0} />

              <Field label="avgInputTokens" value={avgInputTokens} onChange={(v) => setAvgInputTokens(clamp(v, 0, 1e9))} step="10" min={0} />
              <Field label="avgOutputTokens" value={avgOutputTokens} onChange={(v) => setAvgOutputTokens(clamp(v, 0, 1e9))} step="10" min={0} />
              <div style={styles.formField} />

              <Field label="tokensPerSecPerGPU" value={tokensPerSecPerGPU} onChange={(v) => setTokensPerSecPerGPU(clamp(v, 0, 1e9))} step="10" min={0} />
              <Field label="sessionsPerGPU" value={sessionsPerGPU} onChange={(v) => setSessionsPerGPU(clamp(v, 1, 1e9))} step="1" min={1} />
              <Field
                label="target_gpu_utilization"
                value={targetGpuUtil}
                onChange={(v) => setTargetGpuUtil(clamp(v, 0.05, 0.95))}
                step="0.05"
                min={0.05}
                max={0.95}
              />

              <Field
                label="redundancyFactor"
                value={redundancyFactor}
                onChange={(v) => setRedundancyFactor(clamp(v, 1.0, 2.0))}
                step="0.05"
                min={1.0}
                max={2.0}
              />
              <div style={styles.formField} />
              <div style={styles.formField} />

              <Field label="avgContextTokens" value={avgContextTokens} onChange={(v) => setAvgContextTokens(clamp(v, 0, 1e9))} step="256" min={0} />
              <Field label="kvBytesPerToken" value={kvBytesPerToken} onChange={(v) => setKvBytesPerToken(clamp(v, 0, 1e6))} step="1" min={0} />
              <Field label="gpuMemoryGB" value={gpuMemoryGB} onChange={(v) => setGpuMemoryGB(clamp(v, 0, 2048))} step="1" min={0} />

              <Field
                label="kvUtilizationBudget"
                value={kvUtilizationBudget}
                onChange={(v) => setKvUtilizationBudget(clamp(v, 0.05, 0.95))}
                step="0.05"
                min={0.05}
                max={0.95}
              />
              <Field label="avgResponseKb" value={avgResponseKb} onChange={(v) => setAvgResponseKb(clamp(v, 0, 1e9))} step="1" min={0} />
              <div style={styles.formField} />
            </div>

            <Divider />

            <div style={styles.kpiGrid}>
              <Kpi
                label="Token rate (tokens/sec)"
                value={fmtNum(derived.tokenRate, 2)}
                sub={`${reqPerSec} rps × ${derived.totalTokensPerRequest.toFixed(0)} tok/req`}
              />
              <Kpi
                label="GPUs by throughput"
                value={fmtNum(derived.gpusByThroughput, 2)}
                sub={`÷ (${tokensPerSecPerGPU} × ${targetGpuUtil})`}
              />
              <Kpi
                label="GPUs by concurrency"
                value={fmtNum(derived.gpusByConcurrency, 2)}
                sub={`${peakConcurrentSessions} ÷ ${sessionsPerGPU}`}
              />

              <Kpi
                label="Final GPUs (with redundancy)"
                value={fmtNum(derived.gpusFinal, 2)}
                sub={`max × ${redundancyFactor}`}
              />
              <Kpi
                label="GPUs by KV (sanity)"
                value={fmtNum(derived.gpusByKv, 2)}
                sub={`${(gpuMemoryGB * kvUtilizationBudget).toFixed(1)} GB KV budget/GPU`}
              />
              <Kpi
                label="Peak egress (Gbps)"
                value={fmtNum(derived.egressGbps, 4)}
                sub={`${fmtNum(derived.egressMbps, 2)} Mbps`}
              />
            </div>

            <Hint>
              Output policy (rounding, minimum cluster size, multi-AZ replication) should be stated in
              the calculator output section; this page is the auditable math and named factors.
            </Hint>
          </Card>
        ) : null}

        <Card title="Common reviewer questions" subtitle="What to document if asked" right={<Pill>Notes</Pill>}>
          <ul style={styles.ul}>
            <li>
              <b>Benchmark provenance</b>: where do tokens/sec/GPU and sessions/GPU come from (chip/stack/model/precision)?
            </li>
            <li>
              <b>Latency target</b>: is sessions/GPU derived from p95 latency requirements and max batch size?
            </li>
            <li>
              <b>Context length</b>: is avgContextTokens based on telemetry or policy (max context)?
            </li>
            <li>
              <b>Utilization</b>: what overheads are included (KV paging, routing, retries, failover)?
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100%",
    padding: 18,
    background: "linear-gradient(180deg, rgba(11,13,16,1) 0%, rgba(15,18,23,1) 100%)",
    color: "rgba(255,255,255,0.92)",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
  },
  header: {
    display: "flex",
    gap: 14,
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
    flexWrap: "wrap",
  },
  hTitle: {
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: 0.2,
  },
  hSubtitle: {
    marginTop: 6,
    maxWidth: 980,
    color: "rgba(255,255,255,0.72)",
    lineHeight: 1.35,
    fontSize: 13,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 12,
  },
  card: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 14,
    boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
    overflow: "hidden",
  },
  cardHeader: {
    padding: "12px 14px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: 0.2,
  },
  cardSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
    lineHeight: 1.3,
  },
  cardRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  cardBody: {
    padding: 14,
  },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 8px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.18)",
    fontSize: 11,
    color: "rgba(255,255,255,0.82)",
    whiteSpace: "nowrap",
  },
  ul: {
    margin: 0,
    paddingLeft: 18,
    color: "rgba(255,255,255,0.82)",
    lineHeight: 1.45,
    fontSize: 13,
  },
  divider: {
    height: 1,
    background: "rgba(255,255,255,0.10)",
    margin: "12px 0",
  },
  eq: {
    margin: "0 0 10px 0",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.28)",
    overflowX: "auto",
  },
  code: {
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace',
    fontSize: 12.5,
    color: "rgba(255,255,255,0.88)",
    lineHeight: 1.35,
  },
  hint: {
    marginTop: 10,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(120,200,255,0.22)",
    background: "rgba(70,130,200,0.10)",
    color: "rgba(255,255,255,0.78)",
    fontSize: 12.5,
    lineHeight: 1.35,
  },
  small: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 12.5,
    lineHeight: 1.35,
  },
  toggleWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    userSelect: "none",
  },
  toggleLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    whiteSpace: "nowrap",
  },
  toggleBtn: {
    width: 44,
    height: 24,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    position: "relative",
    cursor: "pointer",
    padding: 2,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 999,
    background: "rgba(255,255,255,0.88)",
    display: "block",
    transition: "transform 160ms ease",
  },
  toggleOn: {
    background: "rgba(70,130,200,0.22)",
    border: "1px solid rgba(120,200,255,0.28)",
  },
  toggleOff: {
    background: "rgba(0,0,0,0.25)",
  },

  presetBtn: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.20)",
    color: "rgba(255,255,255,0.86)",
    cursor: "pointer",
    fontSize: 12.5,
  },
  presetNote: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 12,
    alignSelf: "center",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
  },
  formField: {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 10,
    minWidth: 0,
  },
  label: {
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
    marginBottom: 8,
  },
  input: {
    width: "100%",
    padding: "9px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.25)",
    color: "rgba(255,255,255,0.92)",
    outline: "none",
    fontSize: 13,
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: "9px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.25)",
    color: "rgba(255,255,255,0.92)",
    outline: "none",
    fontSize: 13,
    boxSizing: "border-box",
  },

  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
  },
  kpi: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    minWidth: 0,
  },
  kpiLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.62)",
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: 0.2,
  },
  kpiSub: {
    marginTop: 6,
    fontSize: 11.5,
    color: "rgba(255,255,255,0.62)",
    lineHeight: 1.25,
  },

  // Tables (Variables + Trace)
  tableWrap: {
    overflowX: "auto",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.18)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 720,
  },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    fontSize: 11,
    color: "rgba(255,255,255,0.70)",
    borderBottom: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "10px 12px",
    fontSize: 12.5,
    color: "rgba(255,255,255,0.82)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    verticalAlign: "top",
  },
  tdMono: {
    padding: "10px 12px",
    fontSize: 12.2,
    color: "rgba(255,255,255,0.86)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    verticalAlign: "top",
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace',
    whiteSpace: "nowrap",
  },
};